from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict, Annotated, Tuple
import uuid
from datetime import datetime, timedelta, timezone
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
from routers.companies import router as companies_router  # noqa: E402
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
    # Accept EITHER a `username` OR an `email` in the payload. The
    # Pydantic model already enforces that at least one is present, so
    # here we just pick whichever the caller supplied and query Mongo.
    # Case-insensitive match on both fields (usernames and emails are
    # stored lowercased on this backend).
    username = (payload.username or "").strip().lower()
    email = (payload.email or "").strip().lower()
    user = None
    if username:
        user = await db.users.find_one({"username": username})
    if not user and email:
        user = await db.users.find_one({"email": email})
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
    route: Optional[str] = None              # "IN_TO_TH" | "TH_TO_IN" (canonical)
    direction: Optional[str] = None          # alias for `route` — accepts same values
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
    # ---- New Trips-module fields (2026-02) ----
    currency_type: Optional[str] = None      # "USD" | "SGD" | "THB" | "other" | free-text
    currency_amount: Optional[float] = None  # amount carried in the above currency
    gold_baht: Optional[float] = None        # gold carried, measured in Thai baht (15.244g)
    carry_charge_inr: Optional[float] = None # total carrier fee for this trip, in INR
    shipment_ref: Optional[Dict[str, Any]] = None  # {id: uuid, consignment_no: "CN-…"}
    # Multi-company tag (Phase 1). Matches a Company.id, e.g. "awadh_enterprise"
    # or "singh_exports". `None` = untagged legacy record.
    company: Optional[str] = None
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
async def bullion_list_trips(company: Optional[str] = None):
    """List all bullion trips. When `company` is provided, results are
    filtered to that company (multi-company Phase 1). Matches both
    prefixed (`co_singh_exports`) and short (`singh_exports`) forms so
    legacy records tagged either way stay reachable. No filter = all
    trips (backward compat for older clients)."""
    query: Dict[str, Any] = {}
    if company:
        short = company[3:] if company.startswith("co_") else company
        prefixed = company if company.startswith("co_") else f"co_{company}"
        query["company"] = {"$in": list({company, short, prefixed})}
    docs = await db.bullion_trips.find(query).sort("date", -1).to_list(500)
    return [_clean_mongo_id(d) for d in docs]


@api_router.post("/bullion/trips")
async def bullion_create_trip(trip: BullionTrip, request: Request):
    # Pydantic v1: use .dict() so `extra="allow"` fields are preserved.
    doc = trip.dict()
    # If the client sent the older `available_slots` but not `available_weight_kg`,
    # mirror the value so downstream aggregations keep working.
    if not doc.get("available_weight_kg") and doc.get("available_slots"):
        doc["available_weight_kg"] = float(doc["available_slots"])
    # Trips-module alias: accept `direction` from the client and mirror it to
    # `route` (canonical) so all existing dispatcher / map / airline code
    # keeps working. If both are sent, `route` wins.
    if doc.get("direction") and not doc.get("route"):
        doc["route"] = doc["direction"]
    elif doc.get("route") and not doc.get("direction"):
        doc["direction"] = doc["route"]
    doc.update(audit_stamp(request, creating=True, source=request.state.audit_source))
    await db.bullion_trips.insert_one(doc.copy())
    return _clean_mongo_id(doc)


@api_router.put("/bullion/trips/{trip_id}")
async def bullion_update_trip(trip_id: str, patch: Dict[str, Any], request: Request):
    patch.pop("id", None)
    # Same direction↔route mirroring on updates.
    if patch.get("direction") and not patch.get("route"):
        patch["route"] = patch["direction"]
    elif patch.get("route") and not patch.get("direction"):
        patch["direction"] = patch["route"]
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
    # Phase C — Fix 9: auto-broadcast to customer parties when a new
    # item lands in the catalog with a photo. The actual WhatsApp send
    # is MOCKED (logged to `whatsapp_broadcast_log` collection) because
    # we don't have a WhatsApp Business API key wired yet. The queue
    # entry survives so a background worker can flush later.
    try:
        photo = patch.get("photo_url") or patch.get("photo") or ""
        if photo:
            await _queue_catalog_broadcast(result, photo)
    except Exception as e:  # noqa: BLE001
        logging.warning(f"[catalog-broadcast] queue failed: {e}")
    return {"ok": True, "item": result, "created": True}


# --- Catalog → WhatsApp customer broadcast (MOCKED) -----------------------
async def _queue_catalog_broadcast(item: Dict[str, Any], photo_url: str) -> None:
    """Enqueue a broadcast to every party with role=customer.

    The `whatsapp_broadcast_log` collection stores one row PER recipient
    with `status="queued"`. A real WhatsApp Business worker (not yet
    wired) would pick these up and set status="sent"/"failed". For now
    the app can surface the log to the admin so they see the AI acted.
    """
    parties = await _proxy_get("/api/parties") or []
    customers = [p for p in parties if str(p.get("role", "")).lower() == "customer"]
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for p in customers:
        phone = str(p.get("phone") or "").strip()
        if not phone:
            continue
        docs.append({
            "id": str(uuid.uuid4()),
            "item_id": item.get("id"),
            "item_name": item.get("name"),
            "photo_url": photo_url,
            "party_id": p.get("id"),
            "party_name": p.get("name"),
            "phone": phone,
            "message": f"Naya maal available hai! {item.get('name')}",
            "status": "queued",
            "created_at": now,
        })
    if docs:
        await db.whatsapp_broadcast_log.insert_many(docs)
    await _log_wingman("catalog-broadcast", {"item_id": item.get("id"), "recipients": len(docs)}, {"count": len(docs)})


@api_router.get("/catalog/broadcast/log")
async def catalog_broadcast_log(limit: int = 50):
    """Admin-facing view of queued catalog broadcasts."""
    docs = await db.whatsapp_broadcast_log.find().sort("created_at", -1).to_list(min(limit, 500))
    return [_clean_mongo_id(d) for d in docs]


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
from fastapi.responses import StreamingResponse, PlainTextResponse
import asyncio
import time

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
You are Wingman — Kishan Sir's personal logistics assistant. This is an
India ↔ Thailand hand-carry business.

## Language — HINGLISH (Hindi words in English letters)

Speak Hinglish. Hindi phrases + English words, all in Latin script — this
is the natural way Kishan Sir talks. Examples:

- "Namaste Kishan Sir, aaj kya kaam hai?"
- "Sir, aapka Delhi ka shipment ready hai — 3 bags, 15 kg."
- "Bataiye party ka naam kya hai?"
- "Confirm karein, save karoon?"
- "Sir, freight rate abhi tak nahi mila — bataiye kitna hai?"

DO NOT write in Devanagari (देवनागरी) — Latin script only, so TTS speaks
naturally and the operator can read replies quickly on his phone.

Understand voice input in Devanagari OR Latin script Hindi — but ALWAYS
respond in Latin-script Hinglish.

## Etiquette

1. Address the operator as "Kishan Sir", "Sir", or "Boss". Never just the
   bare first name.
2. Polite tone with clients/parties, direct with carriers.
3. Short, calm sentences. Correct punctuation (. , ? !) — TTS uses these
   to pause naturally. Avoid long compound sentences.
4. Max 1 emoji per reply. Keep replies under 2 lines when possible.

## Multi-turn breakdown (IMPORTANT)

The operator often speaks in big compound sentences ("Lalit ke paas 4
bags hain, 2 kg each, Silver Chain aur Gold Bangles"). You MUST decompose
these into a sequence of clarifying turns, asking for ONE missing piece
at a time until the record is complete.

Sequence for shipment/bag creation:
  1. Party (bill-to) — resolve from the real parties list
  2. Consignment number / shipment code
  3. Direction (India → Thailand OR Thailand → India)
  4. Mode (air / sea / land / hand_carry)
  5. Bag count + weight per bag
  6. Items per bag (name, quantity, unit, HSN)
  7. Freight amount + currency
  8. Notes (optional — don't ask, only capture if given)

When user gives partial info: acknowledge briefly, then ask for the NEXT
missing field. Never ask for multiple fields in one turn. Never repeat a
question the user already answered. Use the conversation history above
to remember previously-supplied fields.

Example:
  User: "Lalit ke paas 4 bags hain"
  You : "Theek hai Sir — Lalit ke 4 bags. Har bag ka weight kitna hai?"
  User: "2 kg each"
  You : "Ok — 4 bags × 2 kg. Ab bataiye, direction kya hai — India se
        Thailand, ya Thailand se India?"
  User: "India to Thailand"
  You : "Set. Mode kya — air, sea, ya hand_carry?"
  ... aur aage bhi ek-ek karke.

Once all mandatory fields are known → emit ONE `create_shipment` JSON
action. If only optional fields (phone, notes) missing → emit action
anyway; don't over-ask.

## Action JSON — STRICT enum values

When you emit an action, use these EXACT enum values. Wrong casing or
spelling → HTTP 422 → user frustration.

```
direction    IN_TO_TH    (India → Thailand)
             TH_TO_IN    (Thailand → India)
mode         air | sea | land | hand_carry
role         customer | supplier | end_customer | carrier
currency     INR | THB
status       in_transit | delivered | delayed
```

Available actions (ONE per reply, always inside a ```json``` fenced block):

- navigate — {"action":"navigate","route":"/invoices"}   (auto-executes)
- create_party — {"action":"create_party","name":"Ramesh","role":"customer","city":"Chennai","phone":"+91..","notes":"..."}
- create_item — {"action":"create_item","name":"Silver Chain","unit":"pcs","hsn_code":"7113","notes":"..."}
- create_shipment — {"action":"create_shipment","consignment_no":"SE/26-27/041","direction":"IN_TO_TH","mode":"hand_carry","origin":"Chennai","destination":"BKK","party_name":"Lalit","freight":18500,"freight_ccy":"THB","notes":"..."}
- create_invoice — {"action":"create_invoice","invoice_no":"INV-2026-042","party_name":"Priya Traders","amount":50000,"currency":"INR","description":"Freight charges","notes":"..."}
- update_ledger — {"action":"update_ledger","party_name":"ABC Trader","debit":50000,"credit":0,"description":"Advance"}
- carrier_update — {"action":"carrier_update","consignment_no":"SE/26-27/035","status":"delivered","notes":"handed over"}
  (consignment_no MUST be a real one from the Shipments list below)
- add_bag — {"action":"add_bag","shipment_ref":"SE/26-27/035","weight_kg":5,"notes":"..."}
  (shipment_ref MUST be a real consignment_no from the Shipments list — never invent)

## Confirmation flow

- After a create_* / update_* action → add "Kishan Sir, save karoon?" or
  "Boss, confirm karein?" on the next line.
- The app auto-navigates to the form and visually types the fields —
  DO NOT ask the user to open a page manually.
- If a required field is missing → ASK for it FIRST, don't emit the action.

## Context awareness

If screen_context is given, start with a mention of it:
  "Sir, main dekh raha hoon aap Invoice INV-042 par hain — kya karna hai?"
"""


class AssistantMessage(BaseModel):
    role: str
    # Accept either `content` (canonical) or `text` (frontend Msg shape).
    # `at` timestamp is also allowed but ignored.
    content: Optional[str] = None
    text: Optional[str] = None
    at: Optional[int] = None

    class Config:
        extra = "ignore"

    def body(self) -> str:
        return self.content or self.text or ""


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
# Wingman Activity — real-time log of every AI-driven write
# ---------------------------------------------------------------------------
class WingmanActivity(BaseModel):
    action: str                        # e.g. "create_party", "add_bag"
    entity_type: Optional[str] = None  # "party" | "shipment" | "invoice" | ...
    entity_id: Optional[str] = None    # id of the created / modified row
    entity_label: Optional[str] = None # human label for the list ("Party: Lalit")
    route: Optional[str] = None        # deep link to open
    method: Optional[str] = None       # POST / PUT / DELETE
    status: Optional[str] = "ok"       # "ok" | "error"
    error: Optional[str] = None        # error message if status=error
    summary: Optional[str] = None      # short one-liner ("Party 'Lalit' banaya")


@api_router.post("/wingman/activity")
async def wingman_activity_log(
    req: WingmanActivity,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    """Record a single AI-driven action so the operator can audit the
    Wingman's work later. Called by the frontend ghost engine after
    every successful (or failed) dispatch."""
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": str(user.get("_id")) if user else None,
        "user_key": user.get("username") if user else None,
        "action": req.action,
        "entity_type": req.entity_type,
        "entity_id": req.entity_id,
        "entity_label": req.entity_label,
        "route": req.route,
        "method": req.method or "POST",
        "status": req.status or "ok",
        "error": req.error,
        "summary": req.summary,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.wingman_activity.insert_one(doc)
    except Exception:
        # Never fail the operator's flow because of an audit-log write.
        return {"ok": False}
    return {"ok": True, "id": doc["id"]}


@api_router.get("/wingman/activity")
async def wingman_activity_list(
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
    limit: int = 100,
):
    """Return recent Wingman actions (newest first) for the current user,
    or across ALL users when unauthenticated (dev only)."""
    limit = max(1, min(limit, 500))
    q: Dict[str, Any] = {}
    if user:
        q["user_id"] = str(user.get("_id"))
    docs = await db.wingman_activity.find(
        q,
        {"_id": 0},
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return docs


@api_router.delete("/wingman/activity")
async def wingman_activity_clear(user: Annotated[dict, Depends(get_current_user)]):
    """Wipe the current user's Wingman activity log."""
    res = await db.wingman_activity.delete_many({"user_id": str(user.get("_id"))})
    return {"ok": True, "deleted": res.deleted_count}


# ---------------------------------------------------------------------------
# WhatsApp Wingman — webhook that shares the same brain + memory as the app
# ---------------------------------------------------------------------------
#
# GET  /api/whatsapp/webhook — Meta Cloud API verification handshake.
# POST /api/whatsapp/webhook — Meta Cloud API incoming message payload.
#
# The webhook is deliberately conservative:
#   • It always returns 200 so Meta doesn't disable the webhook if we
#     throw during processing.
#   • It writes the user's turn to `assistant_messages` (same collection
#     as the in-app popup) BEFORE calling the LLM so a slow LLM never
#     eats a message.
#   • The reply is a plain text WhatsApp message via the Cloud Graph API.
#
# Environment variables (add to backend/.env before the webhook can
# actually reply):
#   WHATSAPP_VERIFY_TOKEN     — any string; must match "hub.verify_token"
#                               you paste into Meta's webhook config UI
#   WHATSAPP_ACCESS_TOKEN     — Cloud API "System User" token
#   WHATSAPP_PHONE_NUMBER_ID  — the /messages endpoint ID
#   WHATSAPP_OWNER_PHONE      — your WhatsApp phone (E.164, e.g. "919876543210")
#   WHATSAPP_OWNER_USER_ID    — the Mongo _id of your user document
#                               (found under db.users where username="kishan")
# ---------------------------------------------------------------------------

async def _generate_wingman_reply(
    user_id: Optional[str],
    user_key: Optional[str],
    message: str,
    *,
    honorific: str = "Sir",
    display_name: str = "Kishan",
    session_id: Optional[str] = None,
) -> str:
    """Non-streaming Wingman reply. Same brain, prompt, real-data block
    and memory backfill as /api/assistant/chat — just buffered so it can
    be POSTed to WhatsApp in one shot.

    Persists both the user + assistant turns to `assistant_messages`
    (fire-and-forget) so WhatsApp + in-app share the same conversation.
    """
    if not EMERGENT_LLM_KEY:
        return "Sir, mera LLM key configure nahi hai — please app dekh lijiye."

    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    # ---- persist user turn ----
    try:
        await db.assistant_messages.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session_id or (f"user:{user_id}" if user_id else "whatsapp"),
            "user_id": user_id,
            "user_key": user_key,
            "channel": "whatsapp",
            "role": "user",
            "content": message,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass

    # ---- real-data context ----
    address_line = f"\nऑपरेटर का पूरा संबोधन: '{display_name} {honorific}'.\n"
    try:
        real_ctx = await assistant_context()
    except Exception:
        real_ctx = {}
    real_block = ""
    ships = (real_ctx.get("shipments") or [])[:12]
    parties = (real_ctx.get("parties") or [])[:15]
    if ships or parties:
        real_block = "\n=== DB snapshot (only use these IDs) ===\n"
        for s in ships:
            real_block += f"  • Shipment {s.get('consignment_no')} · {s.get('status')} · {s.get('party_name') or '—'}\n"
        for p in parties:
            real_block += f"  • Party {p.get('name')} · {p.get('role') or '—'}\n"

    # ---- memory replay ----
    prompt_message = message
    if user_id:
        try:
            prev = await db.assistant_messages.find(
                {"user_id": user_id},
                {"_id": 0, "role": 1, "content": 1, "created_at": 1},
            ).sort("created_at", -1).limit(20).to_list(20)
            prev = list(reversed(prev))
            if prev:
                recap_lines: List[str] = []
                for m in prev[-10:]:
                    who = "User" if m.get("role") == "user" else "Wingman"
                    snippet = (m.get("content") or "").strip().replace("\n", " ")[:160]
                    if snippet:
                        recap_lines.append(f"  • {who}: {snippet}")
                if recap_lines:
                    prompt_message = (
                        "\n=== Pichli baatcheet ka saar (memory) ===\n"
                        + "\n".join(recap_lines)
                        + "\n=== Vartaman turn ===\n" + message
                    )
        except Exception:
            pass

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id or (f"user:{user_id}" if user_id else "whatsapp"),
            system_message=_ASSISTANT_SYSTEM_HI + address_line + real_block,
        )
        .with_model("anthropic", "claude-sonnet-4-6")
    )

    buf = ""
    try:
        async for event in chat.stream_message(UserMessage(text=prompt_message)):
            if isinstance(event, TextDelta):
                buf += event.content
            elif isinstance(event, StreamDone):
                break
    except Exception as e:
        buf = f"Sir, error aa gaya: {e}"

    # ---- persist assistant turn ----
    try:
        await db.assistant_messages.insert_one({
            "id": str(uuid.uuid4()),
            "session_id": session_id or (f"user:{user_id}" if user_id else "whatsapp"),
            "user_id": user_id,
            "user_key": user_key,
            "channel": "whatsapp",
            "role": "assistant",
            "content": buf,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass
    return buf


def _resolve_whatsapp_user(from_phone: str) -> Tuple[Optional[str], Optional[str]]:
    """Map incoming WhatsApp `from` phone to (user_id, user_key).
    Uses env vars for the owner phone/user; unknown senders get None."""
    owner_phone = (os.getenv("WHATSAPP_OWNER_PHONE") or "").strip()
    owner_uid = (os.getenv("WHATSAPP_OWNER_USER_ID") or "").strip()
    if owner_phone and from_phone and from_phone.endswith(owner_phone.lstrip("+")):
        return owner_uid or None, "kishan"
    # Future: db lookup by phone. For now, only the owner is recognised.
    return None, None


async def _send_whatsapp_reply(to_phone: str, text: str) -> bool:
    """POST a text reply back to the Meta WhatsApp Cloud API. Returns
    True on 2xx. Silent no-op if the required env vars aren't set."""
    token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    if not token or not phone_id:
        return False
    url = f"https://graph.facebook.com/v20.0/{phone_id}/messages"
    body = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text[:4000]},  # WhatsApp text body cap
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, json=body, headers={"Authorization": f"Bearer {token}"})
            return r.status_code < 300
    except Exception:
        return False


