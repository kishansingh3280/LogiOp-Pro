"""Company model for the Multi-Company feature (Phase 1).

A `Company` represents one business unit (e.g. Awadh Enterprise vs.
Singh Exports). Records in other collections (shipments, ledger entries,
bullion trips, etc.) carry an optional `company` string that matches a
`Company.id` here. Parties are usually tagged `"shared"` so both units
can transact with the same party.
"""
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class Company(BaseModel):
    id: str  # e.g. "co_singh_exports" or "co_awadh_enterprise"
    name: str
    owner_name: str
    owner_nickname: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        # Preserve unknown fields on read so the frontend can extend the
        # schema (e.g. logo_url, brand_color) without a backend redeploy.
        extra = "allow"
