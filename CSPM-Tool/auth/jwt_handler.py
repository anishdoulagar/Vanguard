"""
JWT Handler
Creates and verifies JSON Web Tokens for user authentication.

A JWT is a small signed string that looks like:
  eyJhbGci....eyJ1c2VyX2lk....signature

It contains: user_id, email, expiry time.
The server signs it with JWT_SECRET — so it can verify later
that the token was genuinely issued by this server and not forged.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError

# Algorithm used to sign tokens — HS256 is standard for single-server apps
ALGORITHM = "HS256"


def _secret() -> str:
    s = os.environ.get("JWT_SECRET", "")
    if not s or s == "REPLACE_RUN_generate_keys_py":
        raise RuntimeError("JWT_SECRET not set. Run python3 generate_keys.py first.")
    return s


def _expire_hours() -> int:
    try:
        return int(os.environ.get("JWT_EXPIRE_HOURS", "24"))
    except ValueError:
        return 24


def create_token(user_id: str, email: str, is_admin: bool = False,
                 role: str = "analyst") -> str:
    """
    Create a signed JWT token for a user.
    The token encodes who the user is, their role, and when it expires.
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=_expire_hours())
    payload = {
        "sub":      user_id,      # "subject" — the user's UUID
        "email":    email,
        "is_admin": is_admin,
        "role":     role,
        "exp":      expire,       # expiry — jose checks this automatically
        "iat":      datetime.now(timezone.utc),  # issued at
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.
    Returns the payload dict if valid, None if expired or tampered.
    """
    try:
        payload = jwt.decode(token, _secret(), algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def create_mfa_pending_token(user_id: str) -> str:
    """
    Short-lived token issued after password verification when MFA is required.
    Only valid for 10 minutes and ONLY accepted by POST /auth/mfa/verify.
    get_current_user explicitly rejects tokens with type='mfa_pending'.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {
        "sub":  user_id,
        "type": "mfa_pending",
        "exp":  expire,
        "iat":  datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def decode_mfa_pending_token(token: str) -> Optional[dict]:
    """Returns payload only if the token is a valid mfa_pending token."""
    payload = decode_token(token)
    if payload is None or payload.get("type") != "mfa_pending":
        return None
    return payload