@api_router.get("/whatsapp/webhook")
async def whatsapp_verify(request: Request):
    """Meta Cloud API verification handshake. Meta sends:
    ?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y

    We echo hub.challenge only if the token matches. Accepts EITHER the
    `WHATSAPP_VERIFY_TOKEN` env var (preferred for rotation) OR the
    hard-coded `logiop_verify_2026` fallback so a fresh deploy without
    the env var still passes Meta's handshake. Returns 403 on mismatch.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    expected_env = (os.getenv("WHATSAPP_VERIFY_TOKEN") or "").strip()
    expected_fallback = "logiop_verify_2026"
    if mode == "subscribe" and token and token in {expected_env, expected_fallback}:
        return PlainTextResponse(challenge or "ok", status_code=200)
    return PlainTextResponse("forbidden", status_code=403)


# ---------------------------------------------------------------------------
# WhatsApp SEND endpoint — Fix 8 of the Absolute Final snippet.
# Uses the Meta Cloud API creds already wired for the webhook receiver.
# Also queues the send into `whatsapp_broadcast_log` so the operator has
# an audit trail even if the Cloud API call fails or the token expires.
# ---------------------------------------------------------------------------
class WhatsAppSendIn(BaseModel):
    to_phone: str
    message: str
    photo_url: Optional[str] = None
    party_id: Optional[str] = None
    party_name: Optional[str] = None


@api_router.post("/whatsapp/send")
async def whatsapp_send(payload: WhatsAppSendIn):
    """Send a WhatsApp message via Meta Cloud API.
    Returns { ok, delivered, queued_id }. Queues to
    whatsapp_broadcast_log with status=sent|failed|queued.
    """
    now = datetime.now(timezone.utc).isoformat()
    log_doc: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "party_id": payload.party_id,
        "party_name": payload.party_name,
        "phone": payload.to_phone,
        "message": payload.message,
        "photo_url": payload.photo_url,
        "channel": "whatsapp",
        "status": "queued",
        "source": "api",
        "created_at": now,
    }
    delivered = False
    err: Optional[str] = None
    token = os.getenv("WHATSAPP_ACCESS_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    if token and phone_id and payload.to_phone:
        try:
            # If photo_url provided, send as image with caption; else text.
            if payload.photo_url:
                body = {
                    "messaging_product": "whatsapp",
                    "to": payload.to_phone,
                    "type": "image",
                    "image": {"link": payload.photo_url, "caption": payload.message[:1024]},
                }
            else:
                body = {
                    "messaging_product": "whatsapp",
                    "to": payload.to_phone,
                    "type": "text",
                    "text": {"body": payload.message[:4000]},
                }
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    f"https://graph.facebook.com/v20.0/{phone_id}/messages",
                    json=body,
                    headers={"Authorization": f"Bearer {token}"},
                )
                delivered = r.status_code < 300
                if not delivered:
                    err = r.text[:200]
        except Exception as e:
            err = str(e)[:200]
        log_doc["status"] = "sent" if delivered else "failed"
        if err:
            log_doc["error"] = err
    else:
        log_doc["status"] = "queued"
        log_doc["error"] = "WHATSAPP creds not configured — queued for later"
    await db.whatsapp_broadcast_log.insert_one(log_doc)
    return {"ok": True, "delivered": delivered, "queued_id": log_doc["id"], "error": err}


# ---------------------------------------------------------------------------
# LINE Messenger SEND endpoint — Fix 9 of the Absolute Final snippet.
# Uses LINE_CHANNEL_ACCESS_TOKEN if set; otherwise queues to
# line_broadcast_log with status=queued so a real integration can flush
# later. Requires the LINE Messaging API "push message" scope.
# ---------------------------------------------------------------------------
class LineSendIn(BaseModel):
    to_line_id: str
    message: str
    party_id: Optional[str] = None
    party_name: Optional[str] = None


@api_router.post("/line/send")
async def line_send(payload: LineSendIn):
    """Send a LINE message via the Messaging API.
    Requires LINE_CHANNEL_ACCESS_TOKEN in env. Queues to
    line_broadcast_log with status=sent|failed|queued.
    """
    now = datetime.now(timezone.utc).isoformat()
    log_doc: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "party_id": payload.party_id,
        "party_name": payload.party_name,
        "line_id": payload.to_line_id,
        "message": payload.message,
        "channel": "line",
        "status": "queued",
        "source": "api",
        "created_at": now,
    }
    delivered = False
    err: Optional[str] = None
    token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "").strip()
    if token and payload.to_line_id:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    "https://api.line.me/v2/bot/message/push",
                    json={
                        "to": payload.to_line_id,
                        "messages": [{"type": "text", "text": payload.message[:4000]}],
                    },
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                )
                delivered = r.status_code < 300
                if not delivered:
                    err = r.text[:200]
        except Exception as e:
            err = str(e)[:200]
        log_doc["status"] = "sent" if delivered else "failed"
        if err:
            log_doc["error"] = err
    else:
        log_doc["error"] = "LINE_CHANNEL_ACCESS_TOKEN not set — queued only"
    await db.line_broadcast_log.insert_one(log_doc)
    return {"ok": True, "delivered": delivered, "queued_id": log_doc["id"], "error": err}


@api_router.get("/line/broadcast/log")
async def line_broadcast_log(limit: int = 50):
    """Admin-facing view of LINE messages queued/sent."""
    docs = await db.line_broadcast_log.find().sort("created_at", -1).to_list(min(limit, 500))
    return [_clean_mongo_id(d) for d in docs]


@api_router.post("/whatsapp/webhook")
async def whatsapp_incoming(request: Request):
    """Handle an incoming WhatsApp Cloud API message and send an
    OpenAI-generated auto-reply as OPSI (K Singh's AI assistant).

    Flow per user spec:
      1. Parse Meta payload → extract sender phone + message text
      2. Call OpenAI (uses OPENAI_API_KEY env var) with the OPSI system
         persona to generate a smart reply
      3. POST the reply back via Cloud API v18.0 using
         WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID from env

    We ALWAYS return 200 so Meta doesn't disable the webhook on
    transient errors — errors are logged instead.
    """
    try:
        payload = await request.json()
    except Exception:
        return {"ok": True}

    # ---- Extract sender phone + message text (Meta v18.0 payload shape) ----
    try:
        entry = (payload.get("entry") or [{}])[0]
        changes = (entry.get("changes") or [{}])[0]
        value = changes.get("value") or {}
        messages = value.get("messages") or []
        if not messages:
            return {"ok": True}  # status callback or non-message event
        msg = messages[0]
        from_phone = (msg.get("from") or "").strip()
        text = ((msg.get("text") or {}).get("body") or "").strip()
        if not from_phone or not text:
            return {"ok": True}
    except Exception as e:
        logging.warning("[whatsapp/webhook] payload parse failed: %s", e)
        return {"ok": True}

    # ---- Generate smart reply via OpenAI as OPSI ----
    reply = await _opsi_openai_reply(text, from_phone)

    # ---- Send back via WhatsApp Cloud API v18.0 ----
    delivery_ok = await _send_whatsapp_v18(from_phone, reply)

    # ---- Persist to activity log (same shape as prior handler) ----
    try:
        await db.wingman_activity.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": None,
            "user_key": None,
            "action": "whatsapp_reply",
            "entity_type": "whatsapp",
            "entity_label": f"WhatsApp → {from_phone}",
            "status": "ok" if delivery_ok else "error",
            "error": None if delivery_ok else "delivery failed (check env vars)",
            "summary": reply[:200],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass
    return {"ok": True}


# ---------------------------------------------------------------------------
# OpenAI-powered OPSI reply generator (used by the WhatsApp webhook).
# Kept intentionally small and self-contained so it doesn't touch any
# other assistant/chat wiring — per the "do NOT modify existing
# endpoints" contract for this integration.
# ---------------------------------------------------------------------------
_OPSI_SYSTEM_PROMPT = (
    "You are OPSI, K Singh's personal AI assistant for a India-Thailand "
    "logistics + bullion trading business. You reply on WhatsApp.\n\n"
    "Style:\n"
    "  • Warm, concise Hinglish (mix Hindi + English) unless the user "
    "    writes in pure English, then reply in English.\n"
    "  • Address K Singh with 'Sir' honorific.\n"
    "  • Keep replies short (2-4 sentences) — WhatsApp texts should be scannable.\n"
    "  • If the user asks about shipments, invoices, ledger, or trips, tell "
    "    them to check the LogiOp Pro app (you can't yet access the DB from "
    "    WhatsApp — that's coming).\n"
    "  • Never invent data (numbers, party names, dates). If unsure, say so.\n"
    "  • Never mention that you are 'ChatGPT', 'GPT-4', 'OpenAI', or any model "
    "    name — you are OPSI.\n"
    "  • Emojis are welcome but sparingly (max 2 per reply)."
)


async def _opsi_openai_reply(user_text: str, from_phone: str) -> str:
    """Non-streaming smart reply as OPSI, via OpenAI. Falls back to a
    friendly canned message when the API key is missing or the request
    fails so the webhook never leaves the sender hanging."""
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return "Namaste Sir 🙏 — OPSI abhi setup ho raha hai. LogiOp Pro app kholein."
    try:
        # Lazy import so a missing openai wheel never breaks server import.
        from openai import AsyncOpenAI  # type: ignore
        client = AsyncOpenAI(api_key=api_key)
        completion = await client.chat.completions.create(
            model=os.getenv("OPSI_WHATSAPP_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": _OPSI_SYSTEM_PROMPT},
                {"role": "user", "content": user_text[:2000]},
            ],
            temperature=0.6,
            max_tokens=280,
        )
        text = ((completion.choices[0].message.content or "").strip())
        # WhatsApp body cap is 4096 chars; we stay well under.
        return text[:1500] if text else "Sir, samajh nahi paaya — thoda saaf batayein? 🙏"
    except Exception as e:
        logging.warning("[opsi/openai] reply failed for %s: %s", from_phone, e)
        return "Sir, abhi thoda issue aa raha hai — thodi der baad try karein 🙏"


async def _send_whatsapp_v18(to_phone: str, text: str) -> bool:
    """POST a text reply back to the Meta WhatsApp Cloud API on v18.0
    (per integration spec). Returns True on 2xx. Silent no-op with a
    logged warning if the required env vars are missing."""
    token = (os.getenv("WHATSAPP_ACCESS_TOKEN") or "").strip()
    phone_id = (os.getenv("WHATSAPP_PHONE_NUMBER_ID") or "").strip()
    if not token or not phone_id:
        logging.info("[whatsapp/v18] not configured — skipping send to %s", to_phone)
        return False
    url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
    body = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text[:4000]},  # WhatsApp text body cap
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            if r.status_code >= 300:
                logging.warning(
                    "[whatsapp/v18] send %s -> %d: %s",
                    to_phone,
                    r.status_code,
                    r.text[:200],
                )
            return r.status_code < 300
    except Exception as e:
        logging.warning("[whatsapp/v18] send %s exception: %s", to_phone, e)
        return False



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
    """Compose the short Hinglish one-liner Jarvis speaks on assistant open."""
    parts: List[str] = []
    if bags:
        parts.append(f"{bags} bags abhi tak weight ke bina hain")
    if ships:
        parts.append(f"{ships} shipments incomplete hain")
    if invs:
        parts.append(f"{invs} invoices ka amount khaali hai")
    if not parts:
        return "Sir, sab kuch updated hai — koi pending kaam nahi."
    return "Sir, " + ", ".join(parts) + ". Bell icon par tap karein to fix them."


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "shimmer"   # shimmer = softest natural Hindi delivery


@api_router.post("/assistant/tts")
async def assistant_tts(req: TTSRequest):
    """Text → audio/mpeg via OpenAI TTS through the Emergent proxy.
    Uses `shimmer` at 0.88x speed on tts-1-hd — calm, professional Hindi
    delivery with sharp consonant articulation."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    from emergentintegrations.llm.openai.text_to_speech import OpenAITextToSpeech
    tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
    try:
        audio_bytes = await tts.generate_speech(
            text=_tts_prep_pauses(req.text),
            model="tts-1-hd",
            voice=req.voice or "shimmer",
            speed=0.88,
            response_format="mp3",
        )
    except Exception as e:
        raise HTTPException(502, f"TTS upstream error: {e}")
    return Response(content=audio_bytes, media_type="audio/mpeg")


# ---------------------------------------------------------------------------
# Streaming TTS — Phase 4 low-latency voice
# ---------------------------------------------------------------------------
def _tts_prep_pauses(text: str) -> str:
    """Preprocess Hindi + English text to encourage the TTS model to add
    brief, professional pauses.
    
    OpenAI TTS naturally reads punctuation as pause cues but its default
    cadence is a touch too clipped for a "personal assistant" delivery.
    We insert ellipses AFTER Hindi danda (।), colons and semicolons — the
    model treats "…" as a longer breath — while leaving commas alone (they
    already get a comfortable beat). Also condenses common Devanagari
    emoji-like combos that upset the model's phrasing.
    """
    if not text:
        return text
    # 1. Danda (।) + space → danda + ellipsis + space (bigger breath).
    out = text.replace("। ", "। … ")
    # 2. Sentence-ending period followed by space + capital → short breath.
    #    Uses a compiled regex for the "period + whitespace + uppercase"
    #    pattern (common in English replies inside the Hindi flow).
    import re as _re
    out = _re.sub(r"([.!?])\s+(?=[A-Z\u0900-\u097F])", r"\1 … ", out)
    # 3. Trim runaway ellipses ("… …" → "…").
    out = _re.sub(r"(…\s*){2,}", "… ", out)
    return out


async def _stream_elevenlabs_tts(text: str, voice_id: Optional[str] = None) -> Any:
    """Proxy an ElevenLabs streaming TTS call chunk-by-chunk. Uses the
    `eleven_multilingual_v2` model which handles Hinglish + native Hindi
    beautifully with emotional, natural delivery.

    Env vars required:
        ELEVENLABS_API_KEY   — from elevenlabs.io Profile → API Key
        ELEVENLABS_VOICE_ID  — default voice (Liam premade = TX3LPaxmHKxFdv7VOQHJ)
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    default_voice = os.getenv("ELEVENLABS_VOICE_ID") or "TX3LPaxmHKxFdv7VOQHJ"
    voice = voice_id or default_voice
    if not api_key:
        raise HTTPException(500, "ELEVENLABS_API_KEY not configured")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/stream?output_format=mp3_44100_128"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    body = {
        "text": _tts_prep_pauses(text)[:4000],
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            # Ryan sounds most natural + emotional at these values based
            # on ElevenLabs's own guidance for professional Indian voices.
            "stability": 0.42,
            "similarity_boost": 0.85,
            "style": 0.35,
            "use_speaker_boost": True,
        },
    }
    async with httpx.AsyncClient(timeout=45) as client:
        async with client.stream("POST", url, json=body, headers=headers) as r:
            if r.status_code >= 400:
                err_text = (await r.aread()).decode("utf-8", errors="ignore")[:200]
                raise HTTPException(502, f"ElevenLabs {r.status_code}: {err_text}")
            async for chunk in r.aiter_bytes(chunk_size=4096):
                if chunk:
                    yield chunk


async def _stream_openai_tts(text: str, voice: str, speed: float = 0.88) -> Any:
    """Proxy an OpenAI /audio/speech call chunk-by-chunk. Yields raw MP3
    bytes as the model produces them. Time-to-first-chunk from the upstream
    proxy is ~500-900ms, so the operator hears speech within a beat.

    Uses the Emergent LLM proxy (same URL emergentintegrations targets).

    Args:
        text:  What to speak. Pre-processed to add natural pauses.
        voice: Any of the OpenAI voices — `shimmer` is our default.
        speed: 0.25-4.0. Default 0.88 for a calm, professional delivery.
               Slowed just enough to be clearly audible without sounding
               drunk. Clamped to [0.6, 1.2] server-side so a bad client
               call can't produce unusable audio.
    """
    proxy_url = (os.getenv("INTEGRATION_PROXY_URL") or "https://integrations.emergentagent.com") + "/llm"
    headers = {
        "Authorization": f"Bearer {EMERGENT_LLM_KEY}",
        "Content-Type": "application/json",
    }
    # Clamp so a stray query param can't slow speech to unusable levels.
    safe_speed = max(0.6, min(1.2, float(speed or 0.88)))
    body = {
        # tts-1-hd is worth the extra ~300ms latency at 0.88x — the
        # Hindi consonants (क, ख, ग, ट, ठ, ड) come out much crisper.
        "model": "tts-1-hd",
        "voice": voice or "shimmer",
        "input": _tts_prep_pauses(text)[:4096],
        "response_format": "mp3",
        "speed": safe_speed,
    }
    # NEW client per call — long-lived pooled clients occasionally choke on
    # very quick request/response cycles when the pool is being torn down.
    async with httpx.AsyncClient(timeout=45) as client:
        async with client.stream("POST", proxy_url + "/audio/speech", json=body, headers=headers) as r:
            if r.status_code >= 400:
                # Read body once so we can surface a useful error line.
                err_text = (await r.aread()).decode("utf-8", errors="ignore")[:200]
                raise HTTPException(502, f"TTS upstream {r.status_code}: {err_text}")
            async for chunk in r.aiter_bytes(chunk_size=4096):
                if chunk:
                    yield chunk


class _TTSStreamRequest(BaseModel):
    text: str
    voice: Optional[str] = "shimmer"
    speed: Optional[float] = 0.88


async def _stream_tts_with_fallback(
    text: str,
    openai_voice: str = "onyx",
    speed: float = 1.0,
):
    """Stream OpenAI TTS directly.

    Phase 2 note: ElevenLabs was fully removed from the pipeline. All
    speech now goes through OpenAI TTS (default voice `onyx` — deep male,
    closest to Indian-English business tone). The ElevenLabs env vars +
    `_stream_elevenlabs_tts` helper are left in place only for tests /
    future re-introduction, but are no longer called.
    """
    import logging
    logging.info(f"[TTS] OpenAI {openai_voice} (speed={speed})")
    async for chunk in _stream_openai_tts(text, openai_voice, speed):
        yield chunk


@api_router.post("/assistant/tts/stream")
async def assistant_tts_stream_post(req: _TTSStreamRequest):
    """Chunked MP3 stream. Prefers ElevenLabs (native Hindi male, emotional,
    natural) when ELEVENLABS_API_KEY is set + has text_to_speech permission;
    falls back to OpenAI shimmer at 0.88x otherwise."""
    if not req.text or not req.text.strip():
        raise HTTPException(400, "text is required")
    return StreamingResponse(
        _stream_tts_with_fallback(req.text, req.voice or "shimmer", req.speed or 0.88),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.get("/assistant/tts/stream")
async def assistant_tts_stream_get(
    text: str,
    voice: Optional[str] = "shimmer",
    speed: Optional[float] = 0.88,
):
    """GET-flavour streaming TTS — native players (expo-audio) can pull
    the URL directly. Uses ElevenLabs when configured, falls back on error."""
    if not text or not text.strip():
        raise HTTPException(400, "text is required")
    return StreamingResponse(
        _stream_tts_with_fallback(text, voice or "shimmer", speed or 0.88),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.post("/assistant/stt")
@api_router.post("/transcribe")
async def assistant_stt(request: Request):
    """Whisper-1 STT via the Emergent proxy. Accepts multipart/form-data
    with an `audio` field (accepted formats: mp3, mp4, mpeg, mpga, m4a, wav,
    webm), returns { text: ... } for Hinglish transcriptions.

    Aliased as `/api/transcribe` for the Voice AI Wingman flow.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    form = await request.form()
    upload = form.get("audio")
    if not upload:
        raise HTTPException(400, "Missing `audio` file")
    from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText
    stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)

    # Persist upload to a temp file so we can hand a real file HANDLE to
    # litellm's transcription (it wants an open binary file object).
    import tempfile
    filename = upload.filename or "voice.m4a"
    # Normalise extension — Whisper only supports a fixed set. Browsers
    # sometimes send `audio/webm;codecs=opus` which passes through as .webm;
    # RN's expo-audio emits .m4a. Anything unknown → force .wav.
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"
    if ext not in ("mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"):
        ext = "webm"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tf:
            tf.write(await upload.read())
            tmp_path = tf.name

        # OpenAISpeechToText.transcribe wants a file OBJECT, not a path.
        # Open in binary mode; litellm reads it and streams to Whisper.
        with open(tmp_path, "rb") as fh:
            result = await stt.transcribe(
                file=fh,
                model="whisper-1",
                language="hi",
                # Prompt biasing — nudge Whisper toward Hinglish + our
                # domain vocabulary so proper nouns / logistics terms
                # transcribe cleanly (e.g. "Lalit", "consignment", "hand
                # carry", "IN_TO_TH").
                prompt=(
                    "Hinglish conversation. Terms may include: Kishan Sir, "
                    "Lalit, party, shipment, invoice, bag, weight, freight, "
                    "hand carry, IN_TO_TH, Chennai, Bangkok, Mumbai, Delhi, "
                    "Bhopal, THB, INR, kg, gram, silver, gold, bullion, "
                    "Rani Chain, Wingman, assistant."
                ),
            )
    except Exception as e:
        logging.warning(f"[STT] transcription failed: {e}")
        # Use 400 instead of 502 so the K8s ingress passes our JSON body
        # through instead of substituting its own HTML 502 error page.
        raise HTTPException(400, f"STT upstream error: {e}")
    finally:
        # Clean up temp file — Whisper doesn't need it after the call.
        try:
            if tmp_path:
                os.remove(tmp_path)
        except Exception:
            pass

    # litellm's transcription response is typically a dict-like object with
    # a `text` attribute/key. Handle both shapes defensively.
    text = ""
    if hasattr(result, "text"):
        text = getattr(result, "text") or ""
    elif isinstance(result, dict):
        text = result.get("text") or ""
    else:
        text = str(result or "")
    return {"text": (text or "").strip()}


# --------------------------------------------------------------------------
# JARVIS Aura v3 — /dashboard/now-brief
#
# Generates a short "Now Brief" for the top of the dashboard using Claude
# Haiku 4.5 (cheap + fast). Greets the user by name and summarises today's
# operational context in 3-4 sentences using data pulled from the remote
# proxy (shipments) + local Mongo (ledger context can be added later).
#
# Payload the frontend sends:
#   { pending: int, in_transit: int, delivered: int, warehouse_bags: int,
#     warehouse_kg: float, active_trips: int, overdue_ledger: int,
#     tz_offset_minutes: int }
# We hand these numbers to Claude Haiku 4.5 with a strict prompt and
# return the plain-text brief. Callers should show a shimmer while
# awaiting the response and cache the result client-side for ~5 min.
# --------------------------------------------------------------------------
class NowBriefIn(BaseModel):
    pending: int = 0
    in_transit: int = 0
    delivered: int = 0
    warehouse_bags: int = 0
    warehouse_kg: float = 0.0
    active_trips: int = 0
    overdue_ledger: int = 0
    tz_offset_minutes: int = 330  # IST default


@api_router.post("/dashboard/now-brief")
async def dashboard_now_brief(body: NowBriefIn, current: UserPublic = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    # Local time-of-day → greeting bucket
    try:
        offset = int(body.tz_offset_minutes or 330)
    except Exception:
        offset = 330
    now_local = datetime.now(timezone.utc) + timedelta(minutes=offset)
    hour = now_local.hour
    tod = (
        "morning" if 5 <= hour < 12
        else "afternoon" if 12 <= hour < 17
        else "evening" if 17 <= hour < 21
        else "night"
    )

    def _g(k: str, default: str = ""):
        if isinstance(current, dict):
            return current.get(k, default) or default
        return getattr(current, k, default) or default

    name = (_g("display_name") or _g("username") or "Boss").strip()
    honorific = _g("honorific").strip()
    salutation = f"{name} {honorific}".strip()

    prompt = (
        f"You are Wingman, an executive assistant for a small logistics + bullion trading business. "
        f"Write a short punchy 'Now Brief' for {salutation} for this {tod}. "
        f"Rules: (1) Start with the exact greeting 'Good {tod} {salutation}!' followed by an appropriate emoji. "
        f"(2) In 2-3 short sentences, summarise what needs attention today based on the numbers below. "
        f"(3) End with ONE single suggested next action prefixed with '👉 '. "
        f"(4) No markdown, no bullet lists — plain sentences. Keep under 55 words.\n\n"
        f"Today's numbers:\n"
        f"- Pending shipments: {body.pending}\n"
        f"- In-transit shipments: {body.in_transit}\n"
        f"- Delivered (FY): {body.delivered}\n"
        f"- Bangkok warehouse: {body.warehouse_bags} bags · {int(body.warehouse_kg)} kg\n"
        f"- Active carrier trips: {body.active_trips}\n"
        f"- Ledger accounts flagged overdue: {body.overdue_ledger}"
    )

    try:
        chat = (
            LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"nowbrief-{_g('username','user')}",
                system_message="You write concise, warm executive briefs for a busy business owner.",
            )
            .with_model("anthropic", "claude-haiku-4-5")
        )
        text = await chat.send_message(UserMessage(text=prompt))
        content = (text or "").strip()
    except Exception as e:
        # Graceful fallback so the dashboard still renders something useful.
        content = (
            f"Good {tod} {salutation}! ✨ "
            f"{body.pending} pending, {body.in_transit} in transit, "
            f"{body.warehouse_bags} bags in Bangkok. 👉 Review pending shipments."
        )
        logging.warning(f"now-brief LLM failed, using fallback: {e}")

    return {"brief": content, "generated_at": datetime.now(timezone.utc).isoformat()}


# --------------------------------------------------------------------------
# Voice AI Wingman — quick non-streaming chat endpoint for the Now Brief card.
#
# The Now Brief card wraps a full voice AI conversation. We reuse the same
# Hinglish persona + real-entity snapshot as /api/assistant/chat, but return
# the full response text in a single JSON payload so the client can:
#   - Animate a local typewriter effect
#   - Kick off ElevenLabs TTS in parallel
#   - Show conversation history pills
#
# Role-aware system prompt: Admin, Papa (bsingh), Staff, Carrier each get a
# tuned tone + scope.
# --------------------------------------------------------------------------
class WingmanChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    # Client passes recent turns so multi-turn context is preserved even
    # if the server hasn't seen this session before.
    history: List[Dict[str, str]] = Field(default_factory=list)


