"""
Credential Encryption
Uses Fernet symmetric encryption to store cloud credentials safely in the DB.

Fernet guarantees:
  - Encrypted data cannot be read without the key
  - Tampered data is detected and rejected
  - Each encryption produces a different ciphertext (via random IV)

The key lives in CSPM_ENCRYPT_KEY env var — never in code or DB.
If the key is lost, all saved credentials become unreadable.
"""

import os
import json
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    key = os.environ.get("CSPM_ENCRYPT_KEY", "")
    if not key or key == "REPLACE_RUN_generate_keys_py":
        raise RuntimeError(
            "CSPM_ENCRYPT_KEY not set. Run python3 generate_keys.py first."
        )
    return Fernet(key.encode())


def encrypt_credentials(creds: dict) -> str:
    """
    Encrypt a credentials dict to a string safe for DB storage.
    Input:  {"access_key_id": "AKIA...", "secret_access_key": "..."}
    Output: "gAAAAAB..." (Fernet token, base64-encoded)
    """
    plaintext = json.dumps(creds).encode()
    return _get_fernet().encrypt(plaintext).decode()


def decrypt_credentials(encrypted: str) -> dict:
    """
    Decrypt stored credentials back to a dict.
    Raises InvalidToken if the data has been tampered with.
    """
    plaintext = _get_fernet().decrypt(encrypted.encode())
    return json.loads(plaintext)


def encrypt_mfa_secret(secret: str) -> str:
    """Encrypt a TOTP secret for storage."""
    return _get_fernet().encrypt(secret.encode()).decode()


def decrypt_mfa_secret(encrypted: str) -> str:
    """Decrypt a stored TOTP secret."""
    return _get_fernet().decrypt(encrypted.encode()).decode()
