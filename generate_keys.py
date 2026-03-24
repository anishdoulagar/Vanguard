#!/usr/bin/env python3
"""
Run this ONCE after cloning to generate real secret keys in .env
  python3 generate_keys.py
"""
import secrets
import re
import os

try:
    from cryptography.fernet import Fernet
except ImportError:
    print("Installing cryptography...")
    os.system("pip install cryptography")
    from cryptography.fernet import Fernet

encrypt_key = Fernet.generate_key().decode()
jwt_secret  = secrets.token_hex(32)

env_path = os.path.join(os.path.dirname(__file__), ".env")

with open(env_path, "r") as f:
    content = f.read()

content = re.sub(
    r"CSPM_ENCRYPT_KEY=.*",
    f"CSPM_ENCRYPT_KEY={encrypt_key}",
    content
)
content = re.sub(
    r"JWT_SECRET=.*",
    f"JWT_SECRET={jwt_secret}",
    content
)

with open(env_path, "w") as f:
    f.write(content)

print("✓ Keys generated and written to .env")
print(f"  CSPM_ENCRYPT_KEY : {encrypt_key[:20]}...")
print(f"  JWT_SECRET       : {jwt_secret[:20]}...")
print()
print("Keep .env secret — never commit it to git.")