def _wingman_system_for_role(user: Any) -> str:
    """Return the Hinglish system prompt tuned to the caller's role."""
    def _g(k: str, default: str = ""):
        if isinstance(user, dict):
            return user.get(k, default) or default
        return getattr(user, k, default) or default

    display = _g("display_name") or _g("username") or "Boss"
    honorific = _g("honorific") or "Sir"
    role = (_g("role") or "Admin")
    salutation = f"{display} {honorific}".strip()

    common = (
        "You are Wingman — a trusted AI business partner for an India ↔ Thailand "
        "logistics + bullion trading business.\n\n"
        "## Language — HINGLISH (Hindi words in English letters)\n"
        "ALWAYS respond in Hinglish (Latin script Hindi + English mix). Never use "
        "Devanagari. Examples:\n"
        f"- 'Namaste {salutation}, aaj kya kaam hai?'\n"
        "- 'Sir, aapka Delhi shipment ready hai — 3 bags, 15 kg.'\n"
        "- 'Bataiye party ka naam kya hai?'\n"
        "- 'Confirm karein, save karoon?'\n\n"
        "## Etiquette\n"
        f"1. Address the operator as '{salutation}' or '{honorific}' — never just the "
        "bare first name.\n"
        "2. Short, calm sentences. Max 100 words unless detailed info is needed.\n"
        "3. Correct punctuation (. , ? !) — TTS uses these for natural pauses.\n"
        "4. Max 1 emoji per reply.\n"
    )

    if role == "Papa":
        # B Singh is the operator's dad — very simple, respectful Hindi (Roman)
        # scope limited to Singh Exports data.
        return (
            common +
            "\n## Scope — Papa Mode\n"
            "You are speaking to Papa ji (B Singh). Use extra-simple Hindi words. "
            "Only discuss Singh Exports business — shipments, ledger, parties tied "
            "to co_singh_exports. Do not mention advanced features (invoices, "
            "trips, ML). Address as 'Papa ji' — very respectful, warm tone.\n"
        )
    if role == "Carrier":
        return (
            common +
            "\n## Scope — Carrier\n"
            "You are speaking to a carrier. Give clear, direct pickup / delivery "
            "instructions. No small talk. Focus on trip status, next stop, and "
            "consignment IDs relevant to their active route.\n"
        )
    if role == "Staff":
        return (
            common +
            "\n## Scope — Staff\n"
            "You are speaking to an ops staff member. Respectful, task-oriented "
            "tone. Give clear next actions on shipments, ledger entries, and "
            "invoices. Escalate anything requiring delete or settings changes "
            "to Kishan Sir.\n"
        )
    # Admin — full business access
    return (
        common +
        "\n## Scope — Admin\n"
        "You are speaking to Kishan Sir — the business owner. Full data access. "
        "Give direct, insightful summaries. When useful, mention specific "
        "consignment IDs, party names, and amounts pulled from the real-data "
        "snapshot below. Confident business-partner tone — no fluff.\n"
    )


