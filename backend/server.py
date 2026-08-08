from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict, Annotated
import uuid
from datetime import datetime, timezone
import httpx

# Auth: JWT + RBAC + audit stamping. Imported early so the auth router can be
# registered on api_router alongside the existing endpoints.
from auth import (  # noqa: E402
    Role,
    UserPublic,
    TokenResponse,
    LoginPayload,
    RegisterPayload,
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    user_public,
    get_current_user,
    optional_current_user,
    require_roles,
    audit_stamp,
)
from lalamove import router as lalamove_router  # noqa: E402
from bson import ObjectId
from jwt.exceptions import InvalidTokenError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Remote backend the Expo mobile app actually talks to. The FastAPI service
# here is only a light-weight proxy so the deployment context matches the
# `/api/*` contract expected by the mobile client. All business logic lives
# on the remote host. The URL MUST come from environment configuration.
REMOTE_BACKEND_URL = os.environ.get("REMOTE_BACKEND_URL", "").rstrip("/")

# Optional shared secret for Wingman requests. When set, every /api/wingman/*
# request must include `X-Wingman-Key: <value>` or a matching bearer token.
# Left blank in dev/preview environments to keep the demo frictionless.
WINGMAN_API_KEY = os.environ.get("WINGMAN_API_KEY", "").strip()

# Create the main app without a prefix
app = FastAPI()

# Expose db and JWT metadata on app.state so auth dependencies can reach them
# without a circular import.
app.state.db = db

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Audit middleware — decodes the bearer token (if any) and stashes the actor
# username/role/id on request.state so every write can stamp created_by /
# modified_by / entry_source without every endpoint doing it manually.
# ---------------------------------------------------------------------------
@app.middleware("http")
async def audit_actor_middleware(request: Request, call_next):
    request.state.audit_user_id = None
    request.state.audit_username = None
    request.state.audit_role = None
    request.state.audit_source = request.headers.get("x-entry-source", "manual")

    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        try:
            payload = decode_token(auth_header[7:])
            uid = payload.get("sub")
            if uid:
                try:
                    user_doc = await db.users.find_one({"_id": ObjectId(uid)})
                except Exception:
                    user_doc = None
                if user_doc and not user_doc.get("disabled", False):
                    request.state.audit_user_id = str(user_doc["_id"])
                    request.state.audit_username = user_doc.get("username")
                    request.state.audit_role = user_doc.get("role")
        except InvalidTokenError:
            pass
    return await call_next(request)


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# --------------------------------------------------------------------------
# AUTH — JWT login + user management. All app screens gate on a token stored
# in expo-secure-store. RBAC: Admin, Staff, Carrier.
# --------------------------------------------------------------------------
@api_router.post("/auth/login", response_model=TokenResponse)
async def auth_login(payload: LoginPayload):
    username = (payload.username or "").strip().lower()
    user = await db.users.find_one({"username": username})
    # Always run bcrypt to keep the response time constant (no user-enum leak).
    stored_hash = user["password_hash"] if user else hash_password("dummy-timing")
    if not user or not verify_password(payload.password, stored_hash) or user.get("disabled", False):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token(str(user["_id"]))
    return TokenResponse(access_token=token, user=user_public(user))


@api_router.get("/auth/me", response_model=UserPublic)
async def auth_me(user: Annotated[dict, Depends(get_current_user)]):
    return user_public(user)


@api_router.post("/auth/register", response_model=UserPublic)
async def auth_register(
    payload: RegisterPayload,
    admin: Annotated[dict, Depends(require_roles(Role.ADMIN))],
):
    """Admin-only: create a new Staff / Carrier / Admin account."""
    username = payload.username.strip().lower()
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=409, detail="Username already exists")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "username": username,
        "password_hash": hash_password(payload.password),
        "display_name": payload.display_name.strip(),
        "role": payload.role.value,
        "honorific": payload.honorific or "Sir",
        "disabled": False,
        "created_at": now,
        "modified_at": now,
        "created_by": admin.get("username", "system"),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return user_public(doc)


@api_router.get("/auth/users", response_model=List[UserPublic])
async def auth_list_users(admin: Annotated[dict, Depends(require_roles(Role.ADMIN))]):
    docs = await db.users.find().sort("username", 1).to_list(500)
    return [user_public(d) for d in docs]


@api_router.patch("/auth/users/{user_id}")
async def auth_update_user(
    user_id: str,
    patch: Dict[str, Any],
    admin: Annotated[dict, Depends(require_roles(Role.ADMIN))],
):
    """Admin-only: update display_name, role, honorific, disabled, or password."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    allowed = {"display_name", "role", "honorific", "disabled"}
    updates: Dict[str, Any] = {k: v for k, v in patch.items() if k in allowed}
    # Validate role against the enum so a client cannot smuggle in a bad
    # value that would then be silently accepted by Mongo.
    if "role" in updates:
        try:
            updates["role"] = Role(updates["role"]).value
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role — must be one of {[r.value for r in Role]}",
            )
    if "password" in patch and patch["password"]:
        updates["password_hash"] = hash_password(str(patch["password"]))
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    updates["modified_at"] = datetime.now(timezone.utc).isoformat()
    updates["modified_by"] = admin.get("username", "system")
    res = await db.users.update_one({"_id": oid}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@api_router.delete("/auth/users/{user_id}")
async def auth_delete_user(
    user_id: str,
    admin: Annotated[dict, Depends(require_roles(Role.ADMIN))],
):
    if str(admin.get("_id")) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    res = await db.users.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@api_router.post("/auth/change-password")
async def auth_change_password(
    payload: Dict[str, Any],
    user: Annotated[dict, Depends(get_current_user)],
):
    current = str(payload.get("current_password") or "")
    new_pw = str(payload.get("new_password") or "")
    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 chars")
    if not verify_password(current, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": hash_password(new_pw),
                  "modified_at": datetime.now(timezone.utc).isoformat(),
                  "modified_by": user.get("username")}},
    )
    return {"ok": True}


# --------------------------------------------------------------------------
# Bullion module — MongoDB-backed. The Expo app currently uses AsyncStorage
# for offline speed, but Wingman needs a stable REST surface to write into
# on behalf of the operator. Both sides can converge on these endpoints
# later without a data migration.
# --------------------------------------------------------------------------

def _clean_mongo_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Strip Mongo's internal `_id` and any singleton marker from responses."""
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("_singleton", None)
    return doc


