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
        # Kishan Sir — Admin. Password MUST be provided via
        # SEED_KISHAN_PASSWORD env var (loaded from backend/.env, which
        # is not shipped in the app bundle). If missing, seed generates
        # a random unusable password so the row still exists but nobody
        # can log in until an operator sets the env var.
        "username": "kishan.singh3280@gmail.com",
        "email": "kishan.singh3280@gmail.com",
        "password": None,
        "display_name": "Kishan",
        "role": Role.ADMIN.value,
        "honorific": "Sir",
    },
    {
        # Papa (Bhupendra Singh) — Hinglish Papa console. Password from
        # SEED_BSINGH_PASSWORD env var, no committed default.
        "username": "bsingh",
        "password": None,
        "display_name": "B Singh",
        "role": Role.PAPA.value,
        "honorific": "Ji",
    },
    {
        "username": "staff",
        "password": None,
        "display_name": "Ops Staff",
        "role": Role.STAFF.value,
        "honorific": "Ji",
    },
    {
        "username": "carrier",
        "password": None,
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

    # Env-only password source (no committed defaults).
    #   SEED_KISHAN_PASSWORD, SEED_BSINGH_PASSWORD, SEED_STAFF_PASSWORD,
    #   SEED_CARRIER_PASSWORD.
    # If the env var is missing we synthesise a random, unusable
    # password so the row still gets created (idempotent upserts stay
    # happy) but nobody can log in until an operator sets the env var.
    def _pw_for(u):
        key = f"SEED_{u['username'].upper().replace('.', '_').replace('@', '_AT_')}_PASSWORD"
        # Legacy short-key aliases so operators can also use
        # SEED_KISHAN_PASSWORD / SEED_BSINGH_PASSWORD / etc.
        legacy_key = None
        if u["username"].startswith("kishan"):
            legacy_key = "SEED_KISHAN_PASSWORD"
        elif u["username"] == "bsingh":
            legacy_key = "SEED_BSINGH_PASSWORD"
        elif u["username"] == "staff":
            legacy_key = "SEED_STAFF_PASSWORD"
        elif u["username"] == "carrier":
            legacy_key = "SEED_CARRIER_PASSWORD"
        env_val = (
            os.environ.get(key)
            or (os.environ.get(legacy_key) if legacy_key else None)
        )
        if env_val:
            return env_val
        # No env password provided — return a random unusable string
        # (never printed, never logged). Login for this user stays
        # closed until the operator sets the env var and restarts.
        import secrets
        return secrets.token_urlsafe(32)

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
