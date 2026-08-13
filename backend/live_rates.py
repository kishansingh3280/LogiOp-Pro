"""
Live Rates scraper module — Phase 7 · Batch C-2 · Fix 6.

Fetches gold + currency rates every 60 seconds from four public
sources and stores them in the MongoDB `live_rates` collection.

Sources (best-effort, non-fatal on failure):
    • SLN Bullion (India)          — daily gold sell rate in INR
    • InterGold Thailand           — Thai gold buy rate in THB (per baht)
    • Super Rich Thailand          — INR↔THB + USD↔THB currency rates
    • XE.com                       — cross-currency rates (INR/USD/THB)

Design goals:
    • ZERO impact on the request loop — all fetches run on an
      APScheduler AsyncIOScheduler background job.
    • Any scraper failure is caught + logged. The stored row keeps
      the last successful `rates` payload and flips `ok=false`.
    • The public GET /api/live-rates endpoint always returns a
      response, even if all four scrapers are currently failing;
      each source is stamped with `is_stale=true` when its
      `fetched_at` is older than STALE_AFTER_SECS (default 300 s).
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger("live_rates")

# ── Constants ────────────────────────────────────────────────────
POLL_SECS = 60                # scheduler interval
STALE_AFTER_SECS = 300        # 5 minutes → marked stale
HTTP_TIMEOUT = 15.0

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)
_HEADERS = {
    "User-Agent": _UA,
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8,th;q=0.7",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

SOURCES = ("sln_bullion", "intergold_th", "superrich_th", "xe")


# ── Helpers ──────────────────────────────────────────────────────
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _num(txt: Optional[str]) -> Optional[float]:
    """Extract the first number from a string like '₹ 82,340.00 /10 gm'."""
    if not txt:
        return None
    m = re.search(r"[-+]?\d[\d,]*\.?\d*", txt)
    if not m:
        return None
    try:
        return float(m.group(0).replace(",", ""))
    except (ValueError, TypeError):
        return None


async def _http_get(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT, headers=_HEADERS, follow_redirects=True
        ) as c:
            r = await c.get(url)
            r.raise_for_status()
            return r.text
    except Exception as e:
        log.warning("[live_rates] fetch %s failed: %s", url, e)
        return None


# ── Scraper 1 · SLN Bullion / GoodReturns India (gold INR / 10 gm) ──
async def scrape_sln_bullion() -> Optional[Dict[str, Any]]:
    """Fetch India gold sell rate.

    SLN Bullion's public homepage is login-gated for the actual
    rate ticker, so we use GoodReturns as the canonical open source
    for daily India gold prices (24K / 22K / 18K per gram). Its
    HTML is stable and shows values as "24K Gold /g ₹15,360".
    """
    html = await _http_get("https://www.goodreturns.in/gold-rates/")
    if not html:
        return None
    try:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ", strip=True)
        rates: Dict[str, Any] = {}
        for karat, key in [("24K", "gold_24k_1g_inr"), ("22K", "gold_22k_1g_inr"), ("18K", "gold_18k_1g_inr")]:
            m = re.search(rf"{karat}\s*Gold\s*/g\s*₹\s*([\d,]{{3,10}})", text)
            if m:
                rates[key] = _num(m.group(1))
        # Also expose per-10g for parity with other India sources
        if "gold_24k_1g_inr" in rates and rates["gold_24k_1g_inr"]:
            rates["gold_24k_10g_inr"] = rates["gold_24k_1g_inr"] * 10
        if "gold_22k_1g_inr" in rates and rates["gold_22k_1g_inr"]:
            rates["gold_22k_10g_inr"] = rates["gold_22k_1g_inr"] * 10
        # Silver — GoodReturns page pattern: "Silver Rate ... ₹96,500 per kg"
        ms = re.search(r"Silver[^\d]{0,60}₹\s*([\d,]{4,10})", text)
        if ms:
            rates["silver_1kg_inr"] = _num(ms.group(1))
        if not rates:
            return None
        rates["source_url"] = "goodreturns.in/gold-rates"
        rates["unit"] = "INR per gram (gold), INR per kg (silver)"
        return rates
    except Exception as e:
        log.warning("[live_rates] sln_bullion parse failed: %s", e)
        return None


# ── Scraper 2 · InterGold Thailand (Thai gold price per baht) ───
async def scrape_intergold_th() -> Optional[Dict[str, Any]]:
    """Fetch Thai gold buy/sell rates (baht weight, ~15.244 g).

    The Thai Gold Traders Association renders prices client-side
    via JS, so we hit a public JSON mirror (api.chnwt.dev) that
    republishes the exact same data-feed InterGold + MTS Gold pull
    from. Falls back to raw HTML grep if the mirror is offline.
    """
    # 1) Primary: JSON mirror
    try:
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT, headers=_HEADERS, follow_redirects=True
        ) as c:
            r = await c.get("https://api.chnwt.dev/thai-gold-api/latest")
            if r.status_code == 200:
                data = r.json()
                price = (data.get("response") or {}).get("price") or {}
                rates: Dict[str, Any] = {}
                bar = price.get("gold_bar") or {}
                orn = price.get("gold") or {}
                if bar.get("buy"):
                    rates["gold_bar_buy_thb"] = _num(bar["buy"])
                if bar.get("sell"):
                    rates["gold_bar_sell_thb"] = _num(bar["sell"])
                if orn.get("buy"):
                    rates["gold_ornament_buy_thb"] = _num(orn["buy"])
                if orn.get("sell"):
                    rates["gold_ornament_sell_thb"] = _num(orn["sell"])
                if rates:
                    rates["source_url"] = "goldtraders.or.th (via chnwt mirror)"
                    rates["unit"] = "THB per baht-weight (~15.244 g)"
                    return rates
    except Exception as e:
        log.warning("[live_rates] intergold_th json mirror failed: %s", e)
    # 2) Fallback: HTML from goldtraders.or.th
    html = await _http_get("https://www.goldtraders.or.th/")
    if not html:
        return None
    try:
        text = BeautifulSoup(html, "lxml").get_text(" ", strip=True)
        m_bar = re.search(
            r"ทองคำแท่ง[^\d]{0,40}([\d,]{5,10})[^\d]{1,30}([\d,]{5,10})", text
        )
        rates = {}
        if m_bar:
            rates["gold_bar_buy_thb"] = _num(m_bar.group(1))
            rates["gold_bar_sell_thb"] = _num(m_bar.group(2))
        if not rates:
            return None
        rates["unit"] = "THB per baht-weight (~15.244 g)"
        return rates
    except Exception as e:
        log.warning("[live_rates] intergold_th html parse failed: %s", e)
        return None


# ── Scraper 3 · Super Rich Thailand / Grand Super Rich (currency) ──
async def scrape_superrich_th() -> Optional[Dict[str, Any]]:
    """Fetch INR / USD / EUR / SGD → THB rates.

    Super Rich Thailand's main site is an Angular SPA — the actual
    rates load via an auth-gated /api endpoint. Grand Super Rich
    (Green booth, Pratunam) is a sister brand whose homepage
    ServerSide-renders a full table of buy/sell rates and is
    reliably scrapable.
    """
    html = await _http_get("https://www.grandsuperrich.com/")
    if not html:
        return None
    try:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ", strip=True)
        rates: Dict[str, Any] = {}
        # Row pattern seen: "India INR 500-10 0.325 0.340"
        # We take the LAST two floats on each currency row.
        for code, key_prefix in [
            ("INR", "inr"),
            ("USD", "usd"),
            ("EUR", "eur"),
            ("SGD", "sgd"),
            ("AED", "aed"),
            ("GBP", "gbp"),
        ]:
            # Match currency code followed (within 60 chars) by two decimals
            m = re.search(
                rf"\b{code}\b[^\n]{{0,80}}?([\d]+\.[\d]{{2,6}})\s+([\d]+\.[\d]{{2,6}})",
                text,
            )
            if m:
                buy = float(m.group(1))
                sell = float(m.group(2))
                rates[f"{key_prefix}_thb_buy"] = buy
                rates[f"{key_prefix}_thb_sell"] = sell
        if not rates:
            return None
        rates["source_url"] = "grandsuperrich.com"
        rates["unit"] = "THB per 1 foreign unit (buy / sell columns)"
        return rates
    except Exception as e:
        log.warning("[live_rates] superrich_th parse failed: %s", e)
        return None


# ── Scraper 4 · XE.com currency mid-market rates ────────────────
async def scrape_xe() -> Optional[Dict[str, Any]]:
    """Fetch INR/THB/USD mid-market rates from XE.

    XE renders rates via a JSON blob embedded in the page. Rather
    than depending on their private API contract we grep the HTML
    for the summary text "1 USD = 83.42 INR" style sentences.
    """
    html = await _http_get(
        "https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=INR"
    )
    if not html:
        return None
    try:
        soup = BeautifulSoup(html, "lxml")
        text = soup.get_text(" ", strip=True)
        rates: Dict[str, Any] = {}
        for src, dst, key in [
            ("USD", "INR", "usd_inr"),
            ("USD", "THB", "usd_thb"),
            ("INR", "THB", "inr_thb"),
            ("THB", "INR", "thb_inr"),
        ]:
            m = re.search(
                rf"1\s*{src}\s*=\s*([\d,]+\.\d{{2,6}})\s*{dst}", text, re.I
            )
            if m:
                rates[key] = _num(m.group(1))
        # If USD→INR wasn't in the page (we only requested USD→INR),
        # fetch the other pairs on demand as a fallback.
        if "inr_thb" not in rates:
            more = await _http_get(
                "https://www.xe.com/currencyconverter/convert/?Amount=1&From=INR&To=THB"
            )
            if more:
                m = re.search(
                    r"1\s*INR\s*=\s*([\d,]+\.\d{2,6})\s*THB", more, re.I
                )
                if m:
                    rates["inr_thb"] = _num(m.group(1))
        if not rates:
            return None
        rates["unit"] = "mid-market rate (1 base = N quote)"
        return rates
    except Exception as e:
        log.warning("[live_rates] xe parse failed: %s", e)
        return None


# ── Persistence helpers ──────────────────────────────────────────
_SCRAPERS = {
    "sln_bullion": scrape_sln_bullion,
    "intergold_th": scrape_intergold_th,
    "superrich_th": scrape_superrich_th,
    "xe": scrape_xe,
}


async def _run_one(db, source: str) -> None:
    fn = _SCRAPERS.get(source)
    if not fn:
        return
    try:
        rates = await fn()
        if rates:
            await db.live_rates.update_one(
                {"source": source},
                {
                    "$set": {
                        "source": source,
                        "rates": rates,
                        "fetched_at": _now_iso(),
                        "ok": True,
                        "error": None,
                    }
                },
                upsert=True,
            )
            log.info("[live_rates] %s ok — keys=%s", source, list(rates.keys()))
        else:
            # Keep the old rates payload but flag the failure.
            await db.live_rates.update_one(
                {"source": source},
                {
                    "$set": {
                        "source": source,
                        "last_attempt": _now_iso(),
                        "ok": False,
                        "error": "empty_or_unparseable",
                    },
                    "$setOnInsert": {"rates": {}, "fetched_at": None},
                },
                upsert=True,
            )
            log.info("[live_rates] %s empty payload", source)
    except Exception as e:
        log.exception("[live_rates] %s job crashed: %s", source, e)


async def poll_all_sources(db) -> None:
    """Fan-out all four scrapers concurrently."""
    await asyncio.gather(*(_run_one(db, s) for s in SOURCES))


async def build_response(db) -> Dict[str, Any]:
    """Aggregate every source's latest doc + stamp is_stale flags."""
    out: Dict[str, Any] = {"sources": {}, "fetched_at": _now_iso()}
    now = datetime.now(timezone.utc)
    async for doc in db.live_rates.find({}):
        src = doc.get("source")
        if not src:
            continue
        fetched_at = doc.get("fetched_at")
        is_stale = True
        try:
            if fetched_at:
                ts = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
                is_stale = (now - ts) > timedelta(seconds=STALE_AFTER_SECS)
        except Exception:
            is_stale = True
        out["sources"][src] = {
            "rates": doc.get("rates") or {},
            "fetched_at": fetched_at,
            "ok": bool(doc.get("ok")),
            "error": doc.get("error"),
            "is_stale": is_stale,
        }
    # Include placeholder rows for any source that has never populated
    for s in SOURCES:
        out["sources"].setdefault(
            s,
            {
                "rates": {},
                "fetched_at": None,
                "ok": False,
                "error": "no_data_yet",
                "is_stale": True,
            },
        )
    return out


# ── Scheduler bootstrap ──────────────────────────────────────────
_scheduler = None  # type: Any


def start_scheduler(db) -> None:
    """Attach an AsyncIOScheduler to the current running loop.

    Must be called from within an async startup event so the running
    asyncio loop is available. Idempotent — a second call is a no-op.
    """
    global _scheduler
    if _scheduler is not None:
        return
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        poll_all_sources,
        "interval",
        seconds=POLL_SECS,
        args=[db],
        id="live_rates_poll",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=45,
        next_run_time=datetime.now(timezone.utc) + timedelta(seconds=3),
    )
    _scheduler.start()
    log.info("[live_rates] scheduler started · %ss interval", POLL_SECS)


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        try:
            _scheduler.shutdown(wait=False)
        except Exception:
            pass
        _scheduler = None
