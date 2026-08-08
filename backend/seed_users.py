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
        "username": "kishan",
        "password": "Kishan@Boss2026",
        "display_name": "Kishan",
        "role": Role.ADMIN.value,
        "honorific": "Sir",
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


async def main() -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    await db.users.create_index("username", unique=True)

    now = datetime.now(timezone.utc).isoformat()
    for u in SEED_USERS:
        await db.users.update_one(
            {"username": u["username"]},
            {
                "$setOnInsert": {
                    "username": u["username"],
                    "password_hash": hash_password(u["password"]),
                    "display_name": u["display_name"],
                    "role": u["role"],
                    "honorific": u["honorific"],
                    "disabled": False,
                    "created_at": now,
                    "modified_at": now,
                }
            },
            upsert=True,
        )
        print(f"seeded {u['role']:8s} → {u['username']}")

    client.close()
    print("\nDone. See /app/memory/test_credentials.md for passwords.")


if __name__ == "__main__":
    asyncio.run(main())
