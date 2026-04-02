"""
Auth Dependencies
FastAPI dependencies that protect routes by authentication and role.

Roles (ordered by privilege):
  viewer     — read-only access (dashboard, scans, history, policies)
  analyst    — viewer + trigger scans, acknowledge findings, manage custom rules
  admin      — analyst + manage accounts, configure alerts
  superadmin — admin + manage users, assign roles, view platform stats

Usage:
    # Any authenticated user
    @app.get("/dashboard")
    async def route(user = Depends(get_current_user)): ...

    # Minimum role required
    @app.post("/accounts")
    async def route(user = Depends(require_role("admin"))): ...

    # Shorthand kept for backward compatibility
    @app.get("/admin/users")
    async def route(user = Depends(require_admin)): ...
"""

from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth.jwt_handler import decode_token
from database.connection import get_conn
from database.models import get_user_by_id

_bearer = HTTPBearer()

# Privilege levels — higher number = more access
ROLE_LEVEL: dict[str, int] = {
    "viewer":     1,
    "analyst":    2,
    "admin":      3,
    "superadmin": 4,
}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    conn=Depends(get_conn),
) -> dict:
    """
    Decodes the JWT and returns the user from DB.
    Raises 401 if token is missing, expired, invalid, or user no longer exists.
    """
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Reject MFA pending tokens — they only work on /auth/mfa/verify
    if payload.get("type") == "mfa_pending":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="MFA verification required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token.",
        )

    user = await get_user_by_id(conn, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Contact your administrator.",
        )

    valid_until = user.get("valid_until")
    if valid_until is not None:
        if valid_until.tzinfo is None:
            valid_until = valid_until.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > valid_until:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account access has expired. Contact your administrator.",
            )

    return user


def require_role(min_role: str):
    """
    Returns a FastAPI dependency that enforces a minimum role level.

    Usage:
        user = Depends(require_role("admin"))
    """
    required_level = ROLE_LEVEL.get(min_role, 0)

    async def _check(user: dict = Depends(get_current_user)) -> dict:
        user_role  = user.get("role", "analyst")
        user_level = ROLE_LEVEL.get(user_role, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires '{min_role}' role or higher. Your role: '{user_role}'.",
            )
        return user

    return _check


# ── Convenience shortcuts ──────────────────────────────────────────────────────

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Shorthand: requires admin or superadmin role."""
    user_role  = user.get("role", "analyst")
    user_level = ROLE_LEVEL.get(user_role, 0)
    if user_level < ROLE_LEVEL["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin access required. Your role: '{user_role}'.",
        )
    return user
