"""
Adds Key Vault, SQL Server, and VM to the existing demo resource group.
Fixes: provider registration, Standard SKU public IP.
"""

import os, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from load_env import load_env
load_env()

from azure.identity import ClientSecretCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.keyvault import KeyVaultManagementClient
from azure.mgmt.sql import SqlManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.compute import ComputeManagementClient
from azure.core.exceptions import HttpResponseError

TENANT_ID       = os.environ.get("AZURE_TENANT_ID")
CLIENT_ID       = os.environ.get("AZURE_CLIENT_ID")
CLIENT_SECRET   = os.environ.get("AZURE_CLIENT_SECRET")
SUBSCRIPTION_ID = os.environ.get("AZURE_SUBSCRIPTION_ID")
LOCATION        = "eastus"

# ── read suffix from file written by deploy_vulnerable_azure.py ───────────────
_suffix_file = pathlib.Path(__file__).parent / ".azure_demo_suffix"
if _suffix_file.exists():
    _lines   = _suffix_file.read_text().strip().split("\n")
    SUFFIX   = _lines[0]
    RG_NAME  = _lines[2] if len(_lines) > 2 else f"cspm-demo-rg-{_lines[0]}"
elif "--suffix" in sys.argv:
    SUFFIX  = sys.argv[sys.argv.index("--suffix") + 1]
    RG_NAME = f"cspm-demo-rg-{SUFFIX}"
else:
    print("ERROR: Run deploy_vulnerable_azure.py first, or pass --suffix <suffix>")
    sys.exit(1)
TENANT_ID_VAL = TENANT_ID

cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
rmc  = ResourceManagementClient(cred, SUBSCRIPTION_ID)
kvmc = KeyVaultManagementClient(cred, SUBSCRIPTION_ID)
sqlc = SqlManagementClient(cred, SUBSCRIPTION_ID)
nmc  = NetworkManagementClient(cred, SUBSCRIPTION_ID)
cmc  = ComputeManagementClient(cred, SUBSCRIPTION_ID)

def ok(msg):   print(f"  \033[32m✓\033[0m  {msg}")
def err(msg):  print(f"  \033[31m✗\033[0m  {msg}")
def info(msg): print(f"  \033[33m→\033[0m  {msg}")
def section(t):
    print(f"\n\033[1;36m{'─'*60}\033[0m")
    print(f"\033[1;36m  {t}\033[0m")
    print(f"\033[1;36m{'─'*60}\033[0m")

TAGS = {"project": "cspm-demo", "env": "demo"}

# ── Register providers first ──────────────────────────────────────────────────
section("REGISTERING PROVIDERS")
for ns in ["Microsoft.KeyVault", "Microsoft.Sql", "Microsoft.Compute"]:
    try:
        rmc.providers.register(ns)
        ok(f"Registered {ns}")
    except Exception as e:
        info(f"{ns}: {e}")

info("Waiting 15s for registration to propagate...")
time.sleep(15)


# ══════════════════════════════════════════════════════════════════════════════
#  KEY VAULT
# ══════════════════════════════════════════════════════════════════════════════
section("KEY VAULT — no soft-delete or purge protection")

kv_name = f"cspm-demo-kv-{SUFFIX}"
try:
    poller = kvmc.vaults.begin_create_or_update(RG_NAME, kv_name, {
        "location": LOCATION,
        "tags": TAGS,
        "properties": {
            "sku": {"family": "A", "name": "standard"},
            "tenant_id": TENANT_ID,
            "access_policies": [],
            "enable_soft_delete": False,
            "enable_purge_protection": None,
            "enable_rbac_authorization": False,
            "network_acls": {"default_action": "Allow", "bypass": "AzureServices"},
        }
    })
    poller.result()
    ok(f"Key Vault '{kv_name}': no soft-delete, no purge protection  → AZ-KV-001..009 (HIGH)")
except HttpResponseError as e:
    err(f"Key Vault: {e.message}")


# ══════════════════════════════════════════════════════════════════════════════
#  SQL SERVER
# ══════════════════════════════════════════════════════════════════════════════
section("SQL SERVER — no auditing or threat detection")

