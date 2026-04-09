"""
load_env.py — stdlib-only .env loader for demo scripts.
Reads demo_infra/.env and exports variables into os.environ.
Keys already present in the environment are NOT overwritten.
"""
import os, pathlib

def load_env():
    env_path = pathlib.Path(__file__).parent / ".env"
    if not env_path.exists():
        print()
        print("  \033[33m⚠\033[0m  demo_infra/.env not found.")
        print("     1. Copy the template:  cp demo_infra/.env.example demo_infra/.env")
        print("     2. Fill in your Azure / AWS credentials in demo_infra/.env")
        print("     3. Re-run this script.")
        print()
        raise SystemExit(1)

    loaded = []
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip()
        if key and val and key not in os.environ:
            os.environ[key] = val
            loaded.append(key)

    return loaded