class BullionTrip(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    route: Optional[str] = None              # "IN_TO_TH" | "TH_TO_IN"
    origin: Optional[str] = None
    destination: Optional[str] = None
    available_weight_kg: float = 0.0
    available_slots: Optional[float] = None  # legacy
    carrier_party_id: Optional[str] = None
    carrier_name: Optional[str] = None
    airline_code: Optional[str] = None
    airline: Optional[str] = None
    flight_number: Optional[str] = None
    status: str = "planned"                  # planned / in_transit / completed / cancelled
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Allow the richer frontend schema to pass through without loss.
    class Config:
        extra = "allow"


class BullionTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    txn_no: Optional[str] = None
    trip_id: Optional[str] = None
    type: str                                # "currency" | "gold"
    status: str = "open"                     # open / in_transit / completed
    weight_kg: Optional[float] = 0.0
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Ledger sync
    ledger_entry_id: Optional[str] = None
    ledger_posted_at: Optional[str] = None

    # Currency carry
    currency: Optional[str] = None
    currency_amount: Optional[float] = None
    purchase_rate_inr: Optional[float] = None
    exchange_rate_thb: Optional[float] = None
    transfer_rate_inr_per_thb: Optional[float] = None

    # Gold carry
    gold_amount: Optional[float] = None
    gold_unit: Optional[str] = None          # "baht" | "grams"
    gold_purchase_thb: Optional[float] = None
    gold_cost_inr: Optional[float] = None
    gold_sale_inr: Optional[float] = None

    class Config:
        extra = "allow"


class BullionRates(BaseModel):
    currency_rate_per_1000: float = 500.0
    gold_rate_per_baht: float = 2500.0
    hand_carry_rate_inr_per_kg: float = 200.0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api_router.get("/bullion/trips")
async def bullion_list_trips():
    docs = await db.bullion_trips.find().sort("date", -1).to_list(500)
    return [_clean_mongo_id(d) for d in docs]


@api_router.post("/bullion/trips")
async def bullion_create_trip(trip: BullionTrip, request: Request):
    # Pydantic v1: use .dict() so `extra="allow"` fields are preserved.
    doc = trip.dict()
    # If the client sent the older `available_slots` but not `available_weight_kg`,
    # mirror the value so downstream aggregations keep working.
    if not doc.get("available_weight_kg") and doc.get("available_slots"):
        doc["available_weight_kg"] = float(doc["available_slots"])
    doc.update(audit_stamp(request, creating=True, source=request.state.audit_source))
    await db.bullion_trips.insert_one(doc.copy())
    return _clean_mongo_id(doc)


@api_router.put("/bullion/trips/{trip_id}")
async def bullion_update_trip(trip_id: str, patch: Dict[str, Any], request: Request):
    patch.pop("id", None)
    patch.update(audit_stamp(request, creating=False))
    res = await db.bullion_trips.update_one({"id": trip_id}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    doc = await db.bullion_trips.find_one({"id": trip_id})
    return _clean_mongo_id(doc or {})


@api_router.delete("/bullion/trips/{trip_id}")
async def bullion_delete_trip(trip_id: str):
    res = await db.bullion_trips.delete_one({"id": trip_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"ok": True}


@api_router.get("/bullion/transactions")
async def bullion_list_txns():
    docs = await db.bullion_transactions.find().sort("created_at", -1).to_list(1000)
    return [_clean_mongo_id(d) for d in docs]


@api_router.post("/bullion/transactions")
async def bullion_create_txn(txn: BullionTransaction, request: Request):
    doc = txn.dict()
    # Auto-generate TXN-### if missing.
    if not doc.get("txn_no"):
        existing = await db.bullion_transactions.find({}, {"txn_no": 1}).to_list(5000)
        max_n = 0
        for e in existing:
            tn = str(e.get("txn_no") or "")
            if tn.startswith("TXN-"):
                try:
                    max_n = max(max_n, int(tn.split("-", 1)[1]))
                except (ValueError, IndexError):
                    pass
        doc["txn_no"] = f"TXN-{str(max_n + 1).zfill(3)}"
    # Initialise `remaining_weight_kg` for partial-split tracking. On create,
    # nothing is allocated yet so remaining == weight.
    if "remaining_weight_kg" not in doc or doc.get("remaining_weight_kg") is None:
        doc["remaining_weight_kg"] = float(doc.get("weight_kg") or 0)
    doc.update(audit_stamp(request, creating=True, source=request.state.audit_source))
    await db.bullion_transactions.insert_one(doc.copy())
    return _clean_mongo_id(doc)


@api_router.put("/bullion/transactions/{txn_id}")
async def bullion_update_txn(txn_id: str, patch: Dict[str, Any], request: Request):
    patch.pop("id", None)
    patch.update(audit_stamp(request, creating=False))
    res = await db.bullion_transactions.update_one({"id": txn_id}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    doc = await db.bullion_transactions.find_one({"id": txn_id})
    return _clean_mongo_id(doc or {})


@api_router.delete("/bullion/transactions/{txn_id}")
async def bullion_delete_txn(txn_id: str):
    res = await db.bullion_transactions.delete_one({"id": txn_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"ok": True}


class BullionSplitPayload(BaseModel):
    split_weight_kg: float
    trip_id: Optional[str] = None
    notes: Optional[str] = None


@api_router.post("/bullion/transactions/{txn_id}/split")
async def bullion_split_txn(txn_id: str, payload: BullionSplitPayload, request: Request):
    """Split a parent bullion transaction — carve off `split_weight_kg` into
    a NEW child transaction (linked via `parent_id`) and reduce the parent's
    `remaining_weight_kg`.

    The parent retains its full historical rate snapshot (immutable audit
    trail). The child inherits the parent's rate snapshot and metadata, and
    is tagged with `trip_id` so the asset-map / trip aggregation picks it up.

    Rules:
    - `split_weight_kg` must be > 0 and ≤ current remaining.
    - A parent with `remaining_weight_kg == 0` is fully allocated and
      further splits are rejected.
    """
    parent = await db.bullion_transactions.find_one({"id": txn_id})
    if not parent:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if parent.get("parent_id"):
        raise HTTPException(status_code=400, detail="Cannot split a child transaction; split the parent")

    original_weight = float(parent.get("weight_kg") or 0)
    remaining = float(parent.get("remaining_weight_kg", original_weight))
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Transaction is fully allocated already")
    split = float(payload.split_weight_kg)
    if split <= 0 or split > remaining + 1e-9:
        raise HTTPException(
            status_code=400,
            detail=f"Split weight must be between 0 and remaining ({remaining})",
        )

    # Verify the trip exists (soft check — allow None for unassigned splits).
    trip_doc = None
    if payload.trip_id:
        trip_doc = await db.bullion_trips.find_one({"id": payload.trip_id})
        if not trip_doc:
            raise HTTPException(status_code=404, detail="Trip not found")

    # Auto-generate a child txn_no from the parent's txn_no.
    parent_txn_no = str(parent.get("txn_no") or "").strip()
    existing_children = await db.bullion_transactions.count_documents({"parent_id": txn_id})
    child_suffix = chr(ord("a") + existing_children)  # a, b, c…
    child_txn_no = f"{parent_txn_no}-{child_suffix}" if parent_txn_no else None

    child_doc = {
        **{k: v for k, v in parent.items() if k not in ("_id", "id", "txn_no", "remaining_weight_kg", "splits")},
        "id": str(uuid.uuid4()),
        "parent_id": txn_id,
        "trip_id": payload.trip_id,
        "weight_kg": split,
        "remaining_weight_kg": split,  # a child is fully allocated to itself
        "txn_no": child_txn_no,
        "notes": (payload.notes or parent.get("notes") or ""),
    }
    child_doc.update(audit_stamp(request, creating=True, source=request.state.audit_source))
    await db.bullion_transactions.insert_one(child_doc.copy())

    # Update parent's remaining + split log.
    new_remaining = round(remaining - split, 6)
    split_entry = {
        "child_id": child_doc["id"],
        "child_txn_no": child_txn_no,
        "weight_kg": split,
        "trip_id": payload.trip_id,
        "at": datetime.now(timezone.utc).isoformat(),
        "by": getattr(request.state, "audit_username", None) or "system",
    }
    parent_updates = {
        "remaining_weight_kg": new_remaining,
        "modified_at": datetime.now(timezone.utc).isoformat(),
        "modified_by": getattr(request.state, "audit_username", None) or "system",
    }
    await db.bullion_transactions.update_one(
        {"id": txn_id},
        {"$set": parent_updates, "$push": {"splits": split_entry}},
    )

    fresh_parent = await db.bullion_transactions.find_one({"id": txn_id})
    return {
        "parent": _clean_mongo_id(fresh_parent or {}),
        "child": _clean_mongo_id(child_doc),
    }


@api_router.get("/bullion/rates")
async def bullion_get_rates():
    doc = await db.bullion_rates.find_one({"_singleton": True})
    if not doc:
        default = BullionRates().dict()
        default["_singleton"] = True
        await db.bullion_rates.insert_one(default.copy())
        return _clean_mongo_id(default)
    return _clean_mongo_id(doc)


@api_router.put("/bullion/rates")
async def bullion_put_rates(patch: Dict[str, Any]):
    patch = {k: v for k, v in patch.items() if k != "_singleton"}
    # Snapshot the current rate row before we mutate it so the change log
    # captures what actually changed and when. Empty history when this is
    # the first call.
    prev = await db.bullion_rates.find_one({"_singleton": True}) or {}
    prev_snap = _clean_mongo_id(dict(prev))
    now = datetime.now(timezone.utc).isoformat()
    patch["updated_at"] = now
    await db.bullion_rates.update_one(
        {"_singleton": True}, {"$set": patch, "$setOnInsert": {"_singleton": True}}, upsert=True,
    )
    doc = await db.bullion_rates.find_one({"_singleton": True})
    new_snap = _clean_mongo_id(dict(doc or {}))

    # Detect real changes (skip metadata like updated_at) so we don't fill
    # the history with no-op writes.
    tracked_keys = [
        "currency_rate_per_1000",
        "gold_rate_per_baht",
        "hand_carry_rate_inr_per_kg",
    ]
    diffs: Dict[str, Any] = {}
    for k in tracked_keys:
        old = prev_snap.get(k)
        new = new_snap.get(k)
        if old != new:
            diffs[k] = {"from": old, "to": new}

    if diffs:
        entry = {
            "id": str(uuid.uuid4()),
            "timestamp": now,
            "changed_by": patch.get("changed_by") or "operator",
            "source": patch.get("source") or "app",  # app | wingman | api
            "prev": {k: prev_snap.get(k) for k in tracked_keys},
            "next": {k: new_snap.get(k) for k in tracked_keys},
            "diffs": diffs,
        }
        await db.bullion_rate_history.insert_one(entry.copy())

    return _clean_mongo_id(doc or {})


@api_router.get("/bullion/rates/history")
async def bullion_rate_history(limit: int = 50):
    """Return the most recent rate changes, newest first."""
    docs = await db.bullion_rate_history.find().sort("timestamp", -1).to_list(
        min(max(limit, 1), 500)
    )
    return [_clean_mongo_id(d) for d in docs]


# --------------------------------------------------------------------------
# Wingman gateway — a thin, opinionated surface for the AI assistant to
# post updates from natural-language carrier chatter (WhatsApp, SMS, email).
# Each endpoint validates the payload, looks up the target record by a
# human-friendly key (consignment_no / bag_no / party name), and forwards
# to the appropriate business API. Every action is also logged to Mongo
# so the operator can audit what Wingman did on their behalf.
# --------------------------------------------------------------------------

def _require_wingman_key(request: Request):
    if not WINGMAN_API_KEY:
        return  # unauthenticated mode for dev/preview
    provided = (
        request.headers.get("x-wingman-key")
        or request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    )
    if provided != WINGMAN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing Wingman key")


async def _remote_get(path: str, params: Dict[str, Any] | None = None) -> Any:
    if not REMOTE_BACKEND_URL or _proxy_client is None:
        raise HTTPException(status_code=503, detail="Remote backend not configured")
    r = await _proxy_client.get(f"{REMOTE_BACKEND_URL}/api/{path}", params=params or {})
    r.raise_for_status()
    return r.json()


async def _remote_json(method: str, path: str, body: Any = None) -> Any:
    if not REMOTE_BACKEND_URL or _proxy_client is None:
        raise HTTPException(status_code=503, detail="Remote backend not configured")
    r = await _proxy_client.request(
        method, f"{REMOTE_BACKEND_URL}/api/{path}", json=body,
    )
    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json() if r.text else {}


async def _log_wingman(action: str, payload: Any, result: Any = None) -> None:
    try:
        await db.wingman_activity.insert_one({
            "id": str(uuid.uuid4()),
            "action": action,
            "payload": payload,
            "result": result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:  # pragma: no cover - logging must never break the request
        logger.exception("Failed to log wingman activity for %s", action)


class CarrierUpdate(BaseModel):
    """Carrier-side update on a shipment.

    Consignment_no identifies the shipment; every other field is optional.
    Set only the fields the carrier actually reported so partial updates
    stay safe. `status` accepts the app's canonical values:
        pending | in_transit | warehouse_arrived | delivered | cancelled
    """
    consignment_no: str
    status: Optional[str] = None
    notes: Optional[str] = None
    dispatch_date: Optional[str] = None
    delivered_at: Optional[str] = None
    flight_number: Optional[str] = None
    tracking_url: Optional[str] = None


@api_router.post("/wingman/carrier-update")
async def wingman_carrier_update(payload: CarrierUpdate, request: Request):
    _require_wingman_key(request)
    all_shipments = await _remote_get("shipments")
    match = next(
        (s for s in all_shipments if s.get("consignment_no") == payload.consignment_no),
        None,
    )
    if not match:
        raise HTTPException(status_code=404, detail=f"No shipment for consignment {payload.consignment_no}")

    patch: Dict[str, Any] = {k: v for k, v in payload.dict().items()
                             if k != "consignment_no" and v is not None}
    if "notes" in patch:
        # Append (don't overwrite) so operator context isn't lost.
        existing = match.get("notes") or ""
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        patch["notes"] = (existing + "\n" if existing else "") + f"[Wingman {stamp}] {patch['notes']}"

    # Bake in the required shipment fields alongside the patch. The remote
    # backend expects a full record on PUT.
    merged = {**match, **patch}
    merged.pop("created_at", None)
    result = await _remote_json("PUT", f"shipments/{match['id']}", merged)
    await _log_wingman("carrier-update", payload.dict(), {"shipment_id": match.get("id"), "status": patch.get("status")})
    return {"ok": True, "shipment": result, "applied": patch}


class BagStatus(BaseModel):
    consignment_no: str
    bag_no: str
    weight_kg: Optional[float] = None
    delivered: Optional[bool] = None
    notes: Optional[str] = None


@api_router.post("/wingman/bag-status")
async def wingman_bag_status(payload: BagStatus, request: Request):
    _require_wingman_key(request)
    all_shipments = await _remote_get("shipments")
    shipment = next(
        (s for s in all_shipments if s.get("consignment_no") == payload.consignment_no),
        None,
    )
    if not shipment:
        raise HTTPException(status_code=404, detail=f"No shipment for consignment {payload.consignment_no}")

    bags = await _remote_get(f"shipments/{shipment['id']}/bags")
    bag = next((b for b in bags if b.get("bag_no") == payload.bag_no), None)
    if not bag:
        raise HTTPException(status_code=404, detail=f"Bag {payload.bag_no} not found in {payload.consignment_no}")

    patch: Dict[str, Any] = {}
    if payload.weight_kg is not None:
        patch["weight_kg"] = payload.weight_kg
    if payload.notes:
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        existing = bag.get("notes") or ""
        patch["notes"] = (existing + "\n" if existing else "") + f"[Wingman {stamp}] {payload.notes}"
    if not patch:
        return {"ok": True, "noop": True}

    result = await _remote_json("PUT", f"bags/{bag['id']}", patch)
    await _log_wingman("bag-status", payload.dict(), {"bag_id": bag.get("id")})
    return {"ok": True, "bag": result}


class LedgerNote(BaseModel):
    party_name: str
    date: Optional[str] = None
    description: str
    debit: float = 0.0
    credit: float = 0.0
    currency: str = "INR"
    ref_type: Optional[str] = "wingman"


@api_router.post("/wingman/ledger-entry")
async def wingman_ledger_entry(payload: LedgerNote, request: Request):
    _require_wingman_key(request)
    parties = await _remote_get("parties")
    party = next(
        (p for p in parties if (p.get("name") or "").lower() == payload.party_name.lower()),
        None,
    )
    if not party:
        raise HTTPException(status_code=404, detail=f"Party '{payload.party_name}' not found")

    body = {
        "party_id": party["id"],
        "date": payload.date or datetime.now(timezone.utc).date().isoformat(),
        "description": payload.description,
        "debit": payload.debit,
        "credit": payload.credit,
        "currency": payload.currency,
        "ref_type": payload.ref_type or "wingman",
    }
    result = await _remote_json("POST", "ledger/entries", body)
    await _log_wingman("ledger-entry", payload.dict(), {"entry_id": result.get("id")})
    return {"ok": True, "entry": result}


class CatalogPatch(BaseModel):
    """Vision-driven catalog update. Any field left blank is preserved
    verbatim on the remote item record so multi-pass Wingman flows (photo
    now, tags later) don't clobber each other.
    """
    item_id: Optional[str] = None
    name: Optional[str] = None
    photo_url: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    supplier_party_name: Optional[str] = None
    selling_price: Optional[float] = None
    buying_price: Optional[float] = None
    unit: Optional[str] = None


@api_router.post("/wingman/catalog-item")
async def wingman_catalog_item(payload: CatalogPatch, request: Request):
    _require_wingman_key(request)
    all_items = await _remote_get("items")
    target = None
    if payload.item_id:
        target = next((i for i in all_items if i.get("id") == payload.item_id), None)
    elif payload.name:
        target = next((i for i in all_items if (i.get("name") or "").lower() == payload.name.lower()), None)

    patch: Dict[str, Any] = {k: v for k, v in payload.dict().items()
                             if v is not None and k not in {"item_id", "supplier_party_name"}}

    if payload.supplier_party_name:
        parties = await _remote_get("parties")
        supplier = next(
            (p for p in parties if (p.get("name") or "").lower() == payload.supplier_party_name.lower()
             and p.get("role") == "supplier"),
            None,
        )
        if supplier:
            patch["supplier_party_id"] = supplier["id"]

    if target:
        result = await _remote_json("PUT", f"items/{target['id']}", patch)
        await _log_wingman("catalog-update", payload.dict(), {"item_id": target["id"]})
        return {"ok": True, "item": result, "created": False}

    # Create — need at least a name to be useful.
    if not payload.name:
        raise HTTPException(status_code=400, detail="Cannot create item without a name")
    body = {"unit": payload.unit or "pcs", **patch, "name": payload.name}
    result = await _remote_json("POST", "items", body)
    await _log_wingman("catalog-create", payload.dict(), {"item_id": result.get("id")})
    return {"ok": True, "item": result, "created": True}


@api_router.get("/wingman/activity")
async def wingman_activity(request: Request, limit: int = 50):
    _require_wingman_key(request)
    docs = await db.wingman_activity.find().sort("created_at", -1).to_list(min(limit, 500))
    return [_clean_mongo_id(d) for d in docs]


@api_router.get("/wingman/health")
async def wingman_health():
    """Public heartbeat. Returns which capabilities are wired."""
    return {
        "ok": True,
        "auth_required": bool(WINGMAN_API_KEY),
        "remote_backend": bool(REMOTE_BACKEND_URL),
        "capabilities": [
            "POST /api/wingman/carrier-update",
            "POST /api/wingman/bag-status",
            "POST /api/wingman/ledger-entry",
            "POST /api/wingman/catalog-item",
            "GET  /api/wingman/activity",
        ],
    }


# Include the router in the main app
# ============================================================================
# ASSISTANT — Claude-powered chat + OpenAI voice pipeline
# ============================================================================
# Streams responses over SSE for a <2s conversational feel. Every interaction
# is persisted so the "Business Knowledge" memory can grow over time. The
# assistant is instructed to reply in native Hindi (Devanagari) by default
# and to emit structured JSON tool-calls that the client executes against
# the existing REST endpoints (Wingman surface).
from fastapi.responses import StreamingResponse
import asyncio

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# The Assistant's persona is hard-coded here so no client can weaken it.
# Rules Kishan Sir explicitly asked for:
#   1. Always address the operator as "Kishan Sir", "Sir", or "Boss". NEVER
#      by first name alone.
#   2. Polite / soft tone with customers (buyers, sellers).
#   3. Direct / no-nonsense tone with carriers.
#   4. Screen-aware — the client passes `screen_context` on every turn and
#      the assistant must open a fresh greeting with what the user is
#      currently looking at (e.g. "Sir, I see you are on Invoice INV-042 for
#      ABC Trader — ₹5.2L pending. Kya karna hai?").
#   5. Native Hindi (Devanagari) by default, code-switch to English for
#      technical fields / numbers is fine.
#   6. When the user asks for an action (e.g. "ललित के लिए बैग जोड़ो"), reply
#      with a small JSON tool-call block wrapped in ```json ... ``` followed
#      by a one-line spoken confirmation.
_ASSISTANT_SYSTEM_HI = """
आप श्री किशन सर के निजी लॉजिस्टिक्स सहायक हैं। यह एक भारतीय-थाई हैंड-कैरी बिज़नेस है।

अनिवार्य नियम:
1. ऑपरेटर को हमेशा "किशन सर", "सर", या "बॉस" कहकर संबोधित करें। कभी भी सिर्फ पहला नाम ("Kishan") अकेला मत बोलिए।
2. ग्राहकों / पार्टियों के साथ बात करते समय विनम्र और सम्मानजनक टोन। कैरियर से बात करते समय सीधी, नपी-तुली टोन।
3. जवाब शुद्ध हिंदी (देवनागरी) में दें — तकनीकी शब्द (invoice, bag, kg) रह सकते हैं।
4. संक्षिप्त रहें — दो-लाइन से ज़्यादा नहीं, ताकि आवाज़ पर सुनने में स्वाभाविक लगे।
5. जब कार्रवाई माँगी जाए (bag जोड़ो, ledger update, party create) — एक JSON tool-call ब्लॉक दें
   और नीचे एक छोटी confirmation लाइन:
   ```json
   {"action":"add_bag","party_name":"ललित","weight_kg":5,"notes":"..."}
   ```
   उसके बाद कहें "किशन सर, कर दिया?" या "बॉस, confirm करें?"
6. यदि screen_context दिया गया है, तो पहला जवाब उसी संदर्भ से शुरू करें
   (उदा. "सर, मैं देख रहा हूँ आप Invoice INV-042 पर हैं जहाँ ABC Trader का ₹5.2 लाख pending है। क्या मदद करूँ?")
7. Party / item / bag बनाते समय keep it FAST — यदि केवल optional fields (phone, notes) missing हैं तो पूछें मत। सीधे JSON action emit करें। सिर्फ mandatory fields (name, role for parties) missing हों तभी clarify करें।
8. एक user message पर हमेशा एक concrete JSON action produce करें अगर enough data है — बार-बार clarifying questions कम रखें।

उपलब्ध कार्रवाइयाँ (JSON action names) — केवल एक JSON action per reply:
- navigate — {"action":"navigate","route":"/invoices"}     (auto-execute)
- create_party — {"action":"create_party","name":"Ramesh","role":"customer","city":"Chennai","phone":"+91..","notes":"..."}
  (role must be one of: customer, supplier, end_customer, carrier)
- create_item — {"action":"create_item","name":"Chana","unit":"kg","hsn_code":"0713"}
- create_shipment — {"action":"create_shipment","consignment_no":"SE/26-27/041","direction":"IN_TO_TH","mode":"air","origin":"Chennai","destination":"BKK","freight":18500,"freight_ccy":"THB","notes":"..."}
  (direction ∈ IN_TO_TH | TH_TO_IN; mode ∈ air | sea | land | hand_carry; freight_ccy ∈ INR | THB)
- create_invoice — {"action":"create_invoice","invoice_no":"INV-2026-042","party_name":"ABC Trader","amount":50000,"currency":"INR","description":"Freight for SE/26-27/041","notes":"..."}
  (currency ∈ INR | THB)
- update_ledger — {"action":"update_ledger","party_name":"ABC Trader","debit":50000,"credit":0,"description":"Advance"}
- carrier_update — {"action":"carrier_update","consignment_no":"SE/26-27/035","status":"delivered","notes":"handed over"}
  (consignment_no MUST come from the real Shipments list above)
- add_bag — {"action":"add_bag","shipment_ref":"SE/26-27/035","weight_kg":5,"notes":"..."}
  (shipment_ref MUST be a consignment_no from the real Shipments list above — never invent)

महत्वपूर्ण:
- write actions (create_party / create_item / create_shipment / create_invoice / update_ledger / carrier_update / add_bag) पर app एक confirmation banner दिखाएगा — इसलिए action के बाद
  "किशन सर, confirm करें?" जैसी लाइन जोड़ें।
- create_* actions पर app AUTOMATICALLY उस form पर navigate करेगा और visually type करेगा। User Save button दबाएगा। इसलिए form पर navigate करने की ज़रूरत नहीं।
- navigate auto-execute होता है, बस routing action + एक शांत confirmation line दें।
- यदि पूरा data नहीं है (जैसे party role नहीं पता), तो पहले सर से पूछें, action बाद में करें।
"""


class AssistantMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    session_id: str
    message: str
    history: List[AssistantMessage] = Field(default_factory=list)
    # Optional: what the user is currently looking at. Sent on the FIRST
    # turn of a session (and any turn after a navigation) so the assistant
    # can open with a context-aware greeting.
    screen_context: Optional[str] = None
    # Operator's chosen honorific ("Sir" / "Boss" / "Ji"). Falls back to "Sir".
    honorific: Optional[str] = None
    display_name: Optional[str] = None


@api_router.get("/assistant/context")
async def assistant_context():
    """Return a compact snapshot of real entity IDs the assistant is
    allowed to reference — shipments, parties, items, active carrier trips.
    Injected into the system prompt on every chat turn so Claude never
    hallucinates a consignment number or party name.
    """
    global _ctx_cache, _ctx_cache_at
    now_ts = datetime.now(timezone.utc).timestamp()
    if _ctx_cache and (now_ts - _ctx_cache_at) < 15:
        return _ctx_cache

    ctx: Dict[str, Any] = {"generated_at": datetime.now(timezone.utc).isoformat()}
    # Pull the remote-proxied lists through httpx directly so we can
    # populate context even when the frontend hasn't yet called them.
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            async def _get(path: str) -> Any:
                if not REMOTE_BACKEND_URL:
                    return []
                r = await client.get(REMOTE_BACKEND_URL + path)
                if r.status_code >= 400:
                    return []
                return r.json() if r.content else []

            shipments = await _get("/api/shipments")
            parties = await _get("/api/parties")
            items = await _get("/api/items")
    except Exception:
        shipments, parties, items = [], [], []

    def _pick(d: dict, keys: List[str]) -> dict:
        return {k: d.get(k) for k in keys if k in d}

    # Latest 30 shipments (assumed newest-first from remote).
    ctx["shipments"] = [
        _pick(s, ["id", "consignment_no", "party_name", "status", "total_weight_kg", "created_at"])
        for s in (shipments or [])[:30]
    ]
    ctx["parties"] = [
        _pick(p, ["id", "name", "role", "city"]) for p in (parties or [])[:60]
    ]
    ctx["items"] = [
        _pick(i, ["id", "name", "unit"]) for i in (items or [])[:40]
    ]
    # Local: active carrier trips + open bullion transactions.
    trips = await db.bullion_trips.find(
        {}, {"_id": 0, "id": 1, "route": 1, "carrier_name": 1, "date": 1, "status": 1}
    ).sort("date", -1).limit(20).to_list(20)
    ctx["carrier_trips"] = trips

    _ctx_cache = ctx
    _ctx_cache_at = now_ts
    return ctx


@api_router.post("/assistant/chat")
async def assistant_chat(
    req: AssistantChatRequest,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    """SSE streaming Claude Sonnet response. Turn writes are fired-and-
    forgotten so time-to-first-token stays under the operator's 2s SLA.

    NEW (Phase 3): server-side conversation memory. If the caller didn't
    supply any history, we backfill it from the `assistant_messages`
    collection keyed by user_id — so Jarvis remembers what the operator
    told him yesterday across the S26 Ultra, the Tab S11, and the
    Android-TV console.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    user_id = str(user.get("_id")) if user else None
    user_key = user.get("username") if user else None

    # Fire user turn persistence asynchronously so it doesn't gate the first
    # streamed byte. Silent failure is acceptable here — chat still lands.
    async def _persist_user():
        try:
            await db.assistant_messages.insert_one({
                "id": str(uuid.uuid4()),
                "session_id": req.session_id,
                "user_id": user_id,
                "user_key": user_key,
                "role": "user",
                "content": req.message,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception:
            pass
    asyncio.create_task(_persist_user())

    # In-process cache of the top-hit memory tail — refreshed at most once
    # every 30s so we don't hammer Mongo on every single chat turn.
    global _mem_cache, _mem_cache_at
    now_ts = datetime.now(timezone.utc).timestamp()
    if not _mem_cache or (now_ts - _mem_cache_at) > 30:
        mem_docs = await db.assistant_memory.find().sort("hits", -1).limit(20).to_list(20)
        _mem_cache = [f"- {m.get('key')}: {m.get('value')}" for m in mem_docs]
        _mem_cache_at = now_ts
    memory_block = ("\nरिकॉर्ड पैटर्न्स:\n" + "\n".join(_mem_cache)) if _mem_cache else ""

    # Personal-address block — hard-wire the honorific into the system prompt
    # for every turn so the assistant never slips back to first-name-only.
    honorific = (req.honorific or "Sir").strip()
    address_line = f"\nऑपरेटर का पूरा संबोधन: '{req.display_name or 'Kishan'} {honorific}'. हमेशा 'सर' / 'बॉस' / '{honorific}' का उपयोग करें।\n"

    # Screen-context block — only sent when the client provided one.
    ctx_block = ""
    if req.screen_context:
        ctx_block = (
            f"\nस्क्रीन कॉन्टेक्स्ट (अभी उपयोगकर्ता क्या देख रहे हैं): {req.screen_context}\n"
            "इस turn का पहला वाक्य इसी संदर्भ से शुरू करें।\n"
        )

    # ------------------------------------------------------------------
    # Real-data block — the assistant MUST only quote consignment numbers,
    # party names, and item names that actually exist. We fetch a fresh
    # snapshot (cached ≤15s) and embed it in the system prompt so Claude
    # can pick real IDs instead of hallucinating like "CN-S/01".
    # ------------------------------------------------------------------
    try:
        real_ctx = await assistant_context()
    except Exception:
        real_ctx = {}
    real_block = ""
    ships = (real_ctx.get("shipments") or [])[:15]
    parties = (real_ctx.get("parties") or [])[:20]
    items = (real_ctx.get("items") or [])[:15]
    if ships or parties or items:
        real_block = "\n=== वास्तविक डेटाबेस snapshot (केवल इन IDs का उपयोग करें) ===\n"
        if ships:
            real_block += "\nसक्रिय Shipments (consignment_no · status · party):\n"
            for s in ships:
                cn = s.get("consignment_no") or s.get("id") or "?"
                p = s.get("party_name") or "—"
                st = s.get("status") or "—"
                real_block += f"  • {cn} · {st} · {p}\n"
        if parties:
            real_block += "\nParties (name · role):\n"
            for p in parties:
                real_block += f"  • {p.get('name')} · {p.get('role') or '—'}\n"
        if items:
            real_block += "\nItems (name):\n"
            for it in items:
                real_block += f"  • {it.get('name')}\n"
        real_block += (
            "\nमहत्वपूर्ण: यदि उपयोगकर्ता कोई ID बताए जो ऊपर सूची में नहीं है, "
            "तो पहले सूची में से मिलती-जुलती suggest करें। कभी भी fake / random "
            "IDs ('CN-S/01' आदि) मत बनाएँ।\n"
        )

    # ------------------------------------------------------------------
    # Server-side memory (Phase 3): If the client didn't send us any
    # history AND we know the user, backfill the last N turns from
    # Mongo. This keeps Jarvis' memory alive across devices + sessions.
    # ------------------------------------------------------------------
    replayed_history: List[Dict[str, str]] = []
    if user_id and len(req.history or []) == 0:
        try:
            prev = await db.assistant_messages.find(
                {"user_id": user_id},
                {"_id": 0, "role": 1, "content": 1, "created_at": 1},
            ).sort("created_at", -1).limit(24).to_list(24)
            # Chronological order (oldest first).
            prev = list(reversed(prev))
            replayed_history = [
                {"role": p.get("role") or "user", "content": p.get("content") or ""}
                for p in prev
                if p.get("content")
            ]
        except Exception:
            replayed_history = []

    # For LlmChat we use a stable per-user session_id so its internal
    # context store also accumulates naturally. Fallback to client's id.
    effective_session_id = f"user:{user_id}" if user_id else req.session_id

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=effective_session_id,
            system_message=_ASSISTANT_SYSTEM_HI + address_line + ctx_block + real_block + memory_block,
        )
        .with_model("anthropic", "claude-sonnet-4-6")
    )

    # Compose the message we send to Claude. If we replayed history, embed
    # a short "पिछली बातचीत का सार" block so the model has context even on
    # the very first turn of a fresh session_id.
    prompt_message = req.message
    if replayed_history:
        # Take the last ~10 user↔assistant exchanges so we don't blow the
        # context window on very long histories.
        tail = replayed_history[-10:]
        recap_lines = []
        for m in tail:
            who = "उपयोगकर्ता" if m["role"] == "user" else "मैं"
            snippet = (m["content"] or "").strip().replace("\n", " ")[:160]
            if snippet:
                recap_lines.append(f"  • {who}: {snippet}")
        if recap_lines:
            recap = "\n=== पिछली बातचीत का सार (memory) ===\n" + "\n".join(recap_lines) + "\n=== वर्तमान turn ===\n"
            prompt_message = recap + req.message

    async def event_gen():
        # Immediate keep-alive comment frame — flushes the connection buffer
        # so the client's TTFT clock actually starts ticking.
        yield ": ping\n\n"
        buf = ""
        try:
            async for event in chat.stream_message(UserMessage(text=prompt_message)):
                if isinstance(event, TextDelta):
                    buf += event.content
                    # SSE spec: a `data:` frame ends at the first blank line.
                    # If the model streams a chunk that contains one or more
                    # embedded `\n` (typical around fenced ```json``` blocks),
                    # sending `data: <chunk>\n\n` truncates the frame at the
                    # embedded newline and the rest leaks out un-prefixed.
                    # Emit each line as its own `data:` line, then a single
                    # blank line to terminate the record — the client
                    # concatenates them back with `\n`. Empty chunks are
                    # emitted as a single blank `data:` line to preserve
                    # newlines that Claude actually intended.
                    lines = event.content.split("\n") if event.content else [""]
                    for seg in lines:
                        yield f"data: {seg}\n"
                    yield "\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception as e:
            yield f"event: error\ndata: {str(e)}\n\n"
        finally:
            # Assistant turn persistence — again async so we don't hold up
            # the final [DONE] frame.
            async def _persist_assistant():
                try:
                    await db.assistant_messages.insert_one({
                        "id": str(uuid.uuid4()),
                        "session_id": req.session_id,
                        "user_id": user_id,
                        "user_key": user_key,
                        "role": "assistant",
                        "content": buf,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
                except Exception:
                    pass
            asyncio.create_task(_persist_assistant())
            yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# Module-level memory cache; simple TTL so a burst of chat turns doesn't
# repeatedly hit Mongo for the same top-N pattern set.
_mem_cache: List[str] = []
_mem_cache_at: float = 0.0
# Real-entity snapshot cache — refreshed at most every 15s by
# /api/assistant/context, injected into every chat system prompt.
_ctx_cache: Optional[Dict[str, Any]] = None
_ctx_cache_at: float = 0.0


class AssistantMemoryEntry(BaseModel):
    key: str
    value: str


@api_router.post("/assistant/memory")
async def assistant_learn(entry: AssistantMemoryEntry):
    """Store or bump a business-knowledge pattern. Called by the client
    every time a manual entry finishes (party create, invoice save, bag add)
    so the AI learns as the operator uses the app."""
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.assistant_memory.find_one({"key": entry.key})
    if existing:
        await db.assistant_memory.update_one(
            {"_id": existing["_id"]},
            {"$set": {"value": entry.value, "last_seen": now},
             "$inc": {"hits": 1}},
        )
    else:
        await db.assistant_memory.insert_one({
            "id": str(uuid.uuid4()),
            "key": entry.key,
            "value": entry.value,
            "hits": 1,
            "created_at": now,
            "last_seen": now,
        })
    return {"ok": True}


@api_router.get("/assistant/memory")
async def assistant_memory_list(limit: int = 50):
    docs = await db.assistant_memory.find().sort("hits", -1).limit(min(limit, 200)).to_list(200)
    return [_clean_mongo_id(d) for d in docs]


@api_router.delete("/assistant/memory/{key:path}")
async def assistant_memory_delete(key: str):
    """Remove a stored pattern. `key` may include colons (e.g. `party:Lalit`).
    Returns 200 with {ok:true} whether or not the row existed (idempotent)."""
    await db.assistant_memory.delete_one({"key": key})
    # Bust the in-process cache so the next chat turn re-reads.
    global _mem_cache_at
    _mem_cache_at = 0.0
    return {"ok": True}


# ---------------------------------------------------------------------------
# Assistant conversation history — Phase 3 (server-side memory)
# ---------------------------------------------------------------------------
@api_router.get("/assistant/history")
async def assistant_history(
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
    limit: int = 40,
):
    """Return the most recent messages for the current user, oldest→newest.
    Falls back to session_id if the caller is unauthenticated (returns []).
    """
    limit = max(1, min(limit, 200))
    user_id = str(user.get("_id")) if user else None
    if not user_id:
        return []
    docs = await db.assistant_messages.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "role": 1, "content": 1, "created_at": 1},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return list(reversed(docs))


@api_router.delete("/assistant/history")
async def assistant_history_clear(
    user: Annotated[dict, Depends(get_current_user)],
):
    """Wipe the current user's conversation history (opt-in fresh start)."""
    user_id = str(user.get("_id"))
    res = await db.assistant_messages.delete_many({"user_id": user_id})
    return {"ok": True, "deleted": res.deleted_count}


# ---------------------------------------------------------------------------
# Intelligent To-Do — Phase 3 blockers endpoint
# ---------------------------------------------------------------------------
@api_router.get("/todo/blockers")
async def todo_blockers():
    """Return a categorised list of "blocking" data-hygiene issues the
    operator needs to fix. Categories:
      • bags        — bags with no `weight_kg`
      • shipments   — shipments missing freight amount OR bill-to party
      • invoices    — invoices with an amount of 0

    The counts + item lists are used by the bell/inbox in the mobile app.
    Parties w/o phone/GSTIN were removed at the operator's request — the
    catalog often has partial contacts by design.
    """
    async def _get_remote(path: str) -> Any:
        if not REMOTE_BACKEND_URL:
            return []
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(REMOTE_BACKEND_URL + path)
                if r.status_code >= 400 or not r.content:
                    return []
                return r.json()
        except Exception:
            return []

    shipments = await _get_remote("/api/shipments") or []
    invoices = await _get_remote("/api/invoices") or []

    # -------- Shipments missing freight OR bill-to party ----------
    ship_blockers: List[Dict[str, Any]] = []
    for s in shipments:
        missing = []
        freight = s.get("freight") or s.get("freight_amount") or 0
        try:
            freight_val = float(freight or 0)
        except (TypeError, ValueError):
            freight_val = 0.0
        if freight_val <= 0:
            missing.append("freight")
        # Bill-to party can be at shipment-level (party_id) or per-bag.
        # We flag when NO party is attached anywhere.
        if not s.get("party_id") and not s.get("party_name"):
            missing.append("bill_to")
        if missing:
            ship_blockers.append({
                "id": s.get("id"),
                "consignment_no": s.get("consignment_no"),
                "origin": s.get("origin"),
                "destination": s.get("destination"),
                "missing": missing,
                "route": f"/shipment/{s.get('id')}" if s.get("id") else "/shipments",
            })

    # -------- Invoices with amount = 0 ----------
    inv_blockers: List[Dict[str, Any]] = []
    for inv in invoices:
        amt = inv.get("total") or inv.get("amount") or 0
        try:
            amt_val = float(amt or 0)
        except (TypeError, ValueError):
            amt_val = 0.0
        if amt_val <= 0:
            inv_blockers.append({
                "id": inv.get("id"),
                "invoice_no": inv.get("invoice_no") or inv.get("number"),
                "party_name": inv.get("party_name") or "—",
                "route": f"/invoice/{inv.get('id')}" if inv.get("id") else "/invoices",
            })

    # -------- Bags without weight_kg (per shipment) ----------
    # Fetch bags for the first 30 recent shipments — walking all bags for
    # every shipment on every poll would be quadratic. 30 covers the
    # active window.
    bag_blockers: List[Dict[str, Any]] = []
    ship_slice = shipments[:30]
    for s in ship_slice:
        sid = s.get("id")
        if not sid:
            continue
        bags = await _get_remote(f"/api/shipments/{sid}/bags") or []
        for b in bags:
            try:
                w = float(b.get("weight_kg") or 0)
            except (TypeError, ValueError):
                w = 0.0
            if w <= 0:
                bag_blockers.append({
                    "id": b.get("id"),
                    "bag_no": b.get("bag_no") or b.get("id"),
                    "shipment_id": sid,
                    "consignment_no": s.get("consignment_no"),
                    "route": f"/shipment/{sid}",
                })

    total = len(ship_blockers) + len(inv_blockers) + len(bag_blockers)
    return {
        "total": total,
        "shipments": ship_blockers,
        "invoices": inv_blockers,
        "bags": bag_blockers,
        "summary_hi": _blockers_summary_hi(len(ship_blockers), len(inv_blockers), len(bag_blockers)),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _blockers_summary_hi(ships: int, invs: int, bags: int) -> str:
    """Compose the short Hindi one-liner Jarvis speaks on assistant open."""
    parts: List[str] = []
    if bags:
        parts.append(f"{bags} bags अभी भी weight बिना हैं")
    if ships:
        parts.append(f"{ships} shipments incomplete हैं")
    if invs:
        parts.append(f"{invs} invoices का amount खाली है")
    if not parts:
        return "Sir, सब कुछ अपडेट है — कोई pending काम नहीं।"
    return "Sir, " + ", ".join(parts) + "। Bell icon पर tap करें to fix."


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "shimmer"   # shimmer = softest natural Hindi delivery


@api_router.post("/assistant/tts")
async def assistant_tts(req: TTSRequest):
    """Text → audio/mpeg via OpenAI TTS through the Emergent proxy.
    Uses `shimmer` as the default voice — softest, most natural Hindi delivery."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    from emergentintegrations.llm.openai.text_to_speech import OpenAITextToSpeech
    tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
    try:
        audio_bytes = await tts.generate_speech(
            text=req.text,
            model="tts-1",
            voice=req.voice or "nova",
            response_format="mp3",
        )
    except Exception as e:
        raise HTTPException(502, f"TTS upstream error: {e}")
    return Response(content=audio_bytes, media_type="audio/mpeg")


@api_router.post("/assistant/stt")
async def assistant_stt(request: Request):
    """Whisper-1 STT via the Emergent proxy. Accepts multipart/form-data
    with an `audio` field, returns { text: ... } for Hindi transcriptions."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    form = await request.form()
    upload = form.get("audio")
    if not upload:
        raise HTTPException(400, "Missing `audio` file")
    from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText
    stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
    try:
        # Persist upload to a temp file — Whisper takes a file path.
        import tempfile
        suffix = "." + (upload.filename or "voice.m4a").rsplit(".", 1)[-1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tf:
            tf.write(await upload.read())
            tmp_path = tf.name
        result = await stt.transcribe_audio(
            audio_file_path=tmp_path,
            model="whisper-1",
            language="hi",
        )
    except Exception as e:
        raise HTTPException(502, f"STT upstream error: {e}")
    return {"text": result.get("text") if isinstance(result, dict) else str(result)}


app.include_router(api_router)
# Lalamove endpoints — mounted under /api/lalamove/*. Registered BEFORE the
# catch-all proxy so its paths don't get forwarded to the remote backend.
app.include_router(lalamove_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Shared async client for proxy calls (reused for connection pooling)
_HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "content-encoding",
    "host",
}
_proxy_client: httpx.AsyncClient | None = None


@app.on_event("startup")
async def _startup_proxy_client():
    global _proxy_client
    _proxy_client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    global _proxy_client
    if _proxy_client is not None:
        await _proxy_client.aclose()


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    include_in_schema=False,
)
async def proxy_to_remote_backend(path: str, request: Request):
    """Catch-all proxy that forwards any unhandled `/api/*` request to the
    remote backend the Expo app is actually configured to hit. This keeps the
    deployment container's `/api/*` contract in sync with the mobile client
    without duplicating business logic locally.

    Audit fields (`created_by`, `modified_by`, `entry_source`) are injected
    into JSON bodies for mutating verbs so the remote backend can persist
    them without any client cooperation. The acting user's id/role are also
    forwarded as `X-Actor-*` headers.
    """
    if not REMOTE_BACKEND_URL:
        logger.error("REMOTE_BACKEND_URL is not configured; cannot proxy %s", path)
        return Response(
            content=b'{"detail":"Backend not configured"}',
            status_code=503,
            media_type="application/json",
        )
    target_url = f"{REMOTE_BACKEND_URL}/api/{path}"
    fwd_headers = {
        k: v for k, v in request.headers.items() if k.lower() not in _HOP_BY_HOP
    }
    # Add actor identity for the remote backend to see (and log if it wants).
    actor_username = getattr(request.state, "audit_username", None)
    actor_role = getattr(request.state, "audit_role", None)
    actor_id = getattr(request.state, "audit_user_id", None)
    entry_source = getattr(request.state, "audit_source", "manual")
    if actor_username:
        fwd_headers["X-Actor-Username"] = actor_username
    if actor_role:
        fwd_headers["X-Actor-Role"] = actor_role
    if actor_id:
        fwd_headers["X-Actor-Id"] = actor_id
    fwd_headers["X-Entry-Source"] = entry_source

    body = await request.body()

    # For mutating verbs with JSON bodies, inject audit fields directly into
    # the payload so the remote backend persists them even if it doesn't
    # inspect our custom headers. Silent no-op on malformed / non-JSON.
    if request.method in {"POST", "PUT", "PATCH"} and body:
        try:
            payload = json.loads(body)
            if isinstance(payload, dict):
                now_iso = datetime.now(timezone.utc).isoformat()
                stamper = actor_username or "system"
                if request.method == "POST":
                    payload.setdefault("created_by", stamper)
                    payload.setdefault("created_at", now_iso)
                    payload.setdefault("entry_source", entry_source)
                payload["modified_by"] = stamper
                payload["modified_at"] = now_iso
                body = json.dumps(payload).encode()
                fwd_headers.pop("content-length", None)
        except (json.JSONDecodeError, ValueError):
            pass

    try:
        resp = await _proxy_client.request(
            request.method,
            target_url,
            params=request.query_params,
            headers=fwd_headers,
            content=body,
        )
    except httpx.RequestError as exc:
        logger.warning("Upstream proxy failure for %s: %s", target_url, exc)
        return Response(
            content=b'{"detail":"Upstream backend unreachable"}',
            status_code=502,
            media_type="application/json",
        )

    resp_headers = {
        k: v for k, v in resp.headers.items() if k.lower() not in _HOP_BY_HOP
    }
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=resp_headers,
        media_type=resp.headers.get("content-type"),
    )

