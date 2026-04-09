"""
cleanup_vulnerable_azure.py
===========================
Tears down all Azure demo resources by deleting the entire resource group.
This is the safest and fastest cleanup — one call removes everything.

USAGE:
  python3 cleanup_vulnerable_azure.py              # reads from .azure_demo_suffix
  python3 cleanup_vulnerable_azure.py --suffix abc12345
"""

import os, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from load_env import load_env
load_env()

from azure.identity import ClientSecretCredential
from azure.mgmt.resource import ResourceManagementClient

TENANT_ID       = os.environ.get("AZURE_TENANT_ID")
CLIENT_ID       = os.environ.get("AZURE_CLIENT_ID")
CLIENT_SECRET   = os.environ.get("AZURE_CLIENT_SECRET")
SUBSCRIPTION_ID = os.environ.get("AZURE_SUBSCRIPTION_ID")

if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SUBSCRIPTION_ID]):
    print("ERROR: Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID")
    sys.exit(1)

suffix = rg_name = None

if "--suffix" in sys.argv:
    suffix = sys.argv[sys.argv.index("--suffix") + 1]
    rg_name = f"cspm-demo-rg-{suffix}"
else:
    try:
        lines = open("demo_infra/.azure_demo_suffix").read().strip().split("\n")
        suffix  = lines[0]
        rg_name = lines[2] if len(lines) > 2 else f"cspm-demo-rg-{suffix}"
    except FileNotFoundError:
        print("ERROR: No .azure_demo_suffix file found. Use --suffix <suffix>")
        sys.exit(1)

print(f"Deleting resource group: {rg_name}")
print("This will delete ALL resources in the group. This cannot be undone.")
if "--yes" in sys.argv:
    print("  (auto-confirmed via --yes)")
else:
    confirm = input("Type 'yes' to confirm: ").strip().lower()
    if confirm != "yes":
        print("Aborted.")
        sys.exit(0)

cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
rmc  = ResourceManagementClient(cred, SUBSCRIPTION_ID)

try:
    poller = rmc.resource_groups.begin_delete(rg_name)
    print(f"Deletion in progress (async)... this takes 2–5 minutes.")
    poller.result()
    print(f"\033[32m✓  Resource group '{rg_name}' deleted.\033[0m")
except Exception as e:
    print(f"\033[31m✗  {e}\033[0m")
