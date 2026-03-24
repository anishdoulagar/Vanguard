"""
Password hashing using bcrypt.
Passwords are NEVER stored plain — always hashed before saving to DB.
"""

from passlib.context import CryptContext

# bcrypt with explicit rounds=12 (default is 12, but explicit is clearer).
# Rounds=12 is the industry standard — secure but not excessively slow.
# On first import passlib will verify the bcrypt C extension is available.
_ctx = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)


def hash_password(plain: str) -> str:
    """Hash a plain-text password. Store the result, never the original."""
    return _ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored hash."""
    return _ctx.verify(plain, hashed)
