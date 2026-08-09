"""Companies router — CRUD + summary for the Multi-Company feature.

Kept intentionally small (list / create / per-company summary) so the
mobile client can render the company switcher and any per-brand stats.
The heavier reporting endpoints live on the remote proxy target.
"""
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from models.company import Company


router = APIRouter(prefix="/companies", tags=["companies"])


def _db(request: Request):
    """Grab the shared Motor DB from `app.state` set up in server.py."""
    return request.app.state.db


def _clean(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_companies(request: Request):
    docs = await _db(request).companies.find().sort("name", 1).to_list(100)
    return [_clean(d) for d in docs]


@router.post("")
async def create_company(company: Company, request: Request):
    db = _db(request)
    existing = await db.companies.find_one({"id": company.id})
    if existing:
        raise HTTPException(status_code=400, detail="Company already exists")
    doc = company.dict()
    # datetime → ISO string for consistent Mongo storage / JSON return.
    if hasattr(doc.get("created_at"), "isoformat"):
        doc["created_at"] = doc["created_at"].isoformat()
    await db.companies.insert_one(doc.copy())
    return _clean(doc)


@router.get("/{company_id}/summary")
async def company_summary(company_id: str, request: Request):
    """Per-company counts. Only queries the collections that actually
    live in this local database — remote-proxied collections (shipments,
    parties, ledger_entries) are counted as 0 here and the mobile client
    can rely on the remote for those totals.
    """
    db = _db(request)
    # Match both the prefixed form ("co_singh_exports") AND the short
    # form ("singh_exports") — the seed tags legacy records with the
    # short form while the Company document itself uses the prefixed id.
    short_id = company_id[3:] if company_id.startswith("co_") else company_id
    prefixed_id = company_id if company_id.startswith("co_") else f"co_{company_id}"
    variants = list({company_id, short_id, prefixed_id})
    mine = {"company": {"$in": variants}}

    trips = await db.bullion_trips.count_documents(mine)
    # Parties are treated as shared across companies — so the summary
    # includes both this company's parties AND any tagged "shared".
    parties = 0
    try:
        parties = await db.parties.count_documents(
            {"$or": [mine, {"company": "shared"}]}
        )
    except Exception:
        parties = 0
    shipments = 0
    try:
        shipments = await db.shipments.count_documents(mine)
    except Exception:
        shipments = 0
    ledger = 0
    try:
        ledger = await db.ledger_entries.count_documents(mine)
    except Exception:
        ledger = 0
    return {
        "company_id": company_id,
        "shipments": shipments,
        "parties": parties,
        "ledger_entries": ledger,
        "bullion_trips": trips,
    }