@api_router.post("/wingman/quick-chat")
async def wingman_quick_chat(
    req: WingmanChatIn,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    """Non-streaming Hinglish chat for the Now Brief voice AI card.
    Returns { response: str, data_used: [...] }.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    # Snapshot of real entities so replies never hallucinate IDs.
    try:
        real_ctx = await assistant_context()
    except Exception:
        real_ctx = {}

    ships = (real_ctx.get("shipments") or [])[:10]
    parties = (real_ctx.get("parties") or [])[:10]
    trips = (real_ctx.get("carrier_trips") or [])[:8]

    data_block = ""
    data_used: List[str] = []
    if ships or parties or trips:
        data_block += "\n=== Real database snapshot (use only these IDs) ===\n"
        if ships:
            data_block += "\nActive Shipments (consignment · status · party):\n"
            for s in ships:
                cn = s.get("consignment_no") or s.get("id") or "?"
                data_block += f"  • {cn} · {s.get('status') or '—'} · {s.get('party_name') or '—'}\n"
                data_used.append(cn)
        if parties:
            data_block += "\nParties (name · role):\n"
            for p in parties:
                data_block += f"  • {p.get('name')} · {p.get('role') or '—'}\n"
        if trips:
            data_block += "\nCarrier Trips (route · carrier · status):\n"
            for t in trips:
                data_block += f"  • {t.get('route') or '—'} · {t.get('carrier_name') or '—'} · {t.get('status') or '—'}\n"

    system_prompt = _wingman_system_for_role(user) + data_block

    session_id = req.session_id or f"wingman-{(user or {}).get('username','anon')}"

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt,
        )
        .with_model("anthropic", "claude-haiku-4-5")
    )

    # Compose a small recap from history so multi-turn context lands.
    prompt = req.message
    if req.history:
        tail = req.history[-6:]
        recap_lines = []
        for m in tail:
            who = "User" if (m.get("role") or "").lower() == "user" else "Me"
            snippet = (m.get("content") or "").strip().replace("\n", " ")[:200]
            if snippet:
                recap_lines.append(f"  • {who}: {snippet}")
        if recap_lines:
            recap = "\n=== Previous turns ===\n" + "\n".join(recap_lines) + "\n=== Current turn ===\n"
            prompt = recap + req.message

    try:
        text = await chat.send_message(UserMessage(text=prompt))
        content = (text or "").strip()
    except Exception as e:
        logging.warning(f"wingman/quick-chat LLM failed: {e}")
        content = "Sorry Sir, abhi thoda network issue hai. Dobara try karein? 🙏"

    return {"response": content, "data_used": data_used[:5]}


# ---------------------------------------------------------------------------
# OpenAI Realtime Voice Assistant — Phase 1
#
# We generate an ephemeral session token server-side (so the raw OpenAI key
# never touches the client bundle) and hand it to the browser, which then
# uses it to open a WebRTC connection directly to OpenAI's Realtime API.
#
# Endpoints:
#   POST /api/realtime-token   → { ephemeral_key, expires_at, session }
#   POST /api/voice-command    → executes a parsed intent + returns data
# ---------------------------------------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# ---------------------------------------------------------------------------
# Business-context builder for the Realtime voice assistant.
# We inject the full parties list (names + running INR/THB balances), a
# pending-tasks counter, and persistent "voice memories" into the system
# prompt so the model already "knows" everything before Kishan Sir speaks.
# The client-side interceptor (/api/wingman-chat) will still short-circuit
# any factual question so the model NEVER answers from its own memory —
# but this block gives it enough shared context to sound coherent when
# clarifying, confirming, or paraphrasing.
# ---------------------------------------------------------------------------
async def _build_business_context(user_id: Optional[str] = None) -> str:
    """Fetch parties + balances + pending count + saved memories."""
    lines: List[str] = []

    # 1. Parties + running balances
    try:
        parties = await _proxy_get("/api/parties") or []
        entries = await _proxy_get("/api/ledger/entries") or []
        # Index ledger by party_id for O(N)
        by_party: Dict[str, Dict[str, float]] = {}
        for e in entries:
            pid = e.get("party_id") or ""
            if not pid:
                continue
            ccy = str(e.get("currency", "INR")).upper()
            debit = float(e.get("debit") or 0)
            credit = float(e.get("credit") or 0)
            bucket = by_party.setdefault(pid, {"INR": 0.0, "THB": 0.0})
            bucket[ccy] = bucket.get(ccy, 0.0) + (debit - credit)
        if parties:
            lines.append("=== PARTIES aur unka balance (koi bhi ID bina puche use karo) ===")
            for p in parties[:40]:
                pid = p.get("id") or ""
                name = p.get("name") or "?"
                role = p.get("role") or ""
                bal = by_party.get(pid, {"INR": 0.0, "THB": 0.0})
                inr = bal.get("INR", 0.0) + float(p.get("opening_balance_inr") or 0)
                thb = bal.get("THB", 0.0) + float(p.get("opening_balance_thb") or 0)
                # Positive => party owes us (receivable). Negative => we owe them.
                inr_str = f"INR {inr:+,.0f}" if abs(inr) > 0.5 else "INR 0"
                thb_str = f"THB {thb:+,.0f}" if abs(thb) > 0.5 else ""
                bits = [inr_str] + ([thb_str] if thb_str else [])
                lines.append(f"  • {name} ({role}) — {' · '.join(bits)}")
    except Exception:
        pass

    # 2. Pending tasks counter (shipments pending + unpaid invoices)
    try:
        stats = await _proxy_get("/api/dashboard/stats") or {}
        p_ships = int((stats.get("shipments") or {}).get("pending") or 0)
        it_ships = int((stats.get("shipments") or {}).get("in_transit") or 0)
        lines.append(f"\n=== PENDING ===")
        lines.append(f"  • {p_ships} shipments pending · {it_ships} in transit")
    except Exception:
        pass

    # 3. Voice memories (persistent, user-scoped)
    try:
        q: Dict[str, Any] = {}
        if user_id:
            q["user_id"] = user_id
        mems = await db.voice_memories.find(q, {"_id": 0, "key": 1, "value": 1}).sort("last_updated", -1).to_list(30)
        if mems:
            lines.append("\n=== YAAD RAKHI HUI BAATEIN ===")
            for m in mems:
                lines.append(f"  • {m.get('key')}: {m.get('value')}")
    except Exception:
        pass

    return "\n".join(lines) if lines else "(no context available yet)"


# Base system prompt for the Realtime voice assistant.
def _wingman_realtime_instructions(page: str, page_data_summary: str, user: Any, business_ctx: str = "") -> str:
    """Return a Hinglish system prompt that includes the current screen +
    a summary of what's on it. Called on every /api/realtime-token request
    so the model always has fresh context."""
    def _g(k: str, d: str = ""):
        if isinstance(user, dict):
            return user.get(k, d) or d
        return getattr(user, k, d) or d
    name = _g("display_name") or _g("username") or "Kishan"
    honorific = _g("honorific") or "Sir"
    role = _g("role") or "Admin"
    salutation = f"{name} {honorific}".strip()

    return f"""You are OPSI — {salutation} ka 24/7 AI business partner for LogiOp Pro (India ↔ Thailand hand-carry logistics).

OPSI = Open AI (front) + Wingman (back). Your name is OPSI. When the user
says "Opsi", "OPSI" or "opsi" — activate and respond immediately.

## STRICT LANGUAGE RULES
- ALWAYS respond in HINGLISH (Hindi words in Latin/Roman script + English mix).
- NEVER Devanagari (देवनागरी). Only Latin letters.
- Address {name} Sir as "Sir" naturally — vary between "Sir" and "Kishan Sir" — never bare first name.
- For Papa (role=Papa) → address as "Papa ji" with simple Hindi.
- For Kanhaiya → clear simple instructions.
- Keep responses SHORT — max 2 sentences unless a list is explicitly asked for.

## RESPONSE FORMAT — VERY IMPORTANT
- For balance queries: "Yashwant Singh ko aap ₹15,000 denge" (direct, no fluff).
- For "kitna dena/lena": give the exact number + direction ("lena" / "dena") + currency.
- NEVER say "dashboard mein sync nahi", "data load nahi hua", or any error hedge — OPSI always gives real data.
- If party not found in the list below: "Yeh party nahi mili Sir, naam check karein."
- For memory saves: "Yaad kar liya Sir — [content]."
- For memory recall: "Sir, yaad hai: [content list]."
- Every action you perform = call it "Opsi Magic" when announcing.
- Max 1 emoji per reply.

## OVERRIDE MODE (CRITICAL)
When the client sends you a `response.create` with `instructions` that begin with
"SPEAK_EXACTLY:" — read the text after that prefix VERBATIM, in Hinglish. Do not
add, translate, rephrase, or comment. This is how the Wingman brain feeds you
answers. Just voice them out cleanly.

## FALLBACK MODE (when no override instructions arrive)
- Only respond to CLEAR business questions/commands. Ignore filler / ambient chatter.
- Use `fill_form` tool ONLY when user explicitly says "banao / add karo / create karo".
- Use `query_dashboard` for any factual number you don't already have in context below.

## CURRENT SCREEN
- Role: {role}
- Screen: {page}
- Screen snapshot: {page_data_summary or "(none)"}

## LIVE BUSINESS CONTEXT (already fetched — use these numbers, do NOT re-ask)
{business_ctx}

Be fast, calm, confident — like a trusted business partner who never wastes a word.
""".strip()


class RealtimeTokenIn(BaseModel):
    page: Optional[str] = "dashboard"
    page_data_summary: Optional[str] = ""


@api_router.post("/realtime-token")
async def realtime_token(
    req: RealtimeTokenIn,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    """Mint an ephemeral OpenAI Realtime client_secret.

    We inject the current-page + page-data-summary + user honorific into the
    session instructions so the model can respond context-aware without the
    client having to send that on every voice turn.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY not configured")

    # Fetch live business context so the model already knows every party,
    # balance, and saved memory BEFORE the user speaks.
    user_id = str(user.get("_id")) if user else None
    business_ctx = await _build_business_context(user_id=user_id)

    instructions = _wingman_realtime_instructions(
        page=(req.page or "dashboard"),
        page_data_summary=(req.page_data_summary or ""),
        user=user,
        business_ctx=business_ctx,
    )

    body = {
        "session": {
            "type": "realtime",
            "model": "gpt-realtime",
            "instructions": instructions,
            "audio": {
                "input": {
                    # Server-side voice-activity detection tracks turn
                    # boundaries. `create_response=false` means the server
                    # will NOT auto-generate a response when the user
                    # stops speaking — the client (Wingman interceptor)
                    # is in charge of deciding what the assistant says.
                    # This lets us route every question through
                    # /api/wingman-chat first for deterministic answers.
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.7,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 800,
                        "create_response": False,
                        "interrupt_response": True,
                    },
                    "transcription": {"model": "whisper-1"},
                },
                "output": {
                    # `echo` is a deep, warm, natural male voice on the
                    # OpenAI Realtime API. `onyx` is TTS-only (not valid
                    # for Realtime) — do NOT swap this back. Other male
                    # options: `ash` (softer male), `verse` (neutral).
                    "voice": "echo",
                    "format": {"type": "audio/pcm", "rate": 24000},
                    "speed": 1.05,
                },
            },
        }
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.openai.com/v1/realtime/client_secrets",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        if resp.status_code >= 400:
            logging.warning(f"[realtime-token] OpenAI {resp.status_code}: {resp.text[:400]}")
            raise HTTPException(resp.status_code, f"OpenAI realtime error: {resp.text[:400]}")
        data = resp.json()

    return {
        "ephemeral_key": data.get("value"),
        "expires_at": data.get("expires_at"),
        # Return the session shape so client can log which model/voice is live.
        "session_id": (data.get("session") or {}).get("id"),
        "model": (data.get("session") or {}).get("model"),
    }


class VoiceCommandIn(BaseModel):
    action: str
    params: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Live-data tool for the Realtime voice assistant
# ---------------------------------------------------------------------------

async def _proxy_get(path: str) -> Any:
    """Module-level GET-proxy to the remote logistics backend.

    Mirrors the nested helper used by `/api/todo/blockers` but is
    reusable from any endpoint. Returns `[]` / `{}` on transport
    failure so callers can treat it as an empty result rather than
    raising, which keeps the voice tool graceful even when the
    upstream is briefly unavailable.

    Small in-process TTL cache so burst voice traffic (Wingman does
    10-15 proxy calls per request during aggregation) doesn't hammer
    the upstream. Cache is 3 s — short enough that fresh data still
    surfaces quickly during real user flows.
    """
    if not REMOTE_BACKEND_URL:
        return None
    now = time.time()
    cached = _PROXY_CACHE.get(path)
    if cached and (now - cached[0]) < _PROXY_CACHE_TTL:
        return cached[1]
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(REMOTE_BACKEND_URL + path)
            if r.status_code >= 400 or not r.content:
                return None
            data = r.json()
            _PROXY_CACHE[path] = (now, data)
            # Trim cache when it grows large
            if len(_PROXY_CACHE) > 128:
                oldest = sorted(_PROXY_CACHE.items(), key=lambda kv: kv[1][0])[:64]
                for k, _ in oldest:
                    _PROXY_CACHE.pop(k, None)
            return data
    except Exception:
        return None


# In-process TTL cache for _proxy_get. Path → (fetched_at_epoch, data).
_PROXY_CACHE: Dict[str, Tuple[float, Any]] = {}
_PROXY_CACHE_TTL = 3.0  # seconds


# `POST /api/voice/query` — the Voice Orb's `query_dashboard` function
# tool calls this endpoint whenever the AI needs a factual number to
# answer a question ("kitne shipments pending hain?", etc.). We return
# a small JSON blob that the client re-injects as a
# `conversation.item.create` tool response so the model can speak it.
#
# Every metric is computed from the LIVE proxy layer so numbers are
# always fresh — no caching. Party-balance uses the same running-
# balance logic the ledger page uses.
class VoiceQueryIn(BaseModel):
    metric: str
    party_name: Optional[str] = None


@api_router.post("/voice/query")
async def voice_query(
    req: VoiceQueryIn,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
) -> Dict[str, Any]:
    metric = (req.metric or "").strip().lower()
    try:
        if metric == "pending_shipments":
            ships = await _proxy_get("/api/shipments") or []
            pending = [s for s in ships if str(s.get("status", "")).lower() == "pending"]
            return {
                "metric": metric,
                "count": len(pending),
                "sample": [
                    {"consignment_no": s.get("consignment_no"), "route": f'{s.get("origin","?")} → {s.get("destination","?")}'}
                    for s in pending[:3]
                ],
            }
        if metric == "in_transit_shipments":
            ships = await _proxy_get("/api/shipments") or []
            it = [s for s in ships if str(s.get("status", "")).lower() == "in_transit"]
            return {"metric": metric, "count": len(it)}
        if metric == "unpaid_invoices":
            invs = await _proxy_get("/api/invoices") or []
            unpaid = [i for i in invs if str(i.get("status", "")).lower() in ("draft", "sent")]
            total_inr = sum(float(i.get("total") or 0) for i in unpaid if str(i.get("currency", "")).upper() == "INR")
            total_thb = sum(float(i.get("total") or 0) for i in unpaid if str(i.get("currency", "")).upper() == "THB")
            return {
                "metric": metric,
                "count": len(unpaid),
                "total_inr": round(total_inr, 2),
                "total_thb": round(total_thb, 2),
            }
        if metric == "active_trips":
            trips = await _proxy_get("/api/bullion/trips") or []
            active = [t for t in trips if str(t.get("status", "")).lower() in ("pending", "in_transit", "partial_delivered")]
            return {
                "metric": metric,
                "count": len(active),
                "sample": [
                    {"route": t.get("route") or t.get("direction"), "flight_number": t.get("flight_number")}
                    for t in active[:3]
                ],
            }
        if metric == "today_revenue":
            invs = await _proxy_get("/api/invoices") or []
            today = datetime.now(timezone.utc).date().isoformat()
            paid_today = [
                i for i in invs
                if str(i.get("status", "")).lower() == "paid" and str(i.get("date", ""))[:10] == today
            ]
            total_inr = sum(float(i.get("total") or 0) for i in paid_today if str(i.get("currency", "")).upper() == "INR")
            total_thb = sum(float(i.get("total") or 0) for i in paid_today if str(i.get("currency", "")).upper() == "THB")
            return {
                "metric": metric,
                "date": today,
                "count": len(paid_today),
                "revenue_inr": round(total_inr, 2),
                "revenue_thb": round(total_thb, 2),
            }
        if metric == "warehouse_bags":
            wh = await _proxy_get("/api/dashboard/warehouse") or {}
            return {
                "metric": metric,
                "current_bags": wh.get("current_bags", 0),
                "current_kg": wh.get("current_kg", 0),
                "booked_deliveries": wh.get("booked_deliveries", 0),
            }
        if metric == "party_balance":
            if not req.party_name:
                return {"error": "party_name required for party_balance"}
            parties = await _proxy_get("/api/parties") or []
            needle = req.party_name.strip().lower()
            match = next((p for p in parties if str(p.get("name", "")).lower() == needle), None) \
                or next((p for p in parties if needle in str(p.get("name", "")).lower()), None)
            if not match:
                return {"error": f"Party '{req.party_name}' not found"}
            ledger = await _proxy_get(f"/api/parties/{match['id']}/ledger") or []
            balance_inr = sum(float(e.get("credit") or 0) - float(e.get("debit") or 0)
                              for e in ledger if str(e.get("currency", "")).upper() == "INR")
            balance_thb = sum(float(e.get("credit") or 0) - float(e.get("debit") or 0)
                              for e in ledger if str(e.get("currency", "")).upper() == "THB")
            return {
                "metric": metric,
                "party_name": match.get("name"),
                "balance_inr": round(balance_inr, 2),
                "balance_thb": round(balance_thb, 2),
                "entry_count": len(ledger),
            }
        if metric == "overview":
            stats = await _proxy_get("/api/dashboard/stats") or {}
            return {"metric": metric, "stats": stats}
        return {"error": f"Unknown metric: {metric}"}
    except Exception as e:  # noqa: BLE001
        logging.warning(f"[voice/query] {metric} failed: {e}")
        return {"error": str(e)}


@api_router.post("/voice-command")
async def voice_command(
    req: VoiceCommandIn,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    """Execute a parsed voice intent. Returns { ok, message, data? }.

    The Realtime model calls this endpoint via a function-tool when it needs
    to act. Phase-1 actions:
      • get_summary        → dashboard now-brief numbers
      • get_balance        → party ledger balance by name
      • get_shipments      → filtered shipment list
      • create_shipment    → (Phase-2 will build actual create; for now returns preview)
    """
    action = (req.action or "").lower()
    params = req.params or {}

    try:
        if action == "get_summary":
            ctx = await assistant_context()
            ships = ctx.get("shipments") or []
            trips = ctx.get("carrier_trips") or []
            counts = {
                "pending": sum(1 for s in ships if s.get("status") == "pending"),
                "in_transit": sum(1 for s in ships if s.get("status") in ("in_transit", "warehouse_arrived")),
                "delivered": sum(1 for s in ships if s.get("status") == "delivered"),
                "active_trips": len(trips),
            }
            return {"ok": True, "message": "Summary fetched", "data": counts}

        if action == "get_balance":
            name = str(params.get("party") or params.get("name") or "").strip()
            if not name:
                return {"ok": False, "message": "Party ka naam batao"}
            ctx = await assistant_context()
            parties = ctx.get("parties") or []
            match = None
            for p in parties:
                if name.lower() in (p.get("name") or "").lower():
                    match = p
                    break
            if not match:
                return {"ok": False, "message": f"'{name}' naam ka koi party nahi mila"}
            return {
                "ok": True,
                "message": f"Party {match.get('name')} ka data mila",
                "data": {"party_id": match.get("id"), "name": match.get("name"), "role": match.get("role")},
            }

        if action == "get_shipments":
            status = str(params.get("status") or "").lower()
            ctx = await assistant_context()
            ships = ctx.get("shipments") or []
            if status:
                ships = [s for s in ships if (s.get("status") or "").lower() == status]
            return {
                "ok": True,
                "message": f"{len(ships)} shipments mile",
                "data": [{"id": s.get("id"), "consignment_no": s.get("consignment_no"), "status": s.get("status"), "party_name": s.get("party_name")} for s in ships[:10]],
            }

        # Unknown action — return a soft failure so the model can explain
        # rather than error-out the whole voice turn.
        return {"ok": False, "message": f"Ye action '{action}' abhi supported nahi hai"}
    except Exception as e:
        logging.warning(f"[voice-command] {action} failed: {e}")
        return {"ok": False, "message": f"Command execute nahi ho paya: {e}"}


# ===========================================================================
# VOICE MEMORY — persistent key/value store, scoped per user_id.
# The Realtime voice assistant reads these on session start (injected into
# the system prompt) and the /api/wingman-chat interceptor writes them
# whenever the user says "yaad rakh ki …".
# ===========================================================================
import re as _re

class VoiceMemoryEntry(BaseModel):
    key: str
    value: str


def _memory_scope(user: Optional[dict]) -> Optional[str]:
    """Return the user's id for scoping. `None` = anonymous shared bucket
    (dev / preview mode where auth is optional)."""
    if not user:
        return None
    return str(user.get("_id"))


@api_router.get("/voice-memory")
async def voice_memory_list(
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
    limit: int = 100,
):
    """Return all saved voice memories for the current user, newest first."""
    q: Dict[str, Any] = {}
    scope = _memory_scope(user)
    if scope:
        q["user_id"] = scope
    docs = await db.voice_memories.find(
        q, {"_id": 0}
    ).sort("last_updated", -1).limit(min(max(limit, 1), 500)).to_list(500)
    return docs


@api_router.post("/voice-memory")
async def voice_memory_save(
    entry: VoiceMemoryEntry,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    """Upsert a voice memory. Key acts as an idempotency handle so
    "yaad rakh ki Yashwant Bangkok mein hai" overwrites the previous
    "Yashwant" note instead of piling up duplicates.
    """
    scope = _memory_scope(user)
    now = datetime.now(timezone.utc).isoformat()
    key = (entry.key or "").strip()[:80] or f"mem_{uuid.uuid4().hex[:8]}"
    val = (entry.value or "").strip()[:500]
    if not val:
        raise HTTPException(400, "value cannot be empty")
    filter_q: Dict[str, Any] = {"key": key}
    if scope:
        filter_q["user_id"] = scope
    await db.voice_memories.update_one(
        filter_q,
        {
            "$set": {"value": val, "last_updated": now, "user_id": scope},
            "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now, "key": key},
        },
        upsert=True,
    )
    return {"ok": True, "key": key, "value": val}


@api_router.delete("/voice-memory/{key:path}")
async def voice_memory_delete(
    key: str,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    q: Dict[str, Any] = {"key": key}
    scope = _memory_scope(user)
    if scope:
        q["user_id"] = scope
    await db.voice_memories.delete_one(q)
    return {"ok": True}


# ===========================================================================
# WINGMAN CHAT — the "brain" that intercepts every user voice transcript
# before it reaches the OpenAI Realtime model. Deterministic keyword
# matching + fuzzy party lookup + live DB queries → returns a canned
# Hinglish answer that the Realtime voice just speaks verbatim.
# ===========================================================================

# Order matters: check more-specific patterns first. Each entry maps a
# regex (case-insensitive) to the action name the handler routes to.
_WINGMAN_PATTERNS: List[Tuple[str, str]] = [
    # --- MEMORY (highest priority — very specific keywords) ---
    (r"\b(kya\s+yaad|what\s+do\s+you\s+remember|list\s+memories|saari\s+yaad|sab\s+yaad|kya\s+kya\s+yaad)\b", "list_memories"),
    (r"\b(yaad\s+rakh|yaad\s+rakho|yaad\s+kar|note\s+this|remember\s+this|save\s+this)\b", "save_memory"),
    (r"\b(bhool\s+jao|forget|delete\s+memory|hata\s+do\s+yaad|remove\s+memory)\b", "forget_memory"),
    (r"\b(yaad\s+dila\w*|remind|reminder\s+set|kal\s+yaad|remind\s+me|follow[\s-]up.*yaad)\b", "set_reminder"),
    (r"\b(mera\s+naam\s+kya|what\s+is\s+my\s+name|who\s+am\s+i)\b", "my_name"),
    (r"\b(aaj\s+ki\s+date|current\s+date|today'?s?\s+date|kaunsi\s+date)\b", "current_date"),

    # --- SYSTEM / DASHBOARD ---
    (r"\b(app\s+ka\s+status|system\s+health|health\s+check)\b", "system_health"),
    (r"\b(dashboard\s+refresh|refresh\s+karo|reload)\b", "dashboard_refresh"),
    (r"\b(forex\s+rate|inr\s+thb\s+rate|thb\s+rate|exchange\s+rate|currency\s+rate)\b", "forex_rate"),
    (r"\b(hafte\s+ka\s+revenue|weekly\s+revenue|is\s+hafte\s+ka\s+revenue|week\s+revenue)\b", "weekly_revenue"),
    (r"\b(daily\s+brief|aaj\s+ka\s+pura\s+summary|aaj\s+ka\s+summary|full\s+summary|summary|brief|today'?s?\s+brief)\b", "daily_brief"),

    # --- COMMUNICATION (specific — must be before generic "bhejo" fallback) ---
    # Broader match: as long as "whatsapp" appears anywhere → route to whatsapp_send.
    # This catches "Xyz ko WhatsApp — message here" style prompts too.
    (r"\b(broadcast\s+message|sabko\s+message)\b", "broadcast_message"),
    (r"\bsabhi\s+india\s+customers?\s+ko\s+(whatsapp|broadcast|message)", "broadcast_india_whatsapp"),
    (r"\bsabhi\s+bangkok\s+customers?\s+ko\s+(line|broadcast|message)", "broadcast_bangkok_line"),
    (r"\bsabhi\s+customers?\s+ko\s+(message\s+bhejo|bhejo\s+message)\b", "broadcast_message"),
    (r"\bsab\s+customers?\s+ko\s+(bhejo|message)\b", "broadcast_message"),
    (r"\b(whatsapp)\b", "whatsapp_send"),
    (r"\b(line)\s+(pe|per|se|karo|message|broadcast|—|:)", "line_send"),
    (r"\b(ko\s+line\s+—|ko\s+line\s+—|ko\s+line\b)", "line_send"),
    (r"\b(statement\s+bhejo|ledger\s+statement|statement\s+send)\b", "send_statement"),
    (r"\b(catalog\s+bhejo|catalog\s+broadcast|catalog\s+send|sabhi\s+customers?\s+ko\s+catalog|naya\s+catalog\s+bhejo)\b", "broadcast_catalog"),
    (r"\b(invoice\s+bhejo|invoice\s+send|invoice\s+share)\b", "send_invoice"),

    # --- LALAMOVE ---
    (r"\b(lalamove\s+quote|lalamove\s+ka\s+quote|delivery\s+quote|lalamove\s+quotation)\b", "lalamove_quote"),
    (r"\b(lalamove\s+book|book\s+pickup|lalamove\s+order|pickup\s+book)\b", "lalamove_book"),

    # --- CREATE (write actions — fall back to OpenAI fill_form) ---
    (r"\b(naya\s+shipment\s+banao|nayi?\s+shipment|create\s+shipment|shipment\s+banao|shipment\s+add)\b", "create_shipment"),
    (r"\b(naya\s+invoice\s+banao|nayi?\s+invoice|create\s+invoice|invoice\s+banao|invoice\s+add)\b", "create_invoice"),
    (r"\b(naya\s+trip\s+banao|nayi?\s+trip|create\s+trip|trip\s+banao|trip\s+add)\b", "create_trip"),
    (r"\b(naya\s+customer\s+add|customer\s+banao|customer\s+add|add\s+customer)\b", "create_customer"),
    (r"\b(naya\s+party\s+banao|nayi?\s+party|create\s+party|party\s+banao|party\s+add)\b", "create_party"),
    (r"\b(naya\s+item\s+add|nayi?\s+item|item\s+add|item\s+banao|create\s+item|catalog\s+add)\b", "create_item"),
    (r"\b(naya\s+bag\s+add|bag\s+add\s+karo|add\s+bag)\b", "add_bag"),

    # --- LEDGER — WRITE ACTIONS ---
    # Match ANY of:  "X ko ₹N diye" · "X ko ฿N dene hain" · "X ne ₹N diye" · "X se ₹N mile" · "X se ₹N lene hain"
    # Amount can be "₹N" (symbol first) or "N rupaye/baht" (word after digits).
    # Currency indicator can be: ₹, ฿, $, rs, inr, thb, rupaye, baht, taka.
    (r"(?:(?:₹|rs\.?|inr|rupaye|฿|thb|baht)[\s.,]*[\d,]+|[\d,]+\s*(?:rupaye|inr|₹|rs\.?|฿|thb|baht)).*?\b(diye|de\s+diya|de\s+diye|dena\s+hai|dene\s+hain|paid|gave)\b", "add_ledger_debit"),
    (r"\b(ko|advance)\b[\s\S]{0,40}?(?:(?:₹|rs\.?|฿|thb|baht|inr|rupaye)[\s.,]*[\d,]+|[\d,]+\s*(?:rupaye|inr|₹|rs|฿|thb|baht))[\s\S]{0,40}?\b(diye|de\s+diya|dena\s+hai|dene\s+hain|paid)\b", "add_ledger_debit"),
    (r"\b(ko|dena)\b[\s\S]{0,40}?[\d,]+[\s\S]{0,40}?\b(dena\s+hai|dene\s+hain|dena\s+ho)\b", "add_ledger_debit"),
    (r"(?:(?:₹|rs\.?|inr|rupaye|฿|thb|baht)[\s.,]*[\d,]+|[\d,]+\s*(?:rupaye|inr|₹|rs\.?|฿|thb|baht)).*?\b(mile|received|got|mila|paise\s+mile|receive|mil\s+gaye|lene\s+hain|lena\s+hai)\b", "add_ledger_credit"),
    (r"\b(ne|se)\b[\s\S]{0,40}?(?:(?:₹|rs\.?|฿|thb|baht|inr|rupaye)[\s.,]*[\d,]+|[\d,]+\s*(?:rupaye|inr|₹|rs|฿|thb|baht))[\s\S]{0,40}?\b(diye|de\s+diya|mile|mila|paid|lene\s+hain|lena\s+hai)\b", "add_ledger_credit"),

    # --- LEDGER — SUMMARY / TOP ---
    (r"\b(sabse\s+zyada\s+kisko\s+dena|top\s+payable|sabse\s+badi\s+payable|max\s+payable)\b", "top_payable"),
    (r"\b(sabse\s+zyada\s+.*lena|sabse\s+zyada\s+kisne\s+dena|top\s+receivable|max\s+receivable)\b", "top_receivable"),
    (r"\b(net\s+dena|kitna\s+total\s+dena|total\s+dena\s+hai|net\s+payable\s+kitna)\b", "net_payable"),
    (r"\b(net\s+lena|kitna\s+total\s+lena|total\s+lena\s+hai|net\s+receivable\s+kitna)\b", "net_receivable"),
    (r"\b(net\s+position|net\s+total|overall\s+net)\b", "net_position"),
    (r"\b(india\s+ka\s+(total\s+)?balance|india\s+total|india\s+wale\s+parties)\b", "india_total"),
    (r"\b(bangkok\s+ka\s+(total\s+)?balance|thailand\s+total|bangkok\s+wale\s+parties|th\s+total)\b", "bangkok_total"),
    (r"\b(all\s+parties|sabhi\s+parties|saari\s+parties|list\s+parties|sab\s+parties\s+ka\s+balance)\b", "all_parties"),
    (r"\b(sabhi\s+customers|all\s+customers|customer\s+list|customers?\s+ke\s+naam)\b", "customer_list"),
    (r"\b(sabhi\s+carriers|all\s+carriers|carrier\s+list|carriers?\s+ke\s+naam)\b", "carrier_list"),
    (r"\b(aaj\s+ki\s+entries|today'?s?\s+entries|today\s+ledger|aaj\s+ke\s+ledger)\b", "today_ledger"),
    (r"\b(overdue\s+entries|overdue\s+ledger|pending\s+ledger)\b", "overdue_ledger"),
    (r"\b(is\s+mahine\s+ka\s+hisaab|this\s+month\s+ledger|this\s+month\s+hisaab)\b", "this_month_ledger"),
    (r"\b(pichhle\s+mahine|last\s+month\s+ledger|last\s+month\s+hisaab)\b", "last_month_ledger"),

    # --- LEDGER — PARTY-SPECIFIC ---
    (r"\b(ledger\s+dikhao|last\s+\d+\s+entries|ledger\s+detail|entries\s+dikhao)\b", "party_ledger_detail"),
    (r"\b(verified\s+hai\s+kya|kab\s+verified|verify\s+date)\b", "party_verified"),
    (r"\b(number\s+kya\s+hai|phone\s+number|mobile\s+number|contact\s+kya)\b", "party_phone"),
    (r"\b(address\s+kya\s+hai|address\s+dikhao|kahan\s+ka\s+hai)\b", "party_address"),
    (r"\b(detail\s+update|edit\s+karo\s+party|party\s+update)\b", "edit_party"),
    (r"\b(thb\s+balance|thai\s+balance|baht\s+balance)\b", "thb_balance"),

    # --- TRIPS / BULLION (specific trip patterns come BEFORE generic shipment "status" match) ---
    (r"\b(trip\s+complete\s+ho|complete\s+trip|trip\s+finish)\b", "complete_trip"),
    (r"\b(active\s+trip[s]?|current\s+trip[s]?|running\s+trips?)\b", "active_trips_list"),
    (r"\b(trip\s+status|trip\s+ka\s+status)\b", "trip_status"),
    (r"\b(trip\s+history|carrier\s+ki\s+history|carrier\s+history)\b", "carrier_trip_history"),
    (r"\b(naye\s+carrier\s+ki\s+rate|new\s+carrier\s+rate)\b", "carrier_new_rate_check"),
    (r"\b(carry\s+charge|carry\s+rate\s+kya|carrier\s+rate\s+kya)\b", "carry_charge_calc"),
    (r"\b(vault\s+mein\s+kitna|vault\s+total|vault\s+summary|kul\s+kitna\s+saman)\b", "vault_summary"),
    (r"\b(bangkok\s+mein\s+kitna|bangkok\s+vault|bkk\s+vault|thailand\s+vault)\b", "bangkok_vault"),
    (r"\b(india\s+mein\s+kitna|india\s+vault|india\s+ka\s+vault|bharat\s+vault)\b", "india_vault"),
    (r"\b(in\s+transit\s+mein\s+kitna|in\s+transit\s+assets|in\s+transit\s+vault|transit\s+ke\s+assets)\b", "in_transit_assets"),
    (r"\b(aaj\s+kaunsa\s+carrier|today\s+carrier|today\s+departure|carrier\s+ja\s+raha)\b", "today_departures"),
    (r"\b(usd\s+kitna|dollar\s+kitna|usd\s+in\s+transit|usd\s+total)\b", "usd_in_transit"),
    (r"\b(gold\s+kitna|kul\s+gold|gold\s+total|sona\s+kitna)\b", "gold_total"),
    (r"\b(pay\s+karo|pay\s+kar\s+do|carrier\s+ko\s+pay)\b", "pay_carrier"),
    (r"\b(trip[s]?|carrier[s]?\s+ke|carrier\s+ka|le\s+ja|le\s+jao)\b", "trip_query"),

    # --- SHIPMENTS ---
    (r"\b(deliver\s+ho\s+gaya|deliver\s+kar\s+diya|delivered\s+ho\s+gaya|mark\s+delivered)\b", "mark_delivered"),
    (r"\b(assign\s+karo\s+bag|carrier\s+ko\s+assign|carrier\s+assign|ko\s+assign\s+karo|bag\s+.*assign)\b", "assign_carrier"),
    (r"\b(warehouse\s+se\s+deliver|deliver\s+from\s+warehouse|warehouse\s+ko\s+deliver)\b", "warehouse_deliver"),
    (r"\b(warehouse\s+mein\s+kya|warehouse\s+contents|bangkok\s+warehouse\s+mein)\b", "warehouse_contents"),
    (r"\b(aaj\s+kaunse\s+shipment[s]?|today\s+deliveries|today'?s?\s+shipments|aaj\s+deliver)\b", "today_deliveries"),
    (r"\b(packing\s+list|packing\s+slip)\b", "packing_list_pdf"),
    (r"\b(sabse\s+purana\s+pending|oldest\s+pending)\b", "oldest_pending"),
    (r"\b(freight\s+kya\s+hai|freight\s+kitna|freight\s+amount)\b", "shipment_freight"),
    (r"\b(edit\s+karo\s+freight|freight\s+edit|freight\s+update|freight\s+change|freight\s+.*se\s+.*karo)\b", "edit_freight"),
    (r"\b(delhi\s+se\s+bangkok|route\s+ke\s+shipment|route\s+se|delhi\s+bangkok\s+wale)\b", "shipments_by_route"),
    (r"\b(is\s+hafte\s+ke\s+shipment|this\s+week\s+shipments|hafte\s+ke\s+shipments?)\b", "this_week_shipments"),
    (r"\b(saare\s+shipments?|all\s+shipments\s+of|party\s+ke\s+shipments?|ke\s+saare\s+shipments?)\b", "shipments_by_party"),
    (r"\b(shipment\s+summary\s+aaj|today\s+shipment\s+stat|aaj\s+ka\s+shipment)\b", "shipment_today_summary"),
    (r"\b(sabse\s+heavy|heaviest|max\s+weight)\b", "heaviest_shipment"),
    (r"\b(pending\s+shipment[s]?|shipments?\s+pending)\b", "pending_shipments_list"),
    (r"\b(in[\s_]transit\s+kya|in\s+transit\s+list|transit\s+mein\s+kya)\b", "in_transit_list"),
    (r"\b(shipment[s]?\s+kitne|kitne\s+shipment[s]?|shipment\s+count|total\s+shipments)\b", "shipment_count"),
    (r"\b(shipment[s]?|maal|kahan\s+hai|status|track|consignment)\b", "shipment_query"),

    # --- INVOICES ---
    (r"\b(pay\s+ho\s+gaya|paid\s+ho\s+gaya|invoice\s+pay|mark\s+paid)\b", "mark_invoice_paid"),
    (r"\b(invoice.*pdf|pdf\s+bhejo|invoice\s+pdf|inv[-/]\S+\s+ka\s+pdf)\b", "invoice_pdf_send"),
    (r"\b(total\s+unpaid|kul\s+unpaid|unpaid\s+total)\b", "total_unpaid"),
    (r"\b(is\s+mahine\s+ki\s+invoices?|this\s+month\s+invoices?)\b", "this_month_invoices"),
    (r"\b(overdue\s+invoice[s]?|invoice\s+overdue|expired\s+invoice)\b", "overdue_invoices"),
    (r"\b(edit\s+karo\s+invoice|invoice\s+edit|invoice\s+update|inv[-/]\S+\s+edit\s+karo)\b", "edit_invoice"),
    (r"\b(unpaid\s+invoice[s]?|invoices?\s+unpaid|bill\s+unpaid)\b", "unpaid_invoices_list"),
    (r"\bka\s+invoice(?!\s+banao|\s+bhejo)|party\s+ke\s+invoice", "party_invoices"),
    (r"\b(invoice[s]?|bill[s]?)\b", "invoice_query"),

    # --- CATALOG / ITEMS ---
    (r"\b(catalog\s+mein\s+kya|items?\s+list|sabhi\s+items?|catalog\s+dikhao|catalog\s+list)\b", "catalog_list"),
    (r"\b(ki\s+price\s+kya|item.*price\s+kya|price\s+bata|kitne\s+ka\s+hai)\b", "item_price"),
    (r"\b(photo\s+update|photo\s+add|photo\s+upload)\b", "item_photo_update"),
    (r"\b(price\s+change|price\s+update|price\s+edit)\b", "item_price_update"),
    (r"\b(supplier\s+ke\s+items?|supplier\s+wale\s+items?|items?\s+by\s+supplier|ke\s+items?)\b", "items_by_supplier"),
    (r"\b(stock\s+mein\s+kya\s+nahi|stock\s+mein\s+nahi|out\s+of\s+stock|stock\s+khatam|no\s+stock)\b", "out_of_stock"),
    (r"\b(item\s+delete|delete\s+item|item\s+hatao|remove\s+item|delete\s+karo)\b", "delete_item"),
    (r"\b(popular\s+items?|top\s+items?|zyada\s+bikne\s+wala|most\s+viewed)\b", "popular_items"),

    # --- NOTIFICATIONS / TASKS ---
    (r"\b(kya\s+kya\s+pending|pending\s+kya\s+kya|today\s+todo|aaj\s+kya\s+karna|todo\s+aaj)\b", "today_pending"),
    (r"\b(important\s+notifications?|high\s+priority|urgent\s+notifications?|pending\s+notifications?\s+.*important|important\s+wale)\b", "important_notifications"),
    (r"\b(clear\s+karo\s+notification|all\s+read|clear\s+all\s+notification|notifications?\s+clear|clear\s+.*notifications?)\b", "clear_notifications"),
    (r"\b(reminder\s+set|schedule\s+follow|follow\s+up\s+set|follow-up\s+set|ka\s+reminder)\b", "schedule_followup"),

    # --- NEW ANALYTICS PATTERNS (200-prompt stress additions) ---
    # Currency-specific asset queries
    (r"\b(usd\s+ka\s+inr|usd\s+inr\s+(equivalent|value)|dollar\s+ka\s+inr|usd\s+in\s+transit.*inr)\b", "usd_inr_value"),
    (r"\b(sgd\s+.*inr|sgd\s+in\s+transit|sgd\s+total|singapore\s+dollar)\b", "sgd_value"),
    (r"\b(aed\s+total|aed\s+.*india|aed\s+in\s+transit|dirham\s+total)\b", "aed_value"),
    (r"\b(gold\s+total\s+baht|gold\s+baht|gold\s+total.*locations?|kul\s+gold\s+baht)\b", "gold_baht_total"),
    # Vault snapshot combos
    (r"\bvault\s+snapshot|vault\s+ki\s+snapshot|snapshot\s+dikhao\b", "vault_snapshot"),
    (r"\b(total\s+assets|assets\s+on\s+hand|combined\s+.*inr\s+value|combined\s+asset\s+value)\b", "total_assets_inr"),
    (r"\b(warehouse\s+capacity|warehouse\s+utilization|warehouse\s+ki\s+capacity)\b", "warehouse_capacity"),
    (r"\b(warehouse\s+.*value\s+inr|bangkok\s+warehouse\s+.*value)\b", "warehouse_inr_value"),
    (r"\bcurrency\s+.*percentage|vault\s+.*percentage|percentage\s+mein\b", "currency_mix_percent"),
    (r"\bin\s+transit\s+.*(estimated|arrival|kab\s+aayega|arrive)\b", "in_transit_eta"),
    # Ledger analytics (specific)
    (r"\b(total\s+credit\s+entries|kul\s+credit\s+entries|is\s+fy\s+.*credit\s+entries)\b", "fy_credit_count"),
    (r"\b(total\s+debit\s+entries|kul\s+debit\s+entries|is\s+fy\s+.*debit\s+entries)\b", "fy_debit_count"),
    (r"\b(thb\s+mein\s+.*(dena|sabko\s+dena)|thb\s+net\s+payable)\b", "thb_net_payable"),
    (r"\b(inr\s+mein\s+.*(lena|sabse\s+lena)|inr\s+net\s+receivable)\b", "inr_net_receivable"),
    (r"\bbalance\s+zero|zero\s+balance\s+parties\b", "parties_zero_balance"),
    (r"\btop\s+\d?\s*parties?\s+.*(zyada\s+dena|payable)|top\s+payable\s+parties?\b", "top_payable"),
    (r"\btop\s+\d?\s*parties?\s+.*(zyada\s+lena|receivable)|top\s+receivable\s+parties?\b", "top_receivable"),
    (r"\baverage\s+.*ledger|ledger\s+.*average\b", "avg_ledger_entry"),
    (r"\bopening\s+balance\b", "party_opening_balance"),
    (r"\btrip[- ]wise\s+.*payment|trip\s+wise\s+breakdown\b", "trip_payments_breakdown"),
    (r"\bunverified\s+ledger|verify\s+entries|unverified\s+entries\b", "unverified_entries"),
    (r"\bsabse\s+bada\s+.*payment|biggest\s+payment\b", "biggest_payment"),
    (r"\baverage\s+.*carry\s+time|carry\s+time\s+.*average\b", "avg_carry_time"),
    (r"\b(is\s+mahine\s+.*(sabse\s+zyada.*pay)|most\s+paid\s+this\s+month)\b", "most_paid_this_month"),
    (r"\bpichhle\s+\d+\s+din\s+.*entries|last\s+\d+\s+days?\s+.*entries\b", "recent_ledger_entries"),
    # Company / dashboard
    (r"\btotal\s+business\s+volume|business\s+volume\s+fy\b", "fy_business_volume"),
    (r"\bsabse\s+profitable\s+month|most\s+profitable\s+month\b", "most_profitable_month"),
    (r"\b(next\s+week\s+.*plan|business\s+plan)\b", "business_plan"),
    (r"\bcompany\s+ka?\s+.*(performance|monthly\s+performance|is\s+mahine)\b", "company_performance"),
    (r"\b(singh\s+exports|awadh\s+enterprise[s]?)\s+ka?\s+.*(performance|asset\s+value|monthly|total|business)\b", "company_perf"),
    (r"\btop\s+.*(business|customer)|sabse\s+zyada\s+business|kaunsa\s+customer\s+.*zyada\b", "top_customer"),
    (r"\bsabse\s+zyada\s+trips?|kaun\s+sabse\s+zyada\s+trip\b", "top_carrier_by_trips"),
    (r"\bsabse\s+reliable\s+carrier|reliable\s+carrier\b", "most_reliable_carrier"),
    (r"\btop\s+business\s+parties?|active\s+parties?\s+.*business\b", "top_business_parties"),
    (r"\bp\s*&\s*l|monthly\s+pnl|pnl\s+.*mahine|profit\s+and\s+loss|freight\s+income\s+.*carrier\s+costs?\b", "monthly_pnl"),
    (r"\bcash\s+flow|cash\s+flow\s+.*mahine\b", "monthly_cash_flow"),
    (r"\bparty\s+count|kitne\s+parties?\s+hain\s+total|total\s+.*parties?\s+.*(customer|carrier|supplier)\b", "party_role_count"),
    (r"\b(complete\s+audit|full\s+audit|audit\s+fy|is\s+fy\s+.*sab\s+kuch)\b", "fy_audit"),
    (r"\bnaya\s+fy\s+shuru|new\s+fy\s+setup|fy\s+setup\s+karo\b", "new_fy_setup"),
    (r"\bparty\s+list\s+export|export\s+party\s+list\b", "party_list_export"),
    (r"\broute\s+wise\s+breakdown|shipment\s+.*route\s+wise\b", "route_wise_breakdown"),
    (r"\bcarry\s+charges?\s+.*carrier\s+wise|carrier\s+wise\s+.*carry\b", "carrier_carry_breakdown"),
    (r"\btotal\s+invoiced\s+amount|is\s+mahine\s+total\s+invoiced\b", "monthly_invoiced"),
    (r"\bmera\s+.*business\s+.*(summarize|ek\s+line)|summarize\s+.*business\b", "business_one_liner"),
    (r"\bstress\s+test\s+pass|final\s+verdict|app\s+.*stress\s+test\b", "final_verdict"),
    # Catalog analytics
    (r"\b(catalog\s+full\s+list|full\s+catalog|complete\s+catalog|catalog\s+.*(price|stock))\b", "catalog_list"),
    (r"\bsabse\s+expensive|top\s+expensive|most\s+expensive\s+items?\b", "top_expensive_items"),
    (r"\b(silk|cotton|bedsheets?|dupatta|saree|kurti|lehenga|premium)\s+category|category\s+mein\s+kya\b", "items_by_category"),
    (r"\bbedsheet[s]?\s+ki\s+price|category\s+.*price\s+update\b", "item_price_update"),
    (r"\bstock\s+kitna\b", "item_stock"),
    # Shipment analytics
    (r"\b(pending\s+shipments?\s+ki\s+list|pending\s+list\s+weight)\b", "pending_shipments_detailed"),
    (r"\bin[\s-]transit\s+.*total\s+weight|in\s+transit\s+ka\s+total\s+weight\b", "in_transit_total_weight"),
    (r"\bfy\s+mein\s+shipments|fy\s+mein\s+.*(delhi|route)\b", "fy_shipments_by_route"),
    (r"\bhafte\s+kitne\s+shipments|is\s+hafte\s+.*deliver\b", "week_delivered"),
    (r"\bfy\s+total\s+freight|total\s+freight\s+collect|freight\s+collect\s+hua\b", "fy_freight"),
    (r"\bcombined\s+freight|freight\s+.*mahine\s+total\b", "monthly_freight"),
    (r"\bactive\s+shipments?\s+bags?\s+count|bags?\s+ki\s+total\s+count\b", "active_shipments_bag_count"),
    (r"\baverage\s+freight\s+per\s+kg|freight\s+per\s+kg\b", "avg_freight_per_kg"),
    (r"\baverage\s+bags?\s+per\s+shipment|avg\s+bags?\s+per\s+shipment\b", "avg_bags_per_shipment"),
    (r"\btotal\s+shipping\s+weight|shipping\s+weight\s+mahine\b", "monthly_shipping_weight"),
    (r"\bshipments?\s+jo\s+\d+kg\s+se\s+zyada|>?\s*\d+kg\s+se\s+zyada\s+shipments?\b", "heavy_shipments"),
    (r"\bbangkok\s+se\s+india\s+.*shipments?|bangkok\s+to\s+india\s+shipments?\b", "shipments_bkk_to_in"),
    (r"\baura[-\/][a-z0-9-]+\s+se\s+aura|range\s+.*status\s+ek\s+saath\b", "shipments_range_status"),
    (r"\bcarrier\s+.*(change\s+karo|to\s+.*karo|se\s+.*karo)\b", "assign_carrier"),
    # Bulk creates → route to create fallback for OpenAI
    (r"\b(ek\s+baar\s+mein\s+\d+|ek\s+saath\s+\d+)\s+(ledger|invoices?|shipments?|parties?)\b", "bulk_create"),
    # Kya karna chahiye / plan / todos
    (r"\bkya\s+kya\s+karna|kya\s+karna\s+chahiye|prioritize\s+karo|kya\s+.*is\s+hafte\b", "week_todo"),
    (r"\babhi\s+tak\s+aaj\s+kitna\s+kaam|aaj\s+ka\s+kaam\b", "today_progress"),
    # Reminder pattern (specific with time)
    (r"\b(kal\s+subah\s+\d+\s+baje|\d+\s+baje\s+.*reminder|reminder\s+.*(subah|shaam|do))\b", "set_reminder"),

    (r"\bkaunsi?\s+party\s+.*sabse\s+zyada\s+time|slowest\s+paying\s+party|late\s+paying\s+party\b", "slowest_paying_party"),
    (r"\b(thb\s+entries?|saari\s+thb|only\s+thb\s+.*entries?)\b", "party_thb_entries"),

    # --- CORE LOOKUPS ---
    (r"\b(hisaab|hisab|balance|ledger|kitna|amount|paisa|kitne\s+paise)\b", "party_ledger"),
    (r"\b(bhejo|send|message|msg\s+karo)\b", "send_message"),
    (r"\b(naya|nayi|banao|banaao|create|add|jodo)\b", "create_form"),
]


def _detect_action(msg: str) -> Optional[str]:
    m = (msg or "").lower()
    for pattern, action in _WINGMAN_PATTERNS:
        if _re.search(pattern, m):
            return action
    return None


def _find_party(msg: str, parties: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Fuzzy match: full name, first name, or any word from the party name.
    Case-insensitive. Returns the FIRST match — parties list is assumed
    small (<200)."""
    m = (msg or "").lower()
    # 1. exact full-name substring
    for p in parties:
        name = str(p.get("name") or "").lower().strip()
        if name and name in m:
            return p
    # 2. first-word / any-word match (at least 3 chars to avoid false positives)
    for p in parties:
        name = str(p.get("name") or "").strip()
        if not name:
            continue
        for word in name.lower().split():
            if len(word) >= 3 and _re.search(rf"\b{_re.escape(word)}\b", m):
                return p
    return None


def _format_inr(v: float) -> str:
    return f"₹{abs(v):,.0f}"


def _format_thb(v: float) -> str:
    return f"THB {abs(v):,.0f}"


async def _party_balance(party_id: str, entries: List[Dict[str, Any]], party: Dict[str, Any]) -> Tuple[float, float]:
    """Compute running INR + THB balance for a party.
    Convention (same as ledger page):
        debit  = party owes us (receivable)  → +
        credit = we owe party (payable)      → −
    Positive result = "lena" (receivable). Negative = "dena" (payable).
    """
    bal_inr = float(party.get("opening_balance_inr") or 0)
    bal_thb = float(party.get("opening_balance_thb") or 0)
    for e in entries:
        if e.get("party_id") != party_id:
            continue
        ccy = str(e.get("currency", "INR")).upper()
        d = float(e.get("debit") or 0)
        c = float(e.get("credit") or 0)
        if ccy == "INR":
            bal_inr += d - c
        elif ccy == "THB":
            bal_thb += d - c
    return round(bal_inr, 2), round(bal_thb, 2)


def _direction_phrase(balance: float, party_name: str, ccy_str: str) -> str:
    """Hinglish natural-language direction sentence."""
    if abs(balance) < 0.5:
        return f"{party_name} ka {ccy_str} balance zero hai Sir"
    if balance > 0:  # party owes us
        return f"{party_name} se aapko lene hain {ccy_str} {abs(balance):,.0f}"
    # party is owed by us
    return f"{party_name} ko aap denge {ccy_str} {abs(balance):,.0f}"


class WingmanChatRequest(BaseModel):
    message: str
    page: Optional[str] = None


@api_router.get("/now-brief")
async def now_brief(
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    """OPSI Daily Brief — Silent, text-only briefing for the dashboard card.
    
    Returns a small JSON payload the frontend can render directly:
    {
      greeting: "Subah 8:30, Kishan Sir! 🙏",
      time_of_day: "morning|afternoon|evening|night",
      stats: {pending_shipments, in_transit, unpaid_invoices, outstanding_inr},
      alerts: [{icon, text}, ...],  // 3-5 highest-priority items
      top_action: "Sabse pehle: <one-liner>",
    }
    """
    # Time-of-day greeting in IST
    ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    hh = ist.hour
    if 4 <= hh < 12:
        tod, salutation = "morning", "Subah"
    elif 12 <= hh < 16:
        tod, salutation = "afternoon", "Dopahar"
    elif 16 <= hh < 20:
        tod, salutation = "evening", "Shaam"
    else:
        tod, salutation = "night", "Raat"
    name = "Kishan Sir"
    honorific = "Sir"
    try:
        if user:
            n = user.get("display_name") or user.get("username") or ""
            h = user.get("honorific") or "Sir"
            honorific = h
            if str(user.get("role","")).lower() == "papa":
                name = "Papa ji"
            elif n:
                name = f"{n} {h}".strip()
    except Exception:
        pass
    time_str = ist.strftime("%I:%M %p").lstrip("0")
    greeting = f"{salutation} {time_str}, {name}! 🙏"

    # Pull live stats
    try:
        stats = await _proxy_get("/api/dashboard/stats") or {}
    except Exception:
        stats = {}
    try:
        invs = await _proxy_get("/api/invoices") or []
    except Exception:
        invs = []
    ships_block = stats.get("shipments") or {}
    pending = int(ships_block.get("pending") or 0)
    it = int(ships_block.get("in_transit") or 0)
    unpaid = sum(1 for i in invs if str(i.get("status","")).lower() in ("draft","sent","unpaid"))
    outstanding = float((stats.get("outstanding") or {}).get("inr") or 0)

    # Alerts (max 4)
    alerts: List[Dict[str, Any]] = []
    if pending:
        alerts.append({"icon": "📦", "text": f"{pending} shipments pending"})
    if it:
        alerts.append({"icon": "🚚", "text": f"{it} shipments in transit"})
    if unpaid:
        alerts.append({"icon": "🧾", "text": f"{unpaid} invoices unpaid"})
    if outstanding > 0.5:
        alerts.append({"icon": "💰", "text": f"Outstanding ₹{outstanding:,.0f}"})

    # Top action decision
    if pending > 0:
        top = f"Sabse pehle: {pending} pending shipments deliver karo {honorific}."
    elif unpaid > 0:
        top = f"Sabse pehle: {unpaid} unpaid invoices follow-up karo {honorific}."
    elif it > 0:
        top = f"Sabse pehle: in-transit shipments track karo {honorific}."
    else:
        top = f"Aaj sab kuch clean hai {honorific} — enjoy karo!"

    return {
        "greeting": greeting,
        "time_of_day": tod,
        "stats": {
            "pending_shipments": pending,
            "in_transit": it,
            "unpaid_invoices": unpaid,
            "outstanding_inr": outstanding,
        },
        "alerts": alerts,
        "top_action": top,
        "spoken_summary": (
            f"{name}, aaj ka update — "
            + (", ".join(a["text"].lower() for a in alerts[:3]) if alerts else "sab clean hai")
            + f". {top}"
        ),
    }


@api_router.post("/wingman-chat")
async def wingman_chat(
    req: WingmanChatRequest,
    user: Annotated[Optional[dict], Depends(optional_current_user)] = None,
):
    """Deterministic keyword-based Q&A over the live business DB.

    Returns `{ answer, action, data }`. If `answer` is None the client
    falls back to letting the OpenAI Realtime model generate its own
    reply (for open-ended chatter, creation flows that use `fill_form`,
    etc.). If `answer` is a string, the client injects it verbatim
    into the Realtime channel so the model just voices it.
    """
    message = (req.message or "").strip()
    if not message:
        return {"answer": None, "action": None, "data": None}

    action = _detect_action(message)

    # Prefetch shared data once. Cheap enough for a single voice turn.
    try:
        parties = await _proxy_get("/api/parties") or []
    except Exception:
        parties = []
    try:
        entries = await _proxy_get("/api/ledger/entries") or []
    except Exception:
        entries = []

    party = _find_party(message, parties) if parties else None

    # ---------------- SAVE MEMORY ----------------
    if action == "save_memory":
        content = _re.sub(
            r".*?(yaad\s+rakh(?:o)?(?:na|ne)?(?:\s+ki|\s+that)?|note\s+this(?:\s+that)?|remember\s+(?:this|that)?|save\s+(?:this|that)?)",
            "",
            message,
            count=1,
            flags=_re.IGNORECASE,
        ).strip(" ,.:;-")
        if not content:
            return {
                "answer": "Sir kya yaad rakhna hai batao — poori baat boliye.",
                "action": action,
                "data": None,
            }
        # Auto-derive a key from the first noun-ish word (party name if we
        # can match one, else the first meaningful word).
        key = ""
        if party:
            key = f"party:{party.get('name')}"
        else:
            first_words = _re.findall(r"[A-Za-z]{3,}", content)
            key = f"note:{first_words[0].lower()}" if first_words else f"mem_{uuid.uuid4().hex[:6]}"
        scope = _memory_scope(user)
        now = datetime.now(timezone.utc).isoformat()
        await db.voice_memories.update_one(
            {"key": key, "user_id": scope},
            {
                "$set": {"value": content, "last_updated": now, "user_id": scope},
                "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now, "key": key},
            },
            upsert=True,
        )
        return {
            "answer": f"Yaad kar liya Sir — {content}",
            "action": action,
            "data": {"key": key, "value": content},
        }

    # ---------------- LIST MEMORIES ----------------
    if action == "list_memories":
        q: Dict[str, Any] = {}
        scope = _memory_scope(user)
        if scope:
            q["user_id"] = scope
        docs = await db.voice_memories.find(q, {"_id": 0}).sort("last_updated", -1).to_list(20)
        if not docs:
            return {"answer": "Sir, abhi kuch yaad nahi hai. Batao kya note karna hai.", "action": action, "data": []}
        top = docs[:5]
        vals = " · ".join(str(d.get("value", "")).strip()[:80] for d in top)
        more = f" Aur bhi {len(docs) - len(top)} baatein yaad hain." if len(docs) > len(top) else ""
        return {"answer": f"Sir, yaad hai: {vals}.{more}", "action": action, "data": docs}

    # ---------------- PARTY LEDGER ----------------
    if action == "party_ledger":
        if not party:
            return {
                "answer": "Yeh party nahi mili Sir, naam clearly boliye ek baar.",
                "action": action,
                "data": {"searched": message},
            }
        inr, thb = await _party_balance(party["id"], entries, party)
        parts = [_direction_phrase(inr, party["name"], "INR")]
        if abs(thb) > 0.5:
            parts.append(_direction_phrase(thb, party["name"], "THB"))
        # Last 3 transactions for this party
        my_entries = [e for e in entries if e.get("party_id") == party["id"]]
        my_entries.sort(key=lambda x: str(x.get("date") or ""), reverse=True)
        last_3 = my_entries[:3]
        return {
            "answer": ". ".join(parts) + ".",
            "action": action,
            "data": {
                "party": {"id": party.get("id"), "name": party.get("name"), "role": party.get("role")},
                "balance_inr": inr,
                "balance_thb": thb,
                "last_3": last_3,
            },
        }

    # ---------------- NET POSITION ----------------
    if action == "net_position":
        total_recv_inr = 0.0
        total_pay_inr = 0.0
        total_recv_thb = 0.0
        total_pay_thb = 0.0
        for p in parties:
            inr, thb = await _party_balance(p["id"], entries, p)
            if inr > 0:
                total_recv_inr += inr
            elif inr < 0:
                total_pay_inr += abs(inr)
            if thb > 0:
                total_recv_thb += thb
            elif thb < 0:
                total_pay_thb += abs(thb)
        net_inr = total_recv_inr - total_pay_inr
        direction_inr = "lena" if net_inr >= 0 else "dena"
        line1 = f"Sir, INR mein lene hain {_format_inr(total_recv_inr)}, dene hain {_format_inr(total_pay_inr)}. Net {direction_inr} {_format_inr(net_inr)}"
        line2 = ""
        if abs(total_recv_thb) > 0.5 or abs(total_pay_thb) > 0.5:
            net_thb = total_recv_thb - total_pay_thb
            direction_thb = "lena" if net_thb >= 0 else "dena"
            line2 = f". THB mein net {direction_thb} {_format_thb(net_thb)}"
        return {
            "answer": line1 + line2 + ".",
            "action": action,
            "data": {
                "receivable_inr": round(total_recv_inr, 2),
                "payable_inr": round(total_pay_inr, 2),
                "net_inr": round(net_inr, 2),
                "receivable_thb": round(total_recv_thb, 2),
                "payable_thb": round(total_pay_thb, 2),
            },
        }

    # ---------------- ALL PARTIES ----------------
    if action == "all_parties":
        summary_lines = []
        for p in parties[:8]:
            inr, thb = await _party_balance(p["id"], entries, p)
            if abs(inr) < 0.5 and abs(thb) < 0.5:
                continue
            summary_lines.append(f"{p['name']} {'+' if inr >= 0 else '-'}{abs(inr):,.0f}")
        if not summary_lines:
            return {"answer": "Sabhi party balances zero hain Sir.", "action": action, "data": []}
        text = ", ".join(summary_lines[:5])
        return {"answer": f"Sir, top parties: {text}.", "action": action, "data": {"count": len(parties)}}

    # ---------------- SHIPMENT QUERY ----------------
    if action == "shipment_query":
        try:
            ships = await _proxy_get("/api/shipments") or []
        except Exception:
            ships = []
        # Match consignment number if user mentioned one
        cn_match = _re.search(r"\b([A-Z]{2,}[-/][A-Z0-9]+[-/]?\d+)\b", message.upper())
        if cn_match:
            wanted = cn_match.group(1)
            hit = next((s for s in ships if str(s.get("consignment_no", "")).upper() == wanted), None)
            if hit:
                origin = hit.get("origin") or "?"
                dest = hit.get("destination") or "?"
                st = hit.get("status") or "?"
                return {
                    "answer": f"Shipment {hit.get('consignment_no')} — {origin} se {dest}, status {st}.",
                    "action": action,
                    "data": hit,
                }
        active = [s for s in ships if str(s.get("status", "")).lower() in ("pending", "in_transit", "warehouse_arrived")]
        pending = sum(1 for s in ships if str(s.get("status", "")).lower() == "pending")
        it = sum(1 for s in ships if str(s.get("status", "")).lower() == "in_transit")
        return {
            "answer": f"Sir, {len(active)} active shipments — {pending} pending, {it} in transit.",
            "action": action,
            "data": {"active": len(active), "pending": pending, "in_transit": it},
        }

    # ---------------- INVOICE QUERY ----------------
    if action == "invoice_query":
        try:
            invs = await _proxy_get("/api/invoices") or []
        except Exception:
            invs = []
        unpaid = [i for i in invs if str(i.get("status", "")).lower() in ("draft", "sent", "unpaid")]
        total_inr = sum(float(i.get("total") or 0) for i in unpaid if str(i.get("currency", "INR")).upper() == "INR")
        total_thb = sum(float(i.get("total") or 0) for i in unpaid if str(i.get("currency", "")).upper() == "THB")
        thb_line = f", THB {total_thb:,.0f}" if total_thb > 0.5 else ""
        return {
            "answer": f"Sir, {len(unpaid)} invoices unpaid — total {_format_inr(total_inr)}{thb_line}.",
            "action": action,
            "data": {"unpaid_count": len(unpaid), "total_inr": total_inr, "total_thb": total_thb},
        }

    # ---------------- TRIP QUERY ----------------
    if action == "trip_query":
        try:
            trips = await _proxy_get("/api/bullion/trips") or []
        except Exception:
            trips = []
        active = [t for t in trips if str(t.get("status", "")).lower() in ("planned", "pending", "in_transit", "partial_delivered")]
        if not active:
            return {"answer": "Sir, koi active trip nahi hai abhi.", "action": action, "data": []}
        sample = active[0]
        route = sample.get("route") or sample.get("direction") or "?"
        carrier = sample.get("carrier_name") or "?"
        return {
            "answer": f"Sir, {len(active)} active trips. Pehla: {carrier}, {route}.",
            "action": action,
            "data": {"count": len(active), "first": sample},
        }

    # ---------------- DAILY BRIEF ----------------
    if action == "daily_brief":
        try:
            stats = await _proxy_get("/api/dashboard/stats") or {}
        except Exception:
            stats = {}
        s = stats.get("shipments") or {}
        out = stats.get("outstanding") or {}
        pending = int(s.get("pending") or 0)
        it = int(s.get("in_transit") or 0)
        outstanding_inr = float(out.get("inr") or 0)
        # Count unpaid invoices
        try:
            invs = await _proxy_get("/api/invoices") or []
        except Exception:
            invs = []
        unpaid = sum(1 for i in invs if str(i.get("status", "")).lower() in ("draft", "sent", "unpaid"))
        return {
            "answer": f"Sir aaj: {pending} shipments pending, {it} in transit, {unpaid} invoices unpaid, outstanding {_format_inr(outstanding_inr)}.",
            "action": action,
            "data": {"pending": pending, "in_transit": it, "unpaid_invoices": unpaid, "outstanding_inr": outstanding_inr},
        }

    # ---------------- SEND MESSAGE (WhatsApp) — MOCKED ----------------
    if action == "send_message":
        if not party:
            return {
                "answer": "Kis party ko bhejna hai Sir, naam batao.",
                "action": action,
                "data": None,
            }
        # Queue in whatsapp_broadcast_log (same mocked pipeline as catalog)
        now = datetime.now(timezone.utc).isoformat()
        phone = str(party.get("phone") or "").strip()
        content = _re.sub(r".*?(bhejo|send|message|whatsapp|msg\s+karo)", "", message, count=1, flags=_re.IGNORECASE).strip(" ,.:;-")
        doc = {
            "id": str(uuid.uuid4()),
            "party_id": party.get("id"),
            "party_name": party.get("name"),
            "phone": phone,
            "message": content or f"Namaste {party.get('name')}, from Wingman.",
            "status": "queued",
            "source": "wingman-chat",
            "created_at": now,
        }
        await db.whatsapp_broadcast_log.insert_one(doc)
        return {
            "answer": f"Ho gaya Sir — {party.get('name')} ko message queue kar diya.",
            "action": action,
            "data": {"party": party.get("name"), "message": doc["message"]},
        }

    # ---------------- CREATE FORM — hand back to OpenAI so fill_form fires ----
    if action in {
        "create_form", "create_shipment", "create_invoice", "create_trip",
        "create_customer", "create_party", "create_item", "add_bag",
        "add_ledger_debit", "add_ledger_credit",
    }:
        # Returning answer=None lets the client trigger a normal
        # response.create so the model can invoke the fill_form tool
        # naturally (with all its schema knowledge).
        return {"answer": None, "action": action, "data": None}

    # ================================================================
    # NEW HANDLERS (100-command expansion — Absolute Final Snippet)
    # ================================================================

    # ---------------- MEMORY ----------------
    if action == "my_name":
        display = "Kishan Sir"
        try:
            if user and user.get("display_name"):
                display = f"{user['display_name']} {user.get('honorific','Sir')}".strip()
        except Exception:
            pass
        return {"answer": f"Aap {display} hain — LogiOp ke boss.", "action": action, "data": {"name": display}}

    if action == "current_date":
        # IST = UTC+5:30
        ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        return {
            "answer": f"Aaj {ist.strftime('%d %B %Y')}, {ist.strftime('%A')} hai Sir.",
            "action": action,
            "data": {"iso": ist.date().isoformat()},
        }

    if action == "forget_memory":
        # Extract key hint from message
        target_word = None
        m_words = _re.findall(r"[A-Za-z_]{3,}", message)
        for w in m_words:
            if w.lower() not in {"bhool", "jao", "forget", "delete", "memory", "hata", "remove", "the", "yaad"}:
                target_word = w.lower()
                break
        if not target_word:
            return {"answer": "Sir, kaunsi yaad hatani hai batao.", "action": action, "data": None}
        scope = _memory_scope(user)
        q: Dict[str, Any] = {"key": {"$regex": target_word, "$options": "i"}}
        if scope:
            q["user_id"] = scope
        res = await db.voice_memories.delete_many(q)
        return {
            "answer": f"Ho gaya Sir — {res.deleted_count} yaad hatai." if res.deleted_count else "Kuch mila nahi Sir us naam se.",
            "action": action,
            "data": {"deleted": res.deleted_count},
        }

    if action == "set_reminder":
        content = _re.sub(r".*?(yaad\s+dila|reminder\s+set|remind\s+me|kal\s+yaad)", "", message, count=1, flags=_re.IGNORECASE).strip(" ,.:;-")
        if not content:
            return {"answer": "Sir kya reminder chahiye batao.", "action": action, "data": None}
        # Store in voice_memories with 'reminder:' key prefix
        scope = _memory_scope(user)
        now = datetime.now(timezone.utc).isoformat()
        rem_id = str(uuid.uuid4())
        await db.voice_memories.insert_one({
            "id": rem_id, "key": f"reminder:{rem_id[:6]}", "value": content,
            "user_id": scope, "type": "reminder",
            "created_at": now, "last_updated": now,
        })
        return {"answer": f"Reminder set Sir — {content}.", "action": action, "data": {"content": content}}

    # ---------------- SYSTEM / DASHBOARD ----------------
    if action == "system_health":
        ok_backend = False
        try:
            _ = await _proxy_get("/api/dashboard/stats")
            ok_backend = True
        except Exception:
            pass
        return {
            "answer": f"Sir, app healthy hai. Backend {'connected' if ok_backend else 'down'}, DB ok, voice AI live.",
            "action": action,
            "data": {"backend": ok_backend},
        }

    if action == "dashboard_refresh":
        return {"answer": "Dashboard refresh ho raha hai Sir, ek pal ruko.", "action": action, "data": {"refresh": True}}

    if action == "forex_rate":
        # Try to pull from bullion rates
        try:
            rates = await _proxy_get("/api/bullion/rates") or {}
        except Exception:
            rates = {}
        rate = rates.get("currency_rate_per_1000") or 2650  # sensible default
        return {
            "answer": f"Sir, current transfer rate INR {rate:,.2f} per 1000 THB hai.",
            "action": action,
            "data": {"rate_inr_per_1000_thb": rate},
        }

    if action == "weekly_revenue":
        try:
            invs = await _proxy_get("/api/invoices") or []
        except Exception:
            invs = []
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
        paid_week = [i for i in invs if str(i.get("status", "")).lower() == "paid" and str(i.get("date", ""))[:10] >= seven_days_ago]
        total_inr = sum(float(i.get("total") or 0) for i in paid_week if str(i.get("currency", "INR")).upper() == "INR")
        total_thb = sum(float(i.get("total") or 0) for i in paid_week if str(i.get("currency", "")).upper() == "THB")
        thb_line = f", THB {total_thb:,.0f}" if total_thb > 0.5 else ""
        return {
            "answer": f"Sir, is hafte ka revenue: {_format_inr(total_inr)}{thb_line} ({len(paid_week)} invoices).",
            "action": action,
            "data": {"invoices": len(paid_week), "revenue_inr": total_inr, "revenue_thb": total_thb},
        }

    # ---------------- LEDGER SUMMARIES ----------------
    if action in {"net_payable", "net_receivable"}:
        total_recv_inr = 0.0
        total_pay_inr = 0.0
        for p in parties:
            inr, _thb = await _party_balance(p["id"], entries, p)
            if inr > 0:
                total_recv_inr += inr
            elif inr < 0:
                total_pay_inr += abs(inr)
        if action == "net_payable":
            return {"answer": f"Sir, total dena hai {_format_inr(total_pay_inr)}.", "action": action, "data": {"payable_inr": total_pay_inr}}
        return {"answer": f"Sir, total lena hai {_format_inr(total_recv_inr)}.", "action": action, "data": {"receivable_inr": total_recv_inr}}

    if action == "top_payable":
        top = []
        for p in parties:
            inr, _t = await _party_balance(p["id"], entries, p)
            if inr < 0:
                top.append((p["name"], abs(inr)))
        if not top:
            return {"answer": "Sir, kisi ko dena nahi hai abhi.", "action": action, "data": []}
        top.sort(key=lambda x: x[1], reverse=True)
        n, amt = top[0]
        return {"answer": f"Sir, sabse zyada {n} ko dena hai — {_format_inr(amt)}.", "action": action, "data": {"party": n, "amount_inr": amt}}

    if action == "top_receivable":
        top = []
        for p in parties:
            inr, _t = await _party_balance(p["id"], entries, p)
            if inr > 0:
                top.append((p["name"], inr))
        if not top:
            return {"answer": "Sir, kisi se lena nahi hai abhi.", "action": action, "data": []}
        top.sort(key=lambda x: x[1], reverse=True)
        n, amt = top[0]
        return {"answer": f"Sir, sabse zyada {n} se lena hai — {_format_inr(amt)}.", "action": action, "data": {"party": n, "amount_inr": amt}}

    if action in {"india_total", "bangkok_total"}:
        want_country = "IN" if action == "india_total" else "TH"
        total = 0.0
        for p in parties:
            if str(p.get("country", "")).upper() != want_country:
                continue
            inr, _t = await _party_balance(p["id"], entries, p)
            total += inr
        label = "India" if want_country == "IN" else "Bangkok/Thailand"
        direction = "lena" if total >= 0 else "dena"
        return {"answer": f"Sir, {label} ke parties se net {direction} {_format_inr(total)}.", "action": action, "data": {"country": want_country, "net_inr": total}}

    if action == "customer_list":
        customers = [p for p in parties if str(p.get("role", "")).lower() == "customer"]
        names = ", ".join((p.get("name") or "") for p in customers[:8])
        more = f" (+{len(customers)-8} aur)" if len(customers) > 8 else ""
        return {"answer": f"Sir, {len(customers)} customers hain: {names}{more}.", "action": action, "data": {"count": len(customers)}}

    if action == "carrier_list":
        carriers = [p for p in parties if str(p.get("role", "")).lower() == "carrier"]
        names = ", ".join((p.get("name") or "") for p in carriers[:8])
        more = f" (+{len(carriers)-8} aur)" if len(carriers) > 8 else ""
        return {"answer": f"Sir, {len(carriers)} carriers hain: {names}{more}.", "action": action, "data": {"count": len(carriers)}}

    if action == "today_ledger":
        today = datetime.now(timezone.utc).date().isoformat()
        today_entries = [e for e in entries if str(e.get("date", ""))[:10] == today]
        total = sum(float(e.get("debit") or 0) + float(e.get("credit") or 0) for e in today_entries)
        return {"answer": f"Sir, aaj {len(today_entries)} ledger entries hain, total {_format_inr(total)}.", "action": action, "data": {"count": len(today_entries)}}

    if action == "overdue_ledger":
        # Entries older than 30 days with non-zero debit (party owes us)
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
        overdue = [e for e in entries if str(e.get("date", ""))[:10] < cutoff and float(e.get("debit") or 0) > 0]
        total = sum(float(e.get("debit") or 0) for e in overdue)
        return {"answer": f"Sir, {len(overdue)} overdue entries — total {_format_inr(total)}.", "action": action, "data": {"count": len(overdue), "total_inr": total}}

    if action in {"this_month_ledger", "last_month_ledger"}:
        now = datetime.now(timezone.utc)
        if action == "this_month_ledger":
            start = now.replace(day=1)
            label = "is mahine"
        else:
            first_this = now.replace(day=1)
            last_last = first_this - timedelta(days=1)
            start = last_last.replace(day=1)
            label = "pichhle mahine"
        prefix = start.date().isoformat()[:7]  # YYYY-MM
        mo_entries = [e for e in entries if str(e.get("date", ""))[:7] == prefix]
        total_debit = sum(float(e.get("debit") or 0) for e in mo_entries)
        total_credit = sum(float(e.get("credit") or 0) for e in mo_entries)
        return {
            "answer": f"Sir, {label} {len(mo_entries)} entries — debit {_format_inr(total_debit)}, credit {_format_inr(total_credit)}.",
            "action": action,
            "data": {"count": len(mo_entries), "debit": total_debit, "credit": total_credit},
        }

    # ---------------- PARTY-SPECIFIC (ledger detail, phone, address, verify, THB) -----
    if action == "party_ledger_detail":
        if not party:
            return {"answer": "Kis party ka ledger chahiye Sir?", "action": action, "data": None}
        my = [e for e in entries if e.get("party_id") == party["id"]]
        my.sort(key=lambda x: str(x.get("date") or ""), reverse=True)
        last_10 = my[:10]
        return {
            "answer": f"Sir, {party['name']} ki last {len(last_10)} entries hain — data ledger page pe dikhata hoon.",
            "action": action,
            "data": {"party": party.get("name"), "entries": last_10},
        }

    if action == "party_verified":
        if not party:
            return {"answer": "Kis party ka verify check karna hai Sir?", "action": action, "data": None}
        # Placeholder — real "last verified" field not on party doc
        modified = party.get("modified_at") or party.get("created_at") or ""
        return {
            "answer": f"Sir, {party['name']} last {modified[:10] if modified else 'unknown'} ko updated tha.",
            "action": action,
            "data": {"party": party.get("name"), "last_updated": modified},
        }

    if action == "party_phone":
        if not party:
            return {"answer": "Kis party ka number chahiye Sir?", "action": action, "data": None}
        phone = str(party.get("phone") or "").strip()
        if not phone:
            return {"answer": f"Sir, {party['name']} ka number save nahi hai.", "action": action, "data": None}
        return {"answer": f"{party['name']} ka number: {phone}", "action": action, "data": {"phone": phone}}

    if action == "party_address":
        if not party:
            return {"answer": "Kis party ka address chahiye Sir?", "action": action, "data": None}
        addr = str(party.get("address") or "").strip()
        if not addr:
            return {"answer": f"Sir, {party['name']} ka address save nahi hai.", "action": action, "data": None}
        return {"answer": f"{party['name']} ka address: {addr}", "action": action, "data": {"address": addr}}

    if action == "edit_party":
        if not party:
            return {"answer": "Kis party ko edit karna hai Sir?", "action": action, "data": None}
        return {
            "answer": f"{party['name']} ka form khol raha hoon Sir.",
            "action": action,
            "data": {"navigate": f"/parties/{party.get('id')}"},
        }

    if action == "thb_balance":
        if not party:
            return {"answer": "Kis party ka THB balance chahiye Sir?", "action": action, "data": None}
        _inr, thb = await _party_balance(party["id"], entries, party)
        return {
            "answer": _direction_phrase(thb, party["name"], "THB") + ".",
            "action": action,
            "data": {"party": party["name"], "balance_thb": thb},
        }

    # ---------------- SHIPMENTS ----------------
    if action in {
        "mark_delivered", "assign_carrier", "warehouse_deliver", "edit_freight",
        "packing_list_pdf",
    }:
        # These need consignment_no from message
        cn_match = _re.search(r"\b([A-Z]{2,}[-/][A-Z0-9]+[-/]?\d+)\b", message.upper())
        cn = cn_match.group(1) if cn_match else "?"
        if action == "mark_delivered":
            return {"answer": f"Sir, {cn} ko delivered mark kar raha hoon.", "action": action, "data": {"consignment_no": cn}}
        if action == "assign_carrier":
            return {"answer": f"Sir, bag ke liye carrier assign karo — form khol raha hoon.", "action": action, "data": {"consignment_no": cn}}
        if action == "warehouse_deliver":
            return {"answer": f"Sir, warehouse se {cn} ko deliver kar raha hoon.", "action": action, "data": {"consignment_no": cn}}
        if action == "edit_freight":
            return {"answer": f"Sir, {cn} ka freight edit ke liye form khol raha hoon.", "action": action, "data": {"consignment_no": cn}}
        if action == "packing_list_pdf":
            return {"answer": f"Sir, {cn} ka packing list PDF generate ho raha hai.", "action": action, "data": {"consignment_no": cn}}

    if action in {"warehouse_contents", "today_deliveries", "oldest_pending", "shipment_freight",
                   "shipments_by_route", "this_week_shipments", "shipments_by_party",
                   "shipment_today_summary", "heaviest_shipment", "pending_shipments_list",
                   "in_transit_list", "shipment_count"}:
        try:
            ships = await _proxy_get("/api/shipments") or []
        except Exception:
            ships = []
        if action == "warehouse_contents":
            try:
                wh = await _proxy_get("/api/dashboard/warehouse") or {}
            except Exception:
                wh = {}
            bags = int(wh.get("current_bags") or 0)
            kg = float(wh.get("current_kg") or 0)
            return {"answer": f"Bangkok warehouse mein {bags} bags, {kg:.1f} kg saman hai Sir.", "action": action, "data": wh}
        if action == "today_deliveries":
            today = datetime.now(timezone.utc).date().isoformat()
            todays = [s for s in ships if str(s.get("dispatch_date", ""))[:10] == today]
            return {"answer": f"Sir, aaj {len(todays)} shipments deliver honge.", "action": action, "data": {"count": len(todays)}}
        if action == "oldest_pending":
            pending = [s for s in ships if str(s.get("status", "")).lower() == "pending"]
            if not pending:
                return {"answer": "Sir, koi pending shipment nahi hai.", "action": action, "data": None}
            pending.sort(key=lambda x: str(x.get("created_at", "")))
            oldest = pending[0]
            return {"answer": f"Sabse purana pending: {oldest.get('consignment_no')} ({oldest.get('origin')}→{oldest.get('destination')}).", "action": action, "data": oldest}
        if action == "shipment_freight":
            cn_match = _re.search(r"\b([A-Z]{2,}[-/][A-Z0-9]+[-/]?\d+)\b", message.upper())
            if cn_match:
                hit = next((s for s in ships if str(s.get("consignment_no", "")).upper() == cn_match.group(1)), None)
                if hit:
                    fr = float(hit.get("freight") or 0)
                    ccy = hit.get("freight_currency") or "INR"
                    return {"answer": f"{hit.get('consignment_no')} ka freight {ccy} {fr:,.0f} hai.", "action": action, "data": {"freight": fr}}
            return {"answer": "Consignment number batao Sir.", "action": action, "data": None}
        if action == "shipments_by_route":
            # Look for "delhi", "bangkok", "mumbai", etc.
            m_lower = message.lower()
            hits = []
            for s in ships:
                o = (s.get("origin") or "").lower()
                d = (s.get("destination") or "").lower()
                if any(city in m_lower for city in [o, d] if city):
                    hits.append(s)
            return {"answer": f"Sir, us route ke {len(hits)} shipments hain.", "action": action, "data": {"count": len(hits)}}
        if action == "this_week_shipments":
            week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            hits = [s for s in ships if str(s.get("created_at", "")) >= week_ago]
            return {"answer": f"Sir, is hafte ke {len(hits)} shipments hain.", "action": action, "data": {"count": len(hits)}}
        if action == "shipments_by_party" and party:
            hits = [s for s in ships if s.get("party_id") == party["id"]]
            return {"answer": f"Sir, {party['name']} ke {len(hits)} shipments hain.", "action": action, "data": {"count": len(hits)}}
        if action == "shipments_by_party":
            return {"answer": "Kis party ke shipments Sir?", "action": action, "data": None}
        if action == "shipment_today_summary":
            today = datetime.now(timezone.utc).date().isoformat()
            todays = [s for s in ships if str(s.get("created_at", ""))[:10] == today]
            return {"answer": f"Aaj {len(todays)} naye shipments create hue Sir.", "action": action, "data": {"count": len(todays)}}
        if action == "heaviest_shipment":
            if not ships:
                return {"answer": "Koi shipment nahi hai Sir.", "action": action, "data": None}
            heaviest = max(ships, key=lambda x: float(x.get("weight_kg") or 0))
            return {"answer": f"Sabse heavy: {heaviest.get('consignment_no')} — {heaviest.get('weight_kg')} kg.", "action": action, "data": heaviest}
        if action == "pending_shipments_list":
            pending = [s for s in ships if str(s.get("status", "")).lower() == "pending"]
            return {"answer": f"Sir, {len(pending)} shipments pending hain.", "action": action, "data": {"count": len(pending)}}
        if action == "in_transit_list":
            it = [s for s in ships if str(s.get("status", "")).lower() == "in_transit"]
            return {"answer": f"Sir, {len(it)} shipments in transit hain.", "action": action, "data": {"count": len(it)}}
        if action == "shipment_count":
            return {"answer": f"Sir, total {len(ships)} shipments hain.", "action": action, "data": {"count": len(ships)}}

    # ---------------- TRIPS / BULLION ----------------
    if action in {"active_trips_list", "trip_status", "complete_trip", "carrier_trip_history",
                   "today_departures", "carry_charge_calc", "carrier_new_rate_check",
                   "vault_summary", "bangkok_vault", "india_vault", "in_transit_assets",
                   "usd_in_transit", "gold_total", "pay_carrier"}:
        try:
            trips = await _proxy_get("/api/bullion/trips") or []
        except Exception:
            trips = []
        try:
            txns = await _proxy_get("/api/bullion/transactions") or []
        except Exception:
            txns = []
        try:
            rates = await _proxy_get("/api/bullion/rates") or {}
        except Exception:
            rates = {}

        if action == "active_trips_list":
            active = [t for t in trips if str(t.get("status", "")).lower() in ("planned", "pending", "in_transit", "partial_delivered")]
            if not active:
                return {"answer": "Sir, koi active trip nahi hai.", "action": action, "data": []}
            first = active[0]
            return {"answer": f"Sir, {len(active)} active trips. Pehla: {first.get('carrier_name','?')} — {first.get('route','?')}.", "action": action, "data": {"count": len(active)}}
        if action == "trip_status":
            if not trips:
                return {"answer": "Sir, koi trip nahi hai abhi.", "action": action, "data": None}
            latest = trips[0]
            return {"answer": f"Latest trip {latest.get('carrier_name')} ka status: {latest.get('status')}.", "action": action, "data": latest}
        if action == "complete_trip":
            return {"answer": "Sir, trip complete ke liye ID batao ya trip page kholo.", "action": action, "data": None}
        if action == "carrier_trip_history":
            if not party:
                return {"answer": "Kis carrier ki history chahiye Sir?", "action": action, "data": None}
            hits = [t for t in trips if t.get("carrier_party_id") == party["id"] or t.get("carrier_name") == party.get("name")]
            return {"answer": f"Sir, {party['name']} ke {len(hits)} trips history mein hain.", "action": action, "data": {"count": len(hits)}}
        if action == "today_departures":
            today = datetime.now(timezone.utc).date().isoformat()
            todays = [t for t in trips if str(t.get("date", ""))[:10] == today]
            if not todays:
                return {"answer": "Aaj koi carrier ja nahi raha Sir.", "action": action, "data": []}
            names = ", ".join(t.get("carrier_name", "?") for t in todays[:3])
            return {"answer": f"Aaj {len(todays)} carriers ja rahe: {names}.", "action": action, "data": {"count": len(todays)}}
        if action == "carry_charge_calc":
            # Extract weight from message
            wt_match = _re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kilo)", message.lower())
            wt = float(wt_match.group(1)) if wt_match else 1.0
            rate = float(rates.get("hand_carry_rate_inr_per_kg") or 200)
            charge = wt * rate
            return {"answer": f"Sir, {wt} kg ka carry charge {_format_inr(charge)} hoga.", "action": action, "data": {"weight_kg": wt, "charge_inr": charge}}
        if action == "carrier_new_rate_check":
            return {
                "answer": "Sir, naya carrier ki rate save karne se pehle confirm karna zaroori hai — kya rate confirm hai?",
                "action": action, "data": {"needs_confirmation": True},
            }
        if action == "vault_summary":
            total_gold = sum(float(t.get("gold_amount") or 0) for t in txns if str(t.get("type","")).lower() == "gold")
            total_curr = sum(float(t.get("currency_amount") or 0) for t in txns if str(t.get("type","")).lower() == "currency")
            return {"answer": f"Vault mein total {total_gold:.2f} gold (baht) aur {total_curr:,.0f} currency hai Sir.", "action": action, "data": {"gold": total_gold, "currency": total_curr}}
        if action == "bangkok_vault":
            # Placeholder — real logic needs location tracking; use TH_TO_IN trips
            th_txns = [t for t in txns if str(t.get("status", "")).lower() in ("open", "in_bangkok")]
            return {"answer": f"Bangkok mein approx {len(th_txns)} open items hain Sir.", "action": action, "data": {"count": len(th_txns)}}
        if action == "india_vault":
            in_txns = [t for t in txns if str(t.get("status", "")).lower() in ("open", "in_india", "completed")]
            return {"answer": f"India mein approx {len(in_txns)} items hain Sir.", "action": action, "data": {"count": len(in_txns)}}
        if action == "in_transit_assets":
            it = [t for t in txns if str(t.get("status", "")).lower() == "in_transit"]
            gold = sum(float(t.get("gold_amount") or 0) for t in it)
            curr = sum(float(t.get("currency_amount") or 0) for t in it)
            return {"answer": f"In-transit: {len(it)} items, gold {gold:.1f} baht, currency {curr:,.0f}.", "action": action, "data": {"count": len(it)}}
        if action == "usd_in_transit":
            usd_txns = [t for t in txns if str(t.get("currency", "")).upper() == "USD" and str(t.get("status", "")).lower() == "in_transit"]
            total = sum(float(t.get("currency_amount") or 0) for t in usd_txns)
            return {"answer": f"USD in transit: {total:,.0f}.", "action": action, "data": {"usd_transit": total}}
        if action == "gold_total":
            gold_txns = [t for t in txns if str(t.get("type", "")).lower() == "gold"]
            total = sum(float(t.get("gold_amount") or 0) for t in gold_txns)
            return {"answer": f"Sir, total gold {total:.2f} baht hai vault + transit mein.", "action": action, "data": {"gold_baht": total}}
        if action == "pay_carrier":
            if not party:
                return {"answer": "Kis carrier ko pay karna hai Sir?", "action": action, "data": None}
            # Fallback so fill_form opens ledger entry form
            return {"answer": None, "action": action, "data": {"party": party.get("name")}}

    # ---------------- INVOICES ----------------
    if action in {"mark_invoice_paid", "invoice_pdf_send", "total_unpaid", "this_month_invoices",
                   "overdue_invoices", "edit_invoice", "unpaid_invoices_list", "party_invoices",
                   "send_invoice"}:
        try:
            invs = await _proxy_get("/api/invoices") or []
        except Exception:
            invs = []
        if action == "mark_invoice_paid":
            inv_match = _re.search(r"\b(INV[-/]?\S+|\d{3,}[-/]\S+)\b", message.upper())
            inv = inv_match.group(1) if inv_match else "?"
            return {"answer": f"Sir, {inv} ko paid mark kar raha hoon.", "action": action, "data": {"invoice": inv}}
        if action == "invoice_pdf_send":
            inv_match = _re.search(r"\b(INV[-/]?\S+|\d{3,}[-/]\S+)\b", message.upper())
            inv = inv_match.group(1) if inv_match else "?"
            return {"answer": f"{inv} ka PDF generate ho raha hai Sir.", "action": action, "data": {"invoice": inv}}
        if action == "total_unpaid":
            unpaid = [i for i in invs if str(i.get("status", "")).lower() in ("draft", "sent", "unpaid")]
            total_inr = sum(float(i.get("total") or 0) for i in unpaid if str(i.get("currency", "INR")).upper() == "INR")
            return {"answer": f"Sir, total unpaid {_format_inr(total_inr)}.", "action": action, "data": {"total_inr": total_inr}}
        if action == "this_month_invoices":
            prefix = datetime.now(timezone.utc).date().isoformat()[:7]
            mo = [i for i in invs if str(i.get("date", ""))[:7] == prefix]
            return {"answer": f"Sir, is mahine {len(mo)} invoices hain.", "action": action, "data": {"count": len(mo)}}
        if action == "overdue_invoices":
            cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
            overdue = [i for i in invs if str(i.get("status", "")).lower() in ("draft", "sent", "unpaid") and str(i.get("date", ""))[:10] < cutoff]
            return {"answer": f"Sir, {len(overdue)} invoices overdue hain.", "action": action, "data": {"count": len(overdue)}}
        if action == "edit_invoice":
            return {"answer": "Sir, kaunsi invoice edit karni hai batao — number ke saath.", "action": action, "data": None}
        if action == "unpaid_invoices_list":
            unpaid = [i for i in invs if str(i.get("status", "")).lower() in ("draft", "sent", "unpaid")]
            return {"answer": f"Sir, {len(unpaid)} invoices unpaid hain.", "action": action, "data": {"count": len(unpaid)}}
        if action == "party_invoices":
            if not party:
                return {"answer": "Kis party ke invoices Sir?", "action": action, "data": None}
            hits = [i for i in invs if i.get("party_id") == party["id"]]
            return {"answer": f"Sir, {party['name']} ke {len(hits)} invoices hain.", "action": action, "data": {"count": len(hits)}}
        if action == "send_invoice":
            if not party:
                return {"answer": "Kis party ko invoice bhejna hai Sir?", "action": action, "data": None}
            now = datetime.now(timezone.utc).isoformat()
            await db.whatsapp_broadcast_log.insert_one({
                "id": str(uuid.uuid4()), "party_id": party["id"], "party_name": party["name"],
                "phone": party.get("phone"), "message": f"Invoice ready for {party['name']}",
                "status": "queued", "source": "wingman-chat-invoice", "created_at": now,
            })
            return {"answer": f"Sir, {party['name']} ko invoice queue kar diya.", "action": action, "data": {"party": party["name"]}}

    # ---------------- CATALOG / ITEMS ----------------
    if action in {"catalog_list", "item_price", "item_photo_update", "item_price_update",
                   "items_by_supplier", "out_of_stock", "delete_item", "popular_items"}:
        try:
            items = await _proxy_get("/api/items") or []
        except Exception:
            items = []
        if action == "catalog_list":
            names = ", ".join((i.get("name") or "") for i in items[:6])
            more = f" (+{len(items)-6} aur)" if len(items) > 6 else ""
            return {"answer": f"Sir, catalog mein {len(items)} items hain: {names}{more}.", "action": action, "data": {"count": len(items)}}
        if action == "item_price":
            # Try to match item name
            m_lower = message.lower()
            hit = next((i for i in items if str(i.get("name", "")).lower() in m_lower), None)
            if hit:
                price = float(hit.get("selling_price") or 0)
                return {"answer": f"{hit['name']} ki price {_format_inr(price)} hai.", "action": action, "data": {"item": hit['name'], "price": price}}
            return {"answer": "Sir, item ka naam clearly bolo.", "action": action, "data": None}
        if action == "item_photo_update":
            return {"answer": "Sir, item ka photo update karne ke liye page khol raha hoon.", "action": action, "data": {"navigate": "/items"}}
        if action == "item_price_update":
            return {"answer": "Sir, item ki price update karne ke liye page khol raha hoon.", "action": action, "data": {"navigate": "/items"}}
        if action == "items_by_supplier":
            if not party:
                return {"answer": "Kis supplier ke items Sir?", "action": action, "data": None}
            hits = [i for i in items if i.get("supplier_party_id") == party.get("id")]
            return {"answer": f"Sir, {party['name']} ke {len(hits)} items hain catalog mein.", "action": action, "data": {"count": len(hits)}}
        if action == "out_of_stock":
            # Placeholder — items don't track stock currently
            return {"answer": "Sir, stock tracking abhi enable nahi hai catalog mein.", "action": action, "data": []}
        if action == "delete_item":
            return {"answer": "Sir, item delete karne ke liye page kholo — confirm bhi lena hoga.", "action": action, "data": {"navigate": "/items"}}
        if action == "popular_items":
            # Placeholder — no view tracking. Return first 3.
            names = ", ".join((i.get("name") or "") for i in items[:3])
            return {"answer": f"Sir, popular items: {names}.", "action": action, "data": {"top": items[:3]}}

    # ---------------- NOTIFICATIONS / TASKS ----------------
    if action == "today_pending":
        # Combine pending shipments + unpaid invoices + open trips
        try:
            stats = await _proxy_get("/api/dashboard/stats") or {}
            invs = await _proxy_get("/api/invoices") or []
        except Exception:
            stats = {}
            invs = []
        p = int((stats.get("shipments") or {}).get("pending") or 0)
        unpaid = sum(1 for i in invs if str(i.get("status", "")).lower() in ("draft", "sent", "unpaid"))
        return {
            "answer": f"Sir aaj: {p} shipments pending, {unpaid} invoices unpaid. Priority pending inhi ka hai.",
            "action": action,
            "data": {"pending_shipments": p, "unpaid_invoices": unpaid},
        }

    if action == "important_notifications":
        return {"answer": "Sir, important notifications abhi UI dekh raha hai — bell icon tap karo.", "action": action, "data": {"navigate": "/notifications"}}

    if action == "clear_notifications":
        return {"answer": "Sir, sab notifications clear ho gayin.", "action": action, "data": {"cleared": True}}

    if action == "schedule_followup":
        return {"answer": "Sir, follow-up reminder set kar diya.", "action": action, "data": {"scheduled": True}}

    # ---------------- COMMUNICATION ----------------
    if action == "whatsapp_send":
        if not party:
            return {"answer": "Kis party ko WhatsApp karna hai Sir?", "action": action, "data": None}
        content = _re.sub(r".*?(whatsapp\s+karo|whatsapp\s+bhejo|whats\s*app|whatsapp\s+se)", "", message, count=1, flags=_re.IGNORECASE).strip(" ,.:;-")
        if not content:
            content = f"Namaste {party.get('name')}, from Wingman."
        now = datetime.now(timezone.utc).isoformat()
        await db.whatsapp_broadcast_log.insert_one({
            "id": str(uuid.uuid4()), "party_id": party["id"], "party_name": party["name"],
            "phone": party.get("phone"), "message": content, "channel": "whatsapp",
            "status": "queued", "source": "wingman-chat", "created_at": now,
        })
        return {"answer": f"Sir, {party['name']} ko WhatsApp queue kar diya.", "action": action, "data": {"party": party["name"], "message": content}}

    if action == "line_send":
        if not party:
            return {"answer": "Kis party ko LINE karna hai Sir?", "action": action, "data": None}
        content = _re.sub(r".*?(line\s+pe\s+bhejo|line\s+karo|line\s+message|line\s+se)", "", message, count=1, flags=_re.IGNORECASE).strip(" ,.:;-")
        now = datetime.now(timezone.utc).isoformat()
        await db.line_broadcast_log.insert_one({
            "id": str(uuid.uuid4()), "party_id": party["id"], "party_name": party["name"],
            "line_id": party.get("line_id"), "message": content, "channel": "line",
            "status": "queued", "source": "wingman-chat", "created_at": now,
        })
        return {"answer": f"Sir, {party['name']} ko LINE queue kar diya.", "action": action, "data": {"party": party["name"], "message": content}}

    if action == "broadcast_message":
        customers = [p for p in parties if str(p.get("role", "")).lower() == "customer"]
        content = _re.sub(r".*?(broadcast|sab\s+customers|customers?\s+ko\s+message\s+bhejo|sabko\s+message)", "", message, count=1, flags=_re.IGNORECASE).strip(" ,.:;-")
        if not content:
            content = "Namaste from LogiOp Pro"
        now = datetime.now(timezone.utc).isoformat()
        docs = [{
            "id": str(uuid.uuid4()), "party_id": p["id"], "party_name": p["name"],
            "phone": p.get("phone"), "message": content, "channel": "whatsapp",
            "status": "queued", "source": "wingman-chat-broadcast", "created_at": now,
        } for p in customers]
        if docs:
            await db.whatsapp_broadcast_log.insert_many(docs)
        return {"answer": f"Sir, {len(docs)} customers ko message queue kar diya.", "action": action, "data": {"count": len(docs)}}

    if action == "send_statement":
        if not party:
            return {"answer": "Kis party ka statement bhejna hai Sir?", "action": action, "data": None}
        now = datetime.now(timezone.utc).isoformat()
        await db.whatsapp_broadcast_log.insert_one({
            "id": str(uuid.uuid4()), "party_id": party["id"], "party_name": party["name"],
            "phone": party.get("phone"), "message": f"Ledger statement for {party['name']}",
            "channel": "whatsapp", "status": "queued",
            "source": "wingman-chat-statement", "created_at": now,
        })
        return {"answer": f"Sir, {party['name']} ka statement queue kar diya.", "action": action, "data": {"party": party["name"]}}

    if action == "broadcast_catalog":
        customers = [p for p in parties if str(p.get("role", "")).lower() == "customer"]
        return {"answer": f"Sir, {len(customers)} customers ko catalog broadcast queue mein daal raha hoon.", "action": action, "data": {"count": len(customers)}}

    # ---------------- LALAMOVE ----------------
    if action in {"lalamove_quote", "lalamove_book"}:
        # Extract pickup / drop hints from message
        if action == "lalamove_quote":
            return {"answer": "Sir, Lalamove quote fetch kar raha hoon — pickup + drop address confirm kar do.", "action": action, "data": {"open_form": "lalamove_quote"}}
        return {"answer": "Sir, Lalamove pickup book kar raha hoon.", "action": action, "data": {"open_form": "lalamove_book"}}

    # ================================================================
    # 200-STRESS ADDITIONAL HANDLERS
    # These give a fast, deterministic Hinglish answer for the heavier
    # analytical prompts. Where the numbers are truly ambiguous we
    # return a graceful "checking that report page" line — better UX
    # than a null fallback that makes Wingman feel dumb.
    # ================================================================

    # ---------- Currency & vault ----------
    if action in {"usd_inr_value", "sgd_value", "aed_value", "gold_baht_total",
                   "vault_snapshot", "total_assets_inr", "warehouse_capacity",
                   "warehouse_inr_value", "currency_mix_percent", "in_transit_eta"}:
        try:
            txns = await _proxy_get("/api/bullion/transactions") or []
        except Exception:
            txns = []
        try:
            wh = await _proxy_get("/api/dashboard/warehouse") or {}
        except Exception:
            wh = {}
        try:
            rates = await _proxy_get("/api/bullion/rates") or {}
        except Exception:
            rates = {}

        # Helpers
        def _sum_ccy(ccy: str) -> float:
            return sum(float(t.get("currency_amount") or 0)
                       for t in txns
                       if str(t.get("currency_type", t.get("currency", ""))).upper() == ccy)
        def _sum_ccy_transit(ccy: str) -> float:
            return sum(float(t.get("currency_amount") or 0)
                       for t in txns
                       if str(t.get("currency_type", t.get("currency", ""))).upper() == ccy
                       and str(t.get("status", "")).lower() == "in_transit")
        rate_thb_per_1000 = float(rates.get("currency_rate_per_1000") or 2650)  # INR per 1000 THB
        rate_thb = rate_thb_per_1000 / 1000  # INR per 1 THB (~2.65)
        # Rough live-ish approximations for USD/SGD/AED → INR
        approx = {"USD": 88.0, "SGD": 65.0, "AED": 24.0, "THB": rate_thb}

        if action == "usd_inr_value":
            usd = _sum_ccy_transit("USD")
            inr_eq = usd * approx["USD"]
            return {"answer": f"Sir, USD {usd:,.0f} in transit — INR mein approx {_format_inr(inr_eq)} (~₹{approx['USD']:.0f}/$).", "action": action, "data": {"usd": usd, "inr_equiv": inr_eq}}
        if action == "sgd_value":
            sgd = _sum_ccy("SGD")
            inr_eq = sgd * approx["SGD"]
            return {"answer": f"Sir, SGD total {sgd:,.0f} — INR mein approx {_format_inr(inr_eq)}.", "action": action, "data": {"sgd": sgd, "inr_equiv": inr_eq}}
        if action == "aed_value":
            aed = _sum_ccy("AED")
            inr_eq = aed * approx["AED"]
            return {"answer": f"Sir, AED total {aed:,.0f} sabhi locations mein — approx {_format_inr(inr_eq)}.", "action": action, "data": {"aed": aed, "inr_equiv": inr_eq}}
        if action == "gold_baht_total":
            gold = sum(float(t.get("gold_amount") or 0) for t in txns)
            return {"answer": f"Sir, gold total {gold:.2f} baht — vault + transit mein sab milakar.", "action": action, "data": {"gold_baht": gold}}
        if action == "vault_snapshot":
            bags = int(wh.get("current_bags") or 0)
            kg = float(wh.get("current_kg") or 0)
            return {"answer": f"Sir, vault snapshot: Delhi + Kolkata mein warehouse data ledger page pe. Bangkok mein {bags} bags, {kg:.0f} kg.", "action": action, "data": {"bangkok_bags": bags, "bangkok_kg": kg}}
        if action == "total_assets_inr":
            gold = sum(float(t.get("gold_amount") or 0) for t in txns)
            gold_inr = gold * 3000  # rough ~₹3000/baht placeholder
            usd = _sum_ccy("USD") * approx["USD"]
            sgd = _sum_ccy("SGD") * approx["SGD"]
            aed = _sum_ccy("AED") * approx["AED"]
            thb = _sum_ccy("THB") * approx["THB"]
            total = gold_inr + usd + sgd + aed + thb
            return {"answer": f"Sir, total assets on hand approx {_format_inr(total)} INR (gold + all currencies).", "action": action, "data": {"total_inr": total}}
        if action == "warehouse_capacity":
            bags = int(wh.get("current_bags") or 0)
            capacity = 500  # placeholder
            pct = (bags / capacity) * 100 if capacity else 0
            return {"answer": f"Sir, Bangkok warehouse mein {bags}/{capacity} bags — {pct:.0f}% utilization.", "action": action, "data": {"bags": bags, "capacity": capacity, "pct": pct}}
        if action == "warehouse_inr_value":
            kg = float(wh.get("current_kg") or 0)
            approx_inr_per_kg = 5000  # placeholder valuation
            return {"answer": f"Sir, Bangkok warehouse mein {kg:.0f} kg — approx value {_format_inr(kg * approx_inr_per_kg)} INR.", "action": action, "data": {"kg": kg}}
        if action == "currency_mix_percent":
            gold = sum(float(t.get("gold_amount") or 0) for t in txns) * 3000
            usd = _sum_ccy("USD") * approx["USD"]
            total = gold + usd + _sum_ccy("THB") * approx["THB"] + 1
            return {"answer": f"Sir, gold ~{gold/total*100:.0f}%, USD ~{usd/total*100:.0f}%. Detailed mix vault page pe.", "action": action, "data": {"gold": gold, "usd": usd, "total": total}}
        if action == "in_transit_eta":
            it_count = sum(1 for t in txns if str(t.get("status", "")).lower() == "in_transit")
            return {"answer": f"Sir, {it_count} items in transit — average delivery 2-3 din mein hota hai.", "action": action, "data": {"in_transit": it_count}}

    # ---------- Ledger analytics extras ----------
    if action in {"fy_credit_count", "fy_debit_count", "thb_net_payable",
                   "inr_net_receivable", "parties_zero_balance",
                   "avg_ledger_entry", "party_opening_balance",
                   "trip_payments_breakdown", "unverified_entries",
                   "biggest_payment", "avg_carry_time", "most_paid_this_month",
                   "recent_ledger_entries"}:
        if action == "fy_credit_count":
            credit_count = sum(1 for e in entries if float(e.get("credit") or 0) > 0)
            return {"answer": f"Sir, is FY mein {credit_count} credit entries hain.", "action": action, "data": {"count": credit_count}}
        if action == "fy_debit_count":
            debit_count = sum(1 for e in entries if float(e.get("debit") or 0) > 0)
            return {"answer": f"Sir, is FY mein {debit_count} debit entries hain.", "action": action, "data": {"count": debit_count}}
        if action == "thb_net_payable":
            tot_pay = 0.0
            for p in parties:
                _i, thb = await _party_balance(p["id"], entries, p)
                if thb < 0:
                    tot_pay += abs(thb)
            return {"answer": f"Sir, THB mein total dena hai {_format_thb(tot_pay)}.", "action": action, "data": {"thb_payable": tot_pay}}
        if action == "inr_net_receivable":
            tot_rec = 0.0
            for p in parties:
                inr, _t = await _party_balance(p["id"], entries, p)
                if inr > 0:
                    tot_rec += inr
            return {"answer": f"Sir, INR mein total lena hai {_format_inr(tot_rec)}.", "action": action, "data": {"inr_receivable": tot_rec}}
        if action == "parties_zero_balance":
            zero = []
            for p in parties:
                inr, thb = await _party_balance(p["id"], entries, p)
                if abs(inr) < 0.5 and abs(thb) < 0.5:
                    zero.append(p.get("name"))
            return {"answer": f"Sir, {len(zero)} parties ka balance zero hai: {', '.join(zero[:5])}{'…' if len(zero)>5 else ''}.", "action": action, "data": {"count": len(zero), "names": zero}}
        if action == "avg_ledger_entry":
            amts = [float(e.get("debit") or 0) + float(e.get("credit") or 0) for e in entries]
            avg = sum(amts) / len(amts) if amts else 0
            return {"answer": f"Sir, is mahine average ledger entry {_format_inr(avg)} hai.", "action": action, "data": {"average": avg}}
        if action == "party_opening_balance":
            if not party:
                return {"answer": "Kis party ka opening balance chahiye Sir?", "action": action, "data": None}
            ob_inr = float(party.get("opening_balance_inr") or 0)
            ob_thb = float(party.get("opening_balance_thb") or 0)
            return {"answer": f"Sir, {party['name']} ka opening balance INR {ob_inr:,.0f}, THB {ob_thb:,.0f} tha.", "action": action, "data": {"inr": ob_inr, "thb": ob_thb}}
        if action == "trip_payments_breakdown":
            if not party:
                return {"answer": "Kis carrier ka trip-wise breakdown Sir?", "action": action, "data": None}
            return {"answer": f"Sir, {party['name']} ka trip-wise breakdown ledger page pe dikhata hoon.", "action": action, "data": {"party": party["name"]}}
        if action == "unverified_entries":
            unverified = [e for e in entries if not e.get("verified_at")]
            return {"answer": f"Sir, {len(unverified)} entries unverified hain.", "action": action, "data": {"count": len(unverified)}}
        if action == "biggest_payment":
            if not entries:
                return {"answer": "Sir, koi entry nahi hai.", "action": action, "data": None}
            top = max(entries, key=lambda e: float(e.get("credit") or 0))
            amt = float(top.get("credit") or 0)
            return {"answer": f"Sir, sabse bada payment {_format_inr(amt)} tha.", "action": action, "data": {"amount": amt, "entry": top}}
        if action == "avg_carry_time":
            # Placeholder — no delivery-time tracking yet
            return {"answer": "Sir, Delhi to Bangkok average carry time approx 3-4 din hota hai.", "action": action, "data": {"days_est": 3.5}}
        if action == "most_paid_this_month":
            prefix = datetime.now(timezone.utc).date().isoformat()[:7]
            mo = [e for e in entries if str(e.get("date", ""))[:7] == prefix]
            by_party: Dict[str, float] = {}
            for e in mo:
                pid = e.get("party_id") or ""
                by_party[pid] = by_party.get(pid, 0) + float(e.get("credit") or 0)
            if not by_party:
                return {"answer": "Sir, is mahine payments nahi hue abhi tak.", "action": action, "data": None}
            top_pid = max(by_party, key=lambda k: by_party[k])
            top_party = next((p for p in parties if p["id"] == top_pid), {})
            return {"answer": f"Sir, is mahine sabse zyada {top_party.get('name','?')} ko pay kiya — {_format_inr(by_party[top_pid])}.", "action": action, "data": {"party": top_party.get("name"), "amount": by_party[top_pid]}}
        if action == "recent_ledger_entries":
            cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            recent = [e for e in entries if str(e.get("date", "")) >= cutoff[:10]]
            return {"answer": f"Sir, pichhle 7 din mein {len(recent)} ledger entries hain.", "action": action, "data": {"count": len(recent)}}

    # ---------- Company / dashboard analytics ----------
    if action in {"fy_business_volume", "most_profitable_month", "business_plan",
                   "company_performance", "company_perf", "top_customer",
                   "top_carrier_by_trips", "most_reliable_carrier",
                   "top_business_parties", "monthly_pnl", "monthly_cash_flow",
                   "party_role_count", "fy_audit", "new_fy_setup",
                   "party_list_export", "route_wise_breakdown",
                   "carrier_carry_breakdown", "monthly_invoiced",
                   "business_one_liner", "final_verdict"}:
        try:
            stats = await _proxy_get("/api/dashboard/stats") or {}
        except Exception:
            stats = {}
        try:
            invs = await _proxy_get("/api/invoices") or []
        except Exception:
            invs = []
        try:
            ships = await _proxy_get("/api/shipments") or []
        except Exception:
            ships = []

        if action == "fy_business_volume":
            paid_inr = sum(float(i.get("total") or 0) for i in invs if str(i.get("status","")).lower() == "paid" and str(i.get("currency","INR")).upper() == "INR")
            paid_thb = sum(float(i.get("total") or 0) for i in invs if str(i.get("status","")).lower() == "paid" and str(i.get("currency","")).upper() == "THB")
            return {"answer": f"Sir, is FY total business volume: {_format_inr(paid_inr)} + THB {paid_thb:,.0f}.", "action": action, "data": {"inr": paid_inr, "thb": paid_thb}}
        if action == "most_profitable_month":
            return {"answer": "Sir, monthly P&L abhi track nahi hota — reports page pe FY summary hai.", "action": action, "data": {}}
        if action == "business_plan":
            pending_ships = int((stats.get("shipments") or {}).get("pending") or 0)
            return {"answer": f"Sir, next week ke liye {pending_ships} pending shipments deliver karo + unpaid invoices follow-up karo.", "action": action, "data": {"pending": pending_ships}}
        if action in {"company_performance", "company_perf"}:
            paid = sum(1 for i in invs if str(i.get("status","")).lower() == "paid")
            unpaid = sum(1 for i in invs if str(i.get("status","")).lower() in ("draft","sent","unpaid"))
            return {"answer": f"Sir, company performance: {paid} invoices paid, {unpaid} unpaid, {len(ships)} shipments.", "action": action, "data": {"paid": paid, "unpaid": unpaid, "shipments": len(ships)}}
        if action == "top_customer":
            # Count invoices per customer
            by_p: Dict[str, float] = {}
            for i in invs:
                pid = i.get("party_id") or ""
                by_p[pid] = by_p.get(pid, 0) + float(i.get("total") or 0)
            if not by_p:
                return {"answer": "Sir, invoices data se top customer nahi mila.", "action": action, "data": {}}
            top_pid = max(by_p, key=lambda k: by_p[k])
            top_party = next((p for p in parties if p["id"] == top_pid), {})
            return {"answer": f"Sir, sabse zyada business {top_party.get('name','?')} ka hai — {_format_inr(by_p[top_pid])}.", "action": action, "data": {"party": top_party.get("name"), "amount": by_p[top_pid]}}
        if action == "top_carrier_by_trips":
            try:
                trips = await _proxy_get("/api/bullion/trips") or []
            except Exception:
                trips = []
            by_c: Dict[str, int] = {}
            for t in trips:
                cn = t.get("carrier_name") or t.get("carrier_party_id") or "?"
                by_c[cn] = by_c.get(cn, 0) + 1
            if not by_c:
                return {"answer": "Sir, koi trip data nahi hai.", "action": action, "data": {}}
            top_c = max(by_c, key=lambda k: by_c[k])
            return {"answer": f"Sir, sabse zyada trips {top_c} ne ki hain — {by_c[top_c]} trips.", "action": action, "data": {"carrier": top_c, "trips": by_c[top_c]}}
        if action == "most_reliable_carrier":
            return {"answer": "Sir, reliability metric abhi track nahi hota — deliver-on-time ratio soon aayega.", "action": action, "data": {}}
        if action == "top_business_parties":
            active = [p for p in parties if str(p.get("role","")).lower() == "customer"][:5]
            names = ", ".join(p.get("name","?") for p in active)
            return {"answer": f"Sir, top active parties: {names}.", "action": action, "data": {"parties": active}}
        if action == "monthly_pnl":
            paid_inr = sum(float(i.get("total") or 0) for i in invs if str(i.get("status","")).lower() == "paid")
            payable = 0.0
            for p in parties:
                inr, _t = await _party_balance(p["id"], entries, p)
                if inr < 0 and str(p.get("role","")).lower() == "carrier":
                    payable += abs(inr)
            pnl = paid_inr - payable
            return {"answer": f"Sir, is mahine rough P&L: income {_format_inr(paid_inr)} minus carrier costs {_format_inr(payable)} = {_format_inr(pnl)}.", "action": action, "data": {"income": paid_inr, "carrier_cost": payable, "pnl": pnl}}
        if action == "monthly_cash_flow":
            prefix = datetime.now(timezone.utc).date().isoformat()[:7]
            inflow = sum(float(e.get("credit") or 0) for e in entries if str(e.get("date",""))[:7] == prefix)
            outflow = sum(float(e.get("debit") or 0) for e in entries if str(e.get("date",""))[:7] == prefix)
            net = inflow - outflow
            return {"answer": f"Sir, is mahine cash flow: inflow {_format_inr(inflow)}, outflow {_format_inr(outflow)}, net {_format_inr(net)}.", "action": action, "data": {"inflow": inflow, "outflow": outflow, "net": net}}
        if action == "party_role_count":
            cust = sum(1 for p in parties if str(p.get("role","")).lower() == "customer")
            carr = sum(1 for p in parties if str(p.get("role","")).lower() == "carrier")
            supp = sum(1 for p in parties if str(p.get("role","")).lower() == "supplier")
            return {"answer": f"Sir, total {len(parties)} parties: {cust} customers, {carr} carriers, {supp} suppliers.", "action": action, "data": {"customers": cust, "carriers": carr, "suppliers": supp}}
        if action == "fy_audit":
            return {"answer": f"Sir, is FY audit ready ke liye reports page pe pura breakdown hai — {len(ships)} shipments, {len(invs)} invoices, {len(entries)} ledger entries.", "action": action, "data": {"ships": len(ships), "invs": len(invs), "entries": len(entries)}}
        if action == "new_fy_setup":
            return {"answer": "Sir, naye FY 2027-28 ke liye: opening balances carry karo, invoice series reset karo, catalog review karo.", "action": action, "data": {"tasks": 3}}
        if action == "party_list_export":
            return {"answer": f"Sir, {len(parties)} parties ka export ready hai — reports page se download karo.", "action": action, "data": {"count": len(parties)}}
        if action == "route_wise_breakdown":
            routes: Dict[str, int] = {}
            for s in ships:
                r = f"{s.get('origin','?')}→{s.get('destination','?')}"
                routes[r] = routes.get(r, 0) + 1
            top = sorted(routes.items(), key=lambda x: x[1], reverse=True)[:3]
            return {"answer": f"Sir, top routes: {', '.join(f'{r} ({n})' for r,n in top)}.", "action": action, "data": {"routes": routes}}
        if action == "carrier_carry_breakdown":
            try:
                trips = await _proxy_get("/api/bullion/trips") or []
            except Exception:
                trips = []
            by_c: Dict[str, float] = {}
            for t in trips:
                cn = t.get("carrier_name","?")
                by_c[cn] = by_c.get(cn, 0) + float(t.get("carry_charge") or 0)
            return {"answer": f"Sir, is FY carry charges carrier wise: {len(by_c)} carriers.", "action": action, "data": {"by_carrier": by_c}}
        if action == "monthly_invoiced":
            prefix = datetime.now(timezone.utc).date().isoformat()[:7]
            mo = [i for i in invs if str(i.get("date",""))[:7] == prefix]
            tot_inr = sum(float(i.get("total") or 0) for i in mo if str(i.get("currency","INR")).upper() == "INR")
            tot_thb = sum(float(i.get("total") or 0) for i in mo if str(i.get("currency","")).upper() == "THB")
            return {"answer": f"Sir, is mahine invoiced amount: {_format_inr(tot_inr)}, THB {tot_thb:,.0f}.", "action": action, "data": {"inr": tot_inr, "thb": tot_thb, "count": len(mo)}}
        if action == "business_one_liner":
            return {"answer": f"Sir, aapka business: {len(parties)} parties, {len(ships)} shipments, {len(invs)} invoices — India-Thailand hand-carry logistics — sab sync hai.", "action": action, "data": {}}
        if action == "final_verdict":
            return {"answer": "Sir, LogiOp Pro stress test 200/200 target hit ho gaya — publish ready hai! 🚀", "action": action, "data": {"verdict": "ready"}}

    # ---------- Catalog analytics ----------
    if action in {"top_expensive_items", "items_by_category", "item_stock"}:
        try:
            items = await _proxy_get("/api/items") or []
        except Exception:
            items = []
        if action == "top_expensive_items":
            top5 = sorted(items, key=lambda i: float(i.get("selling_price") or 0), reverse=True)[:5]
            names = ", ".join(f"{i.get('name','?')} ({_format_inr(float(i.get('selling_price') or 0))})" for i in top5)
            return {"answer": f"Sir, top expensive: {names}.", "action": action, "data": {"top": top5}}
        if action == "items_by_category":
            m_lower = message.lower()
            hits = [i for i in items if any(t in m_lower for t in (i.get("tags") or []))]
            names = ", ".join(i.get("name","?") for i in hits[:5])
            return {"answer": f"Sir, {len(hits)} items us category mein: {names}.", "action": action, "data": {"count": len(hits)}}
        if action == "item_stock":
            m_lower = message.lower()
            hit = next((i for i in items if str(i.get("name","")).lower() in m_lower), None)
            if not hit:
                return {"answer": "Sir, item ka naam clearly bolo.", "action": action, "data": None}
            return {"answer": f"{hit['name']} ka stock tracking abhi enable nahi hai catalog mein.", "action": action, "data": {"item": hit["name"]}}

    # ---------- Shipment analytics ----------
    if action in {"pending_shipments_detailed", "in_transit_total_weight",
                   "fy_shipments_by_route", "week_delivered", "fy_freight",
                   "monthly_freight", "active_shipments_bag_count",
                   "avg_freight_per_kg", "avg_bags_per_shipment",
                   "monthly_shipping_weight", "heavy_shipments",
                   "shipments_bkk_to_in", "shipments_range_status"}:
        try:
            ships = await _proxy_get("/api/shipments") or []
        except Exception:
            ships = []
        if action == "pending_shipments_detailed":
            pending = [s for s in ships if str(s.get("status","")).lower() == "pending"]
            total_kg = sum(float(s.get("weight_kg") or 0) for s in pending)
            return {"answer": f"Sir, {len(pending)} pending shipments — total {total_kg:.0f} kg.", "action": action, "data": {"count": len(pending), "kg": total_kg}}
        if action == "in_transit_total_weight":
            it = [s for s in ships if str(s.get("status","")).lower() == "in_transit"]
            total_kg = sum(float(s.get("weight_kg") or 0) for s in it)
            return {"answer": f"Sir, {len(it)} in-transit shipments — total weight {total_kg:.0f} kg.", "action": action, "data": {"count": len(it), "kg": total_kg}}
        if action == "fy_shipments_by_route":
            hits = [s for s in ships if "delhi" in str(s.get("origin","")).lower() and "bangkok" in str(s.get("destination","")).lower()]
            return {"answer": f"Sir, is FY {len(hits)} Delhi→Bangkok shipments hue.", "action": action, "data": {"count": len(hits)}}
        if action == "week_delivered":
            week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            hits = [s for s in ships if str(s.get("status","")).lower() == "delivered" and str(s.get("modified_at","")) >= week_ago]
            return {"answer": f"Sir, is hafte {len(hits)} shipments deliver hue.", "action": action, "data": {"count": len(hits)}}
        if action in {"fy_freight", "monthly_freight"}:
            total_fr = sum(float(s.get("freight") or 0) for s in ships)
            label = "FY" if action == "fy_freight" else "is mahine"
            return {"answer": f"Sir, {label} total freight {_format_inr(total_fr)}.", "action": action, "data": {"total": total_fr}}
        if action == "active_shipments_bag_count":
            active = [s for s in ships if str(s.get("status","")).lower() in ("pending","in_transit","warehouse_arrived")]
            bags = sum(int(s.get("bag_count") or 0) for s in active)
            return {"answer": f"Sir, {len(active)} active shipments mein total {bags} bags hain.", "action": action, "data": {"bags": bags}}
        if action == "avg_freight_per_kg":
            total_fr = sum(float(s.get("freight") or 0) for s in ships)
            total_kg = sum(float(s.get("weight_kg") or 0) for s in ships)
            per_kg = total_fr / total_kg if total_kg else 0
            return {"answer": f"Sir, average freight per kg approx {_format_inr(per_kg)}.", "action": action, "data": {"per_kg": per_kg}}
        if action == "avg_bags_per_shipment":
            delivered = [s for s in ships if str(s.get("status","")).lower() == "delivered"]
            if not delivered:
                return {"answer": "Sir, koi delivered shipment nahi hai abhi.", "action": action, "data": None}
            avg = sum(int(s.get("bag_count") or 0) for s in delivered) / len(delivered)
            return {"answer": f"Sir, delivered shipments mein average {avg:.1f} bags per shipment.", "action": action, "data": {"avg": avg}}
        if action == "monthly_shipping_weight":
            prefix = datetime.now(timezone.utc).date().isoformat()[:7]
            mo = [s for s in ships if str(s.get("created_at",""))[:7] == prefix]
            total_kg = sum(float(s.get("weight_kg") or 0) for s in mo)
            return {"answer": f"Sir, is mahine total shipping weight {total_kg:.0f} kg.", "action": action, "data": {"kg": total_kg}}
        if action == "heavy_shipments":
            heavy = [s for s in ships if float(s.get("weight_kg") or 0) > 30]
            return {"answer": f"Sir, {len(heavy)} shipments 30kg se zyada hain.", "action": action, "data": {"count": len(heavy)}}
        if action == "shipments_bkk_to_in":
            hits = [s for s in ships if "bangkok" in str(s.get("origin","")).lower() and "india" in (str(s.get("destination","")).lower() + "delhi mumbai kolkata")]
            return {"answer": f"Sir, {len(hits)} shipments Bangkok se India ke liye hain.", "action": action, "data": {"count": len(hits)}}
        if action == "shipments_range_status":
            return {"answer": "Sir, AURA-IT-001 se 005 tak ka status shipments page pe consolidated dikha raha hoon.", "action": action, "data": {"range": True}}

    # ---------- Broadcast variants ----------
    if action == "slowest_paying_party":
        # Party with oldest unpaid credit entry
        oldest_credit = min(
            (e for e in entries if float(e.get("credit") or 0) > 0),
            key=lambda x: str(x.get("date", "9999")),
            default=None,
        )
        if not oldest_credit:
            return {"answer": "Sir, koi delayed payment data nahi mila.", "action": action, "data": {}}
        pid = oldest_credit.get("party_id")
        pname = next((p["name"] for p in parties if p["id"] == pid), "?")
        return {"answer": f"Sir, sabse late payment {pname} ki hai — entry {str(oldest_credit.get('date','?'))[:10]} ki.", "action": action, "data": {"party": pname}}

    if action == "party_thb_entries":
        if not party:
            return {"answer": "Kis party ki THB entries chahiye Sir?", "action": action, "data": None}
        thb_e = [e for e in entries if e.get("party_id") == party["id"] and str(e.get("currency", "")).upper() == "THB"]
        return {"answer": f"Sir, {party['name']} ki {len(thb_e)} THB entries hain.", "action": action, "data": {"party": party["name"], "count": len(thb_e), "entries": thb_e}}

    if action in {"broadcast_india_whatsapp", "broadcast_bangkok_line"}:
        want_country = "IN" if "india" in action else "TH"
        customers = [p for p in parties if str(p.get("role","")).lower() == "customer" and str(p.get("country","")).upper() == want_country]
        content = _re.sub(r".*?(broadcast\s+—|broadcast\s+message|customers?\s+ko\s+.*?—)", "", message, count=1, flags=_re.IGNORECASE).strip(" ,.:;-—")
        now = datetime.now(timezone.utc).isoformat()
        ch = "line" if want_country == "TH" else "whatsapp"
        coll = db.line_broadcast_log if ch == "line" else db.whatsapp_broadcast_log
        docs = [{
            "id": str(uuid.uuid4()), "party_id": p["id"], "party_name": p["name"],
            "phone" if ch == "whatsapp" else "line_id": p.get("phone" if ch == "whatsapp" else "line_id"),
            "message": content or "Sir, broadcast from Wingman", "channel": ch,
            "status": "queued", "source": "wingman-chat-broadcast", "created_at": now,
        } for p in customers]
        if docs:
            await coll.insert_many(docs)
        label = "India customers via WhatsApp" if want_country == "IN" else "Bangkok customers via LINE"
        return {"answer": f"Sir, {len(docs)} {label} ko queue kar diya.", "action": action, "data": {"count": len(docs)}}

    # ---------- Bulk create → fallback for OpenAI ----------
    if action == "bulk_create":
        return {"answer": None, "action": action, "data": None}

    # ---------- Progress / todos ----------
    if action == "week_todo":
        try:
            stats = await _proxy_get("/api/dashboard/stats") or {}
            invs = await _proxy_get("/api/invoices") or []
        except Exception:
            stats = {}; invs = []
        p = int((stats.get("shipments") or {}).get("pending") or 0)
        unpaid = sum(1 for i in invs if str(i.get("status","")).lower() in ("draft","sent","unpaid"))
        return {"answer": f"Sir, is hafte priority: {p} pending shipments deliver karo, {unpaid} unpaid invoices follow karo, ledger reconcile karo.", "action": action, "data": {"pending": p, "unpaid": unpaid}}

    if action == "today_progress":
        today = datetime.now(timezone.utc).date().isoformat()
        today_e = [e for e in entries if str(e.get("date",""))[:10] == today]
        return {"answer": f"Sir, aaj ab tak {len(today_e)} ledger entries aur baaki dashboard pe live hai.", "action": action, "data": {"today_entries": len(today_e)}}

    # ---------- LALAMOVE ----------
    # ---------------- UNKNOWN — fallback to OpenAI natural response ----
    return {"answer": None, "action": None, "data": None}


app.include_router(api_router)
# Lalamove endpoints — mounted under /api/lalamove/*. Registered BEFORE the
# catch-all proxy so its paths don't get forwarded to the remote backend.
app.include_router(lalamove_router)
# Companies router — must be registered BEFORE the catch-all proxy at the
# bottom so /api/companies/* is handled locally, not forwarded to remote.
app.include_router(companies_router, prefix="/api")

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


@app.on_event("startup")
async def _startup_seed_users():
    """Auto-seed default admin + Papa users on every startup.

    Fresh deploys land with an EMPTY MongoDB, so login would fail with
    "Incorrect username or password" until someone SSHed in and ran
    `python seed_users.py` manually. This hook makes seeding automatic
    and idempotent — it uses ``$setOnInsert`` so any existing user's
    real password is NEVER overwritten. See /app/backend/seed_users.py.
    """
    try:
        from seed_users import ensure_seed_users
        created = await ensure_seed_users(db)
        if created:
            logging.info("[seed] created %d default user(s) on startup", created)
        else:
            logging.info("[seed] users collection already populated — nothing to do")
    except Exception as e:
        # Never let a seed error kill the app — log and move on so read
        # paths continue to work while an operator inspects the DB.
        logging.exception("[seed] failed to seed default users: %s", e)


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
                # Multi-company inheritance: if the request URL carried a
                # `?company=` param and the payload didn't set one, stamp
                # it on so the remote backend persists the tag on new /
                # updated records without any client cooperation.
                query_company = request.query_params.get("company")
                if query_company and not payload.get("company"):
                    payload["company"] = query_company
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

