"""Lalamove integration — quote, order, status, cancel, webhook.

Everything is proxied through this module so the Lalamove API secret is
NEVER touched by the mobile client. Signatures are HMAC-SHA256 over a
canonical string (`ts\r\nMETHOD\r\nPATH\r\n\r\nbody`) per Lalamove v3.

Config lives in `backend/.env`:
    LALAMOVE_BASE_URL   (default: sandbox)
    LALAMOVE_API_KEY
    LALAMOVE_API_SECRET
    LALAMOVE_MARKET     (e.g. IN, IN_MAA, IN_BLR, IN_DEL, IN_HYD)

When credentials are missing the /quote /order /status endpoints return
503 with a friendly message so the UI can guide Kishan Sir to paste keys.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from typing import Any, Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

load_dotenv()

BASE = os.environ.get("LALAMOVE_BASE_URL", "https://rest.sandbox.lalamove.com")
KEY = os.environ.get("LALAMOVE_API_KEY", "")
SECRET = os.environ.get("LALAMOVE_API_SECRET", "")
MARKET = os.environ.get("LALAMOVE_MARKET", "IN")

router = APIRouter(prefix="/api/lalamove", tags=["lalamove"])


class Point(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    address: str = ""


class Delivery(BaseModel):
    pickup: Point
    dropoff: Point
    service_type: str = "MOTORCYCLE"  # MOTORCYCLE | CAR | VAN — market-specific
    sender_name: str
    sender_phone: str
    recipient_name: str
    recipient_phone: str
    remarks: Optional[str] = None
    # Populated on the /order call from a prior /quote response.
    quotation_id: Optional[str] = None
    quoted_total_fee: Optional[dict] = None


def _configured() -> bool:
    return bool(KEY and SECRET)


def _canonical_body(payload: Optional[dict]) -> str:
    if payload is None:
        return ""
    # Compact JSON — same bytes we sign AND send.
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)


def _auth_header(method: str, path: str, body: str = "") -> str:
    ts = str(int(time.time() * 1000))
    raw = f"{ts}\r\n{method.upper()}\r\n{path}\r\n\r\n{body}"
    sig = hmac.new(SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"hmac {KEY}:{ts}:{sig}"


async def _call(method: str, path: str, payload: Optional[dict] = None) -> Any:
    if not _configured():
        raise HTTPException(
            status_code=503,
            detail={
                "error": "lalamove_not_configured",
                "message": "Lalamove API keys not set. Ask an Admin to add LALAMOVE_API_KEY and LALAMOVE_API_SECRET to backend/.env.",
            },
        )
    body = _canonical_body(payload)
    headers = {
        "Authorization": _auth_header(method, path, body),
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Market": MARKET,
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.request(method, BASE + path, content=body or None, headers=headers)
    if r.status_code >= 400:
        # Bubble up the provider error for the UI to display.
        try:
            body_json = r.json()
        except Exception:
            body_json = {"detail": r.text}
        raise HTTPException(status_code=r.status_code, detail=body_json)
    return r.json() if r.content else {}


def _stop(p: Point) -> dict:
    return {
        "coordinates": {"lat": str(p.lat), "lng": str(p.lng)},
        "address": p.address,
    }


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@router.get("/config")
async def lalamove_config():
    """Frontend polls this on load to know whether to enable booking or
    show a "keys missing" state."""
    return {
        "configured": _configured(),
        "market": MARKET,
        "base_url": BASE,
        "sandbox": "sandbox" in BASE.lower(),
    }


@router.get("/cities")
async def lalamove_cities():
    """Returns the list of enabled cities & service keys for our account.
    Cached client-side for the session so the frontend picker can filter."""
    return await _call("GET", "/v3/cities")


@router.post("/quote")
async def lalamove_quote(d: Delivery, request: Request):
    payload = {
        "data": {
            "serviceType": d.service_type,
            "stops": [_stop(d.pickup), _stop(d.dropoff)],
            "language": "en_IN",
        }
    }
    result = await _call("POST", "/v3/quotations", payload)
    # Persist for our records with audit stamp.
    db = request.app.state.db
    now_ms = int(time.time() * 1000)
    quote_doc = {
        "quotation_id": (result.get("data") or {}).get("quotationId"),
        "request": d.dict(),
        "response": result,
        "created_at_ms": now_ms,
        "created_by": getattr(request.state, "audit_username", "system"),
    }
    await db.lalamove_quotes.insert_one(quote_doc)
    return result


@router.post("/order")
async def lalamove_order(d: Delivery, request: Request):
    if not d.quotation_id or not d.quoted_total_fee:
        raise HTTPException(
            status_code=400,
            detail="quotation_id and quoted_total_fee are required (call /quote first)",
        )
    payload = {
        "data": {
            "quotationId": d.quotation_id,
            "quotedTotalFee": d.quoted_total_fee,
            "requesterContact": {"name": d.sender_name, "phone": d.sender_phone},
            "stops": [_stop(d.pickup), _stop(d.dropoff)],
            "deliveries": [
                {
                    "toStop": 1,
                    "toContact": {"name": d.recipient_name, "phone": d.recipient_phone},
                    "remarks": d.remarks or "",
                }
            ],
        }
    }
    result = await _call("POST", "/v3/orders", payload)
    data = result.get("data", result)
    order_id = data.get("orderId") or data.get("id")
    db = request.app.state.db
    order_doc = {
        "_id": order_id,
        "order_id": order_id,
        "status": data.get("status") or "CREATED",
        "share_link": data.get("shareLink"),
        "driver_id": data.get("driverId"),
        "request": d.dict(),
        "response": result,
        "created_at_ms": int(time.time() * 1000),
        "created_by": getattr(request.state, "audit_username", "system"),
        "entry_source": getattr(request.state, "audit_source", "manual"),
    }
    await db.lalamove_orders.insert_one(order_doc)
    return result


@router.get("/order/{order_id}")
async def lalamove_order_status(order_id: str, request: Request):
    result = await _call("GET", f"/v3/orders/{order_id}")
    data = result.get("data", result)
    db = request.app.state.db
    await db.lalamove_orders.update_one(
        {"_id": order_id},
        {"$set": {"status": data.get("status"), "last_response": result}},
    )
    return result


@router.get("/orders")
async def lalamove_list_orders(request: Request, limit: int = 50):
    """List locally-stored orders (with audit fields). No provider round-trip."""
    db = request.app.state.db
    docs = (
        await db.lalamove_orders.find().sort("created_at_ms", -1).to_list(limit)
    )
    for d in docs:
        d["_id"] = str(d.get("_id"))
    return docs


@router.post("/order/{order_id}/cancel")
async def lalamove_cancel(order_id: str, request: Request):
    result = await _call("DELETE", f"/v3/orders/{order_id}")
    db = request.app.state.db
    await db.lalamove_orders.update_one(
        {"_id": order_id},
        {"$set": {"status": "CANCELED", "cancel_response": result}},
    )
    return result


@router.post("/webhook")
async def lalamove_webhook(request: Request):
    """Receive real-time delivery updates from Lalamove.

    Verifies HMAC signature over the exact raw body so any tamper is
    rejected. Never parses+re-serialises the JSON before verification.
    """
    raw = await request.body()
    authorization = request.headers.get("authorization", "")
    try:
        scheme, token = authorization.split(" ", 1)
        api_key, ts, supplied = token.split(":", 2)
        if scheme.lower() != "hmac" or not hmac.compare_digest(api_key, KEY):
            raise ValueError("bad key")
        path = request.url.path
        raw_string = f"{ts}\r\nPOST\r\n{path}\r\n\r\n" + raw.decode()
        expected = hmac.new(SECRET.encode(), raw_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, supplied):
            raise ValueError("bad sig")
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid webhook signature")

    event = json.loads(raw)
    data = event.get("data", {})
    order = data.get("order", data)
    order_id = data.get("orderId") or order.get("orderId") or order.get("id")
    status = order.get("status") or data.get("status")
    db = request.app.state.db
    if order_id:
        await db.lalamove_orders.update_one(
            {"_id": order_id},
            {
                "$set": {"status": status, "last_webhook": event},
                "$push": {"webhook_events": event},
            },
            upsert=True,
        )
    return {"ok": True}