sql_name     = f"cspm-demo-sql-{SUFFIX}"
sql_password = f"CspmDemo!{SUFFIX[:6]}2026"

try:
    poller = sqlc.servers.begin_create_or_update(RG_NAME, sql_name, {
        "location": LOCATION,
        "tags": TAGS,
        "administrator_login": "cspmdemoAdmin",
        "administrator_login_password": sql_password,
        "public_network_access": "Enabled",
        "minimal_tls_version": "1.0",
    })
    poller.result()
    sqlc.firewall_rules.create_or_update(
        RG_NAME, sql_name, "AllowAll",
        {"start_ip_address": "0.0.0.0", "end_ip_address": "255.255.255.255"}
    )
    ok(f"SQL Server '{sql_name}': public, weak TLS, no auditing  → AZ-SQL-001..007 (CRITICAL/HIGH)")
    info(f"  Password: {sql_password}")
except HttpResponseError as e:
    err(f"SQL Server: {e.message}")


# ══════════════════════════════════════════════════════════════════════════════
#  VIRTUAL MACHINE — Standard SKU public IP (fixes Basic SKU limit)
# ══════════════════════════════════════════════════════════════════════════════
section("VIRTUAL MACHINE — Standard_B1s")

pip_name = f"cspm-demo-pip2-{SUFFIX}"
nic_name = f"cspm-demo-nic2-{SUFFIX}"
vm_name  = f"cspm-demo-vm-{SUFFIX}"

# Get existing subnet
try:
    vnet = nmc.virtual_networks.get(RG_NAME, f"cspm-demo-vnet-{SUFFIX}")
    subnet_id = vnet.subnets[0].id

    # Get existing SSH NSG
    nsg = nmc.network_security_groups.get(RG_NAME, f"cspm-demo-nsg-ssh-{SUFFIX}")

    # Standard SKU public IP (no Basic quota issue)
    pip_poller = nmc.public_ip_addresses.begin_create_or_update(RG_NAME, pip_name, {
        "location": LOCATION,
        "tags": TAGS,
        "sku": {"name": "Standard"},
        "public_ip_allocation_method": "Static",
    })
    pip = pip_poller.result()
    ok(f"Public IP: {pip_name}")

    nic_poller = nmc.network_interfaces.begin_create_or_update(RG_NAME, nic_name, {
        "location": LOCATION,
        "tags": TAGS,
        "ip_configurations": [{
            "name": "ipconfig1",
            "subnet": {"id": subnet_id},
            "public_ip_address": {"id": pip.id},
        }],
        "network_security_group": {"id": nsg.id},
    })
    nic = nic_poller.result()
    ok(f"NIC: {nic_name}")

    vm_poller = cmc.virtual_machines.begin_create_or_update(RG_NAME, vm_name, {
        "location": LOCATION,
        "tags": TAGS,
        "hardware_profile": {"vm_size": "Standard_B1s"},
        "storage_profile": {
            "image_reference": {
                "publisher": "Canonical",
                "offer": "UbuntuServer",
                "sku": "18.04-LTS",
                "version": "latest",
            },
            "os_disk": {
                "create_option": "FromImage",
                "managed_disk": {"storage_account_type": "Standard_LRS"},
            },
        },
        "os_profile": {
            "computer_name": "cspm-demo-vm",
            "admin_username": "cspmdemo",
            "admin_password": sql_password,
            "linux_configuration": {
                "disable_password_authentication": False,
                "patch_settings": {"patch_mode": "ImageDefault"},
            },
        },
        "network_profile": {
            "network_interfaces": [{"id": nic.id, "primary": True}]
        },
    })
    vm = vm_poller.result()
    ok(f"VM '{vm_name}' (Standard_B1s): no disk encryption, password auth  → AZ-VM-001..007 (HIGH/MEDIUM)")
    info("  ⚠  Remember to run cleanup after the demo")

except HttpResponseError as e:
    err(f"VM: {e.message}")
except Exception as e:
    err(f"VM: {e}")

print(f"\n\033[32mDone. All resources are in resource group: {RG_NAME}\033[0m\n")
