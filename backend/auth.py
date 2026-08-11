"""JWT-based authentication for the logistics hub.

Provides:
- User model + Role enum (Admin / Staff / Carrier)
- bcrypt password hashing helpers
- JWT encode/decode with configurable expiry
- FastAPI dependency: `get_current_user` (401 on invalid/missing token)
- FastAPI dependency factory: `require_roles(*roles)` (403 on wrong role)
- `optional_current_user` — returns None instead of 401 (used by proxy middleware
  so anonymous read paths keep working during rollout)

Kishan Sir is the initial Admin. Passwords are bcrypt-hashed with 12 rounds.
The JWT stores only `sub` (user id) — role is read from Mongo on every request
so revoking a user or changing their role takes effect immediately.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Annotated, Optional

import bcrypt
import jwt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, model_validator

load_dotenv()

JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required in backend/.env")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "43200"))  # 30 days


class Role(str, Enum):
    ADMIN = "Admin"
    STAFF = "Staff"
    CARRIER = "Carrier"
    # Papa (B Singh) — read-mostly persona introduced in the Multi-Company
    # feature. Can view + create + update statuses; no delete or settings.
    PAPA = "Papa"


class UserPublic(BaseModel):
    id: str
    username: str
    display_name: str
    role: Role
    honorific: str = "Sir"  # "Sir" | "Boss" — used by AI Assistant
    company: Optional[str] = None  # Multi-Company scope for non-Admin users


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class LoginPayload(BaseModel):
    # Login accepts EITHER a username OR an email. This matches how the
    # user document is stored today (username-only for legacy accounts)
    # while remaining compatible with any client that historically sent
    # `email` (the remote proxy schema used it before). At least one of
    # the two must be provided — the model_validator below enforces it.
    #
    # Password check itself is unchanged (bcrypt against the stored
    # `password_hash`). Only the *identifier* lookup is now flexible.
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

    @model_validator(mode="after")
    def _require_identifier(self) -> "LoginPayload":  # type: ignore[override]
        if not (self.username and self.username.strip()) and not (
            self.email and self.email.strip()
        ):
            raise ValueError("username or email is required")
        return self


class RegisterPayload(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(min_length=1, max_length=80)
    role: Role = Role.STAFF
    honorific: str = "Sir"


# ---------------------------------------------------------------------------
# password + JWT helpers
# ---------------------------------------------------------------------------

# Constant-time dummy hash used when the requested username does not exist.
# Prevents user-enumeration through login timing.
_DUMMY_HASH = bcrypt.hashpw(b"timing-dummy-password", bcrypt.gensalt()).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def user_public(user_doc: dict) -> UserPublic:
    return UserPublic(
        id=str(user_doc["_id"]),
        username=user_doc["username"],
        display_name=user_doc.get("display_name") or user_doc["username"],
        role=user_doc.get("role", Role.STAFF.value),
        honorific=user_doc.get("honorific", "Sir"),
        company=user_doc.get("company"),
    )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

# tokenUrl points at /api/auth/login so the OpenAPI docs pick up the correct
# form endpoint. Frontends use their own fetch calls.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _actor_from_request(request: Request) -> Optional[str]:
    """Best-effort extraction of the user id from a Bearer token. Never raises."""
    auth = request.headers.get("authorization") or request.headers.get("Authorization") or ""
    if not auth.lower().startswith("bearer "):
        return None
    try:
        payload = decode_token(auth[7:])
        return payload.get("sub")
    except InvalidTokenError:
        return None


async def get_current_user(
    request: Request,
    token: Annotated[Optional[str], Depends(oauth2_scheme)],
) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise unauthorized
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise unauthorized
        user_id = payload.get("sub")
        if not user_id:
            raise unauthorized
        db = request.app.state.db
        try:
            oid = ObjectId(user_id)
        except Exception as exc:  # noqa: BLE001
            raise unauthorized from exc
        user = await db.users.find_one({"_id": oid})
    except InvalidTokenError as exc:
        raise unauthorized from exc
    if not user or user.get("disabled", False):
        raise unauthorized
    return user


async def optional_current_user(
    request: Request,
    token: Annotated[Optional[str], Depends(oauth2_scheme)],
) -> Optional[dict]:
    """Non-fatal variant — returns None if no valid token.

    Used to progressively roll auth out to previously-anonymous endpoints
    (bullion, wingman, assistant) without breaking existing screens.
    """
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        db = request.app.state.db
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user.get("disabled", False):
            return None
        return user
    except (InvalidTokenError, Exception):
        return None


def require_roles(*allowed: Role):
    """Dependency factory to enforce role-based access on an endpoint."""

    async def _dep(
        user: Annotated[dict, Depends(get_current_user)],
    ) -> dict:
        if user.get("role") not in [r.value for r in allowed]:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user

    return _dep


# ---------------------------------------------------------------------------
# Audit helpers — every write should include these fields
# ---------------------------------------------------------------------------

def audit_stamp(request: Request, *, creating: bool = False, source: str = "manual") -> dict:
    """Return the standard audit fields for a create/update.

    - `entry_source`: "manual" (default), "ai" (Wingman/Assistant), "system", or "api".
    - `created_by` / `modified_by`: the acting user's username, or "system" if unauth.
    """
    actor_username = getattr(request.state, "audit_username", None) or "system"
    now = datetime.now(timezone.utc).isoformat()
    fields = {
        "modified_by": actor_username,
        "modified_at": now,
    }
    if creating:
        fields["created_by"] = actor_username
        fields["created_at"] = now
        fields["entry_source"] = source
    return fields
