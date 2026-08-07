from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict
import uuid
from datetime import datetime, timezone
import httpx


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

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


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
async def bullion_create_trip(trip: BullionTrip):
    # Pydantic v1: use .dict() so `extra="allow"` fields are preserved.
    doc = trip.dict()
    # If the client sent the older `available_slots` but not `available_weight_kg`,
    # mirror the value so downstream aggregations keep working.
    if not doc.get("available_weight_kg") and doc.get("available_slots"):
        doc["available_weight_kg"] = float(doc["available_slots"])
    await db.bullion_trips.insert_one(doc.copy())
    return _clean_mongo_id(doc)


@api_router.put("/bullion/trips/{trip_id}")
async def bullion_update_trip(trip_id: str, patch: Dict[str, Any]):
    patch.pop("id", None)
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
async def bullion_create_txn(txn: BullionTransaction):
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
    await db.bullion_transactions.insert_one(doc.copy())
    return _clean_mongo_id(doc)


@api_router.put("/bullion/transactions/{txn_id}")
async def bullion_update_txn(txn_id: str, patch: Dict[str, Any]):
    patch.pop("id", None)
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
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.bullion_rates.update_one(
        {"_singleton": True}, {"$set": patch, "$setOnInsert": {"_singleton": True}}, upsert=True,
    )
    doc = await db.bullion_rates.find_one({"_singleton": True})
    return _clean_mongo_id(doc or {})


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
app.include_router(api_router)

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
    body = await request.body()

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
