"""Seed script for the Multi-Company feature (Phase 1).

Idempotent — safe to re-run.

What it does:
  1. Upserts the two companies (Singh Exports + Awadh Enterprise) into
     `db.companies`.
  2. Backfills a `company` field on any LOCAL collection that already
     stores business records — today that's just `bullion_trips`. All
     records missing a company are tagged `awadh_enterprise` so the
     historical data lands in the main working brand.
  3. Notes which collections live on the REMOTE proxy target so the
     operator knows those need a separate migration run on the remote
     host (or the multi-company proxy inheritance kicks in
     automatically on new writes).
  4. Seeds Papa's user account (`bsingh / Papa@2026`, role="Papa",
     company="co_singh_exports") — separate from `seed_users.py` so the
     original demo seeds are untouched.

Usage:
    cd /app/backend && python seed_companies.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext


# Load env first so MONGO_URL / DB_NAME are available.
sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


COMPANIES = [
    {
        "id": "co_singh_exports",
        "name": "Singh Exports",
        "owner_name": "B Singh",
        "owner_nickname": "Papa",
        "address": "Paharganj, Delhi",
    },
    {
        "id": "co_awadh_enterprise",
        "name": "Awadh Enterprise",
        "owner_name": "K Singh",
        "owner_nickname": "Kishan",
        "address": "",
    },
]

# Historical data → assumed to belong to the main working brand.
DEFAULT_LEGACY_COMPANY = "awadh_enterprise"

# Which local collections should be backfilled with the default company?
# We only touch collections that actually exist in THIS backend's local
# database. Shipments / parties / ledger / bags live on the remote proxy
# target — those need a separate migration on the remote host.
LOCAL_BUSINESS_COLLECTIONS = [
    "bullion_trips",
    "bullion_transactions",
]

# Parties in this app are typically shared across both brands.
LOCAL_SHARED_COLLECTIONS = [
    "parties",  # only tagged if a local `parties` collection ever exists
]

REMOTE_ONLY_COLLECTIONS = ["shipments", "parties", "ledger_entries", "bags"]


async def seed() -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    now_iso = datetime.now(timezone.utc).isoformat()

    # ---- 1. Companies ----
    for comp in COMPANIES:
        await db.companies.update_one(
            {"id": comp["id"]},
            {
                "$set": {**comp, "modified_at": now_iso},
                "$setOnInsert": {"created_at": now_iso},
            },
            upsert=True,
        )
    print(f"✅ Companies seeded: {[c['name'] for c in COMPANIES]}")

    # ---- 2. Backfill local business collections ----
    existing_cols = set(await db.list_collection_names())

    for cname in LOCAL_BUSINESS_COLLECTIONS:
        if cname not in existing_cols:
            print(f"⚪ {cname}: collection not present locally — skipping")
            continue
        res = await db[cname].update_many(
            {"company": {"$exists": False}},
            {"$set": {"company": DEFAULT_LEGACY_COMPANY}},
        )
        print(f"✅ {cname}: {res.modified_count} legacy records tagged company='{DEFAULT_LEGACY_COMPANY}'")

    for cname in LOCAL_SHARED_COLLECTIONS:
        if cname not in existing_cols:
            print(f"⚪ {cname}: collection not present locally — skipping (would tag as 'shared')")
            continue
        res = await db[cname].update_many(
            {"company": {"$exists": False}},
            {"$set": {"company": "shared"}},
        )
        print(f"✅ {cname}: {res.modified_count} legacy records tagged company='shared'")

    for cname in REMOTE_ONLY_COLLECTIONS:
        if cname in existing_cols:
            continue  # already handled above
        print(f"ℹ️  {cname}: proxied to REMOTE_BACKEND_URL — new writes get the "
              "company tag via the proxy inheritance layer. Existing rows need a "
              "one-time migration on the remote host.")

    # ---- 3. Papa's user account ----
    papa_username = "bsingh"
    now_dt = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"username": papa_username},
        {
            "$set": {
                "username": papa_username,
                "email": "bsingh@singh-exports.local",
                "display_name": "B Singh",
                "honorific": "Ji",
                "role": "Papa",
                "company": "co_singh_exports",
                "permissions": ["view", "create", "edit_status"],
                "modified_at": now_dt,
                "password_hash": pwd_context.hash("Papa@2026"),
            },
            "$setOnInsert": {"created_at": now_dt},
        },
        upsert=True,
    )
    print("✅ Papa user seeded: bsingh / Papa@2026 (role=Papa, company=co_singh_exports)")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
