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

_ASSISTANT_SYSTEM_HI = """
आप एक विशेषज्ञ लॉजिस्टिक्स सहायक हैं जो एक भारतीय-थाई हैंड-कैरी बिज़नेस चलाने वाले
ऑपरेटर के लिए काम करते हैं। हमेशा शुद्ध हिंदी (देवनागरी) में जवाब दें, संक्षिप्त
और व्यावसायिक टोन में। दो-लाइन के भीतर उत्तर देने की कोशिश करें ताकि वॉइस पर सुनने
में स्वाभाविक लगे।

जब उपयोगकर्ता कोई कार्रवाई माँगे (जैसे "ललित के लिए बैग जोड़ो"), तो केवल एक JSON
ब्लॉक भी दें, जैसे:
```json
{"action":"add_bag","party_name":"ललित","weight_kg":5,"notes":"..."}
```
JSON के बाहर एक छोटी पुष्टि लाइन दें।
"""


class AssistantMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    session_id: str
    message: str
    history: List[AssistantMessage] = Field(default_factory=list)


@api_router.post("/assistant/chat")
async def assistant_chat(req: AssistantChatRequest):
    """SSE streaming Claude Sonnet response. Turn writes are fired-and-
    forgotten so time-to-first-token stays under the operator's 2s SLA."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    # Fire user turn persistence asynchronously so it doesn't gate the first
    # streamed byte. Silent failure is acceptable here — chat still lands.
    async def _persist_user():
        try:
            await db.assistant_messages.insert_one({
                "id": str(uuid.uuid4()),
                "session_id": req.session_id,
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

    chat = (
        LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=req.session_id,
            system_message=_ASSISTANT_SYSTEM_HI + memory_block,
        )
        .with_model("anthropic", "claude-sonnet-4-6")
    )

    async def event_gen():
        # Immediate keep-alive comment frame — flushes the connection buffer
        # so the client's TTFT clock actually starts ticking.
        yield ": ping\n\n"
        buf = ""
        try:
            async for event in chat.stream_message(UserMessage(text=req.message)):
                if isinstance(event, TextDelta):
                    buf += event.content
                    yield f"data: {event.content}\n\n"
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


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "nova"   # nova/shimmer are the most natural for Hindi


@api_router.post("/assistant/tts")
async def assistant_tts(req: TTSRequest):
    """Text → audio/mpeg via OpenAI TTS through the Emergent proxy.
    Uses `nova` as the default voice — best natural Hindi delivery on tts-1."""
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

