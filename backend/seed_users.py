"""Seed default users for the logistics hub.

Kishan Sir (Admin), a demo Staff member, and a demo Carrier — all idempotent
via `$setOnInsert` so re-running the script won't reset a real admin
password. Update `/app/memory/test_credentials.md` after running.

Usage:
    python /app/backend/seed_users.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, os.path.dirname(__file__))
from auth import Role, hash_password  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SEED_USERS = [
    {
        # Kishan Sir — Admin. Username is his email (login endpoint
        # accepts either the exact username string or the same value
        # via the `email` field for a case-insensitive lookup).
        "username": "kishan.singh3280@gmail.com",
        "email": "kishan.singh3280@gmail.com",
        "password": "701A3ahig@",
        "display_name": "Kishan",
        "role": Role.ADMIN.value,
        "honorific": "Sir",
    },
    {
        # Papa (Bhupendra Singh) — read-mostly Hinglish console per role
        # matrix in /app/memory/test_credentials.md. Added to the seed
        # list so a fresh deploy has both admin and Papa accounts ready.
        "username": "bsingh",
        "password": "Papa@2026",
        "display_name": "B Singh",
        "role": Role.PAPA.value,
        "honorific": "Ji",
    },
    {
        "username": "staff",
        "password": "Staff@2026",
        "display_name": "Ops Staff",
        "role": Role.STAFF.value,
        "honorific": "Ji",
    },
    {
        "username": "carrier",
        "password": "Carrier@2026",
        "display_name": "Demo Carrier",
        "role": Role.CARRIER.value,
        "honorific": "Bhai",
    },
]


async def ensure_seed_users(db) -> int:
    """Idempotent seed used both by the CLI runner AND the FastAPI startup
    hook in server.py. Uses ``$setOnInsert`` so an existing user's real
    password is NEVER overwritten. Returns the number of NEW users
    created this call (0 on subsequent runs)."""
    # Unique index — safe to call every startup; a no-op if already present.
    try:
        await db.users.create_index("username", unique=True)
    except Exception:
        # Race with another worker or an older duplicate index name — ignore.
        pass

    # Optional env-override (playbook-recommended for production secrets):
    # SEED_KISHAN_PASSWORD, SEED_BSINGH_PASSWORD, etc. take precedence
    # over the hard-coded default if set.
    def _pw_for(u):
        key = f"SEED_{u['username'].upper()}_PASSWORD"
        return os.environ.get(key) or u["password"]

    now = datetime.now(timezone.utc).isoformat()
    created = 0
    for u in SEED_USERS:
        seed_doc = {
            "username": u["username"],
            "password_hash": hash_password(_pw_for(u)),
            "display_name": u["display_name"],
            "role": u["role"],
            "honorific": u["honorific"],
            "disabled": False,
            "created_at": now,
            "modified_at": now,
        }
        # Optional email field — only written on insert if the seed
        # record supplied one (Kishan's admin doc now stores it so the
        # username-OR-email login path works out of the box).
        if u.get("email"):
            seed_doc["email"] = u["email"]

        result = await db.users.update_one(
            {"username": u["username"]},
            {"$setOnInsert": seed_doc},
            upsert=True,
        )
        if getattr(result, "upserted_id", None):
            created += 1
    return created


async def main() -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    created = await ensure_seed_users(db)
    print(f"Seed complete: {created} new user(s) created (existing were skipped).")

    client.close()
    print("\nDone. See /app/memory/test_credentials.md for passwords.")


if __name__ == "__main__":
    asyncio.run(main())
