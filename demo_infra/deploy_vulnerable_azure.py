"""
deploy_vulnerable_azure.py
==========================
Deploys intentionally misconfigured Azure resources to demonstrate
Vanguard CSPM findings during a presentation.

WHAT IT CREATES (all in resource group 'cspm-demo-rg-<suffix>'):
  • 3 Storage Accounts  — public blob, no HTTPS enforcement, weak TLS, no soft-delete
  • 2 NSGs              — SSH open to *, RDP open to * (0.0.0.0/0)
  • 1 VNet              — for NSG/VM attachment
  • 1 Key Vault         — no soft-delete, no purge protection, no RBAC
  • 1 SQL Server        — no auditing, no threat detection, public access
  • 1 Linux VM          — t2.micro equivalent (Standard_B1s), unmanaged disk,
                          no disk encryption set

EXPECTED CSPM FINDINGS (25–35 findings):
  CRITICAL  AZ-ST-001 (public blob), AZ-NSG-001 (RDP), AZ-NSG-002 (SSH)
  HIGH      AZ-ST-002 (no HTTPS), AZ-KV-001..003, AZ-SQL-001..005
  MEDIUM    AZ-ST-004 (weak TLS), AZ-ST-008 (no soft-delete), AZ-NSG-003..006
  LOW       AZ-ST-007 (no geo-redundancy), AZ-VM-003..007

COST: ~$0.02/hour (Standard_B1s VM + SQL Server DTU minimum)
      Run cleanup_vulnerable_azure.py after demo — deletes the entire resource group.

USAGE:
  pip install azure-identity azure-mgmt-resource azure-mgmt-storage \
              azure-mgmt-network azure-mgmt-keyvault azure-mgmt-sql \
              azure-mgmt-compute azure-mgmt-authorization

  export AZURE_TENANT_ID=...
  export AZURE_CLIENT_ID=...
  export AZURE_CLIENT_SECRET=...
  export AZURE_SUBSCRIPTION_ID=...

  python3 deploy_vulnerable_azure.py
"""

import os, random, string, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from load_env import load_env
load_env()

from azure.identity import ClientSecretCredential, DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.keyvault import KeyVaultManagementClient
from azure.mgmt.sql import SqlManagementClient
from azure.mgmt.compute import ComputeManagementClient
from azure.core.exceptions import HttpResponseError

# ── Config ────────────────────────────────────────────────────────────────────
TENANT_ID       = os.environ.get("AZURE_TENANT_ID")
CLIENT_ID       = os.environ.get("AZURE_CLIENT_ID")
CLIENT_SECRET   = os.environ.get("AZURE_CLIENT_SECRET")
SUBSCRIPTION_ID = os.environ.get("AZURE_SUBSCRIPTION_ID")
LOCATION        = "eastus"

if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SUBSCRIPTION_ID]):
    print("ERROR: Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID")
    sys.exit(1)

SUFFIX  = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
RG_NAME = f"cspm-demo-rg-{SUFFIX}"
TAGS    = {"project": "cspm-demo", "env": "demo"}

created = []

def ok(msg):   print(f"  \033[32m✓\033[0m  {msg}")
def info(msg): print(f"  \033[33m→\033[0m  {msg}")
def err(msg):  print(f"  \033[31m✗\033[0m  {msg}")
def section(t):
    print(f"\n\033[1;36m{'─'*60}\033[0m")
    print(f"\033[1;36m  {t}\033[0m")
    print(f"\033[1;36m{'─'*60}\033[0m")

# ── Credentials & clients ─────────────────────────────────────────────────────
try:
    cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    # Test auth
    from azure.mgmt.resource.subscriptions import SubscriptionClient
    sub_client = SubscriptionClient(cred)
    sub = next((s for s in sub_client.subscriptions.list()
                if s.subscription_id == SUBSCRIPTION_ID), None)
    if not sub:
        err(f"Subscription {SUBSCRIPTION_ID} not accessible with these credentials")
        sys.exit(1)
    info(f"Azure subscription: {sub.display_name}  ({SUBSCRIPTION_ID})")
except Exception as e:
    err(f"Authentication failed: {e}")
    sys.exit(1)

rmc  = ResourceManagementClient(cred, SUBSCRIPTION_ID)
stmc = StorageManagementClient(cred, SUBSCRIPTION_ID)
nmc  = NetworkManagementClient(cred, SUBSCRIPTION_ID)
kvmc = KeyVaultManagementClient(cred, SUBSCRIPTION_ID)
sqlc = SqlManagementClient(cred, SUBSCRIPTION_ID)
cmc  = ComputeManagementClient(cred, SUBSCRIPTION_ID)


# ══════════════════════════════════════════════════════════════════════════════
#  0. RESOURCE GROUP
# ══════════════════════════════════════════════════════════════════════════════
section("RESOURCE GROUP")
rmc.resource_groups.create_or_update(RG_NAME, {"location": LOCATION, "tags": TAGS})
ok(f"Resource group: {RG_NAME}  ({LOCATION})")


# ══════════════════════════════════════════════════════════════════════════════
#  1. STORAGE ACCOUNTS — misconfigurations
# ══════════════════════════════════════════════════════════════════════════════
section("STORAGE ACCOUNTS — misconfigurations")

def make_storage(name, params_override: dict, finding_desc: str, rule: str, sev: str):
    """Create a storage account with intentional misconfigurations."""
    base_params = {
        "sku": {"name": "Standard_LRS"},
        "kind": "StorageV2",
        "location": LOCATION,
        "tags": TAGS,
        "allow_blob_public_access": False,
        "enable_https_traffic_only": True,
        "minimum_tls_version": "TLS1_2",
    }
    base_params.update(params_override)
    try:
        poller = stmc.storage_accounts.begin_create(RG_NAME, name, base_params)
        poller.result()
        ok(f"Storage '{name}': {finding_desc}  → {rule} ({sev})")
        created.append(("Storage Account", name, rule, sev))
        return True
    except HttpResponseError as e:
        err(f"Storage {name}: {e.message}")
        return False


# 1a. Public blob access enabled (CRITICAL)
st_public = f"cspmdemopub{SUFFIX}"
make_storage(st_public,
    {"allow_blob_public_access": True},
    "public blob access enabled",
    "AZ-ST-001", "CRITICAL")

# 1b. No HTTPS enforcement (HIGH)
st_nohttp = f"cspmdemohtt{SUFFIX}"
make_storage(st_nohttp,
    {"enable_https_traffic_only": False},
    "HTTP allowed (no HTTPS enforcement)",
    "AZ-ST-002", "HIGH")

# 1c. Weak TLS + no soft-delete for blobs (MEDIUM)
st_weaktls = f"cspmdemowtl{SUFFIX}"
if make_storage(st_weaktls,
    {"minimum_tls_version": "TLS1_0"},
    "TLS 1.0 minimum, no blob soft-delete",
    "AZ-ST-004,008", "MEDIUM"):
    # Disable soft delete on blob service
    try:
        stmc.blob_services.set_service_properties(
            RG_NAME, st_weaktls, {
                "delete_retention_policy": {"enabled": False}
            }
        )
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════════════════════
#  2. VIRTUAL NETWORK + NSGs
# ══════════════════════════════════════════════════════════════════════════════
section("VNET + NETWORK SECURITY GROUPS — open to internet")

# Create VNet
vnet_name = f"cspm-demo-vnet-{SUFFIX}"
poller = nmc.virtual_networks.begin_create_or_update(RG_NAME, vnet_name, {
    "location": LOCATION,
    "tags": TAGS,
    "address_space": {"address_prefixes": ["10.98.0.0/16"]},
    "subnets": [{"name": "default", "address_prefix": "10.98.1.0/24"}],
})
vnet = poller.result()
subnet_ref = vnet.subnets[0]
ok(f"VNet: {vnet_name}")

def make_nsg(name, rules, finding_desc, rule_id, sev):
    try:
        poller = nmc.network_security_groups.begin_create_or_update(RG_NAME, name, {
            "location": LOCATION,
            "tags": TAGS,
            "security_rules": rules,
        })
        nsg = poller.result()
        ok(f"NSG '{name}': {finding_desc}  → {rule_id} ({sev})")
        created.append(("NSG", name, rule_id, sev))
        return nsg
    except HttpResponseError as e:
        err(f"NSG {name}: {e.message}")
        return None

# NSG: SSH open to internet
nsg_ssh = make_nsg(
    f"cspm-demo-nsg-ssh-{SUFFIX}",
    [{
        "name": "Allow-SSH-Internet",
        "priority": 100,
        "direction": "Inbound",
        "access": "Allow",
        "protocol": "Tcp",
        "source_port_range": "*",
        "destination_port_range": "22",
        "source_address_prefix": "Internet",    # ← matches AZ-NSG-002
        "destination_address_prefix": "*",
        "description": "DEMO: intentionally open SSH",
    }],
    "SSH (port 22) open to Internet",
    "AZ-NSG-002", "CRITICAL"
)

# NSG: RDP open to internet
nsg_rdp = make_nsg(
    f"cspm-demo-nsg-rdp-{SUFFIX}",
    [{
        "name": "Allow-RDP-Internet",
        "priority": 100,
        "direction": "Inbound",
        "access": "Allow",
        "protocol": "Tcp",
        "source_port_range": "*",
        "destination_port_range": "3389",
        "source_address_prefix": "*",            # ← matches AZ-NSG-001
        "destination_address_prefix": "*",
        "description": "DEMO: intentionally open RDP",
    }],
    "RDP (port 3389) open to 0.0.0.0/0",
    "AZ-NSG-001", "CRITICAL"
)


# ══════════════════════════════════════════════════════════════════════════════
#  3. KEY VAULT — no soft delete, no purge protection, no RBAC
# ══════════════════════════════════════════════════════════════════════════════
section("KEY VAULT — no soft-delete or purge protection")

kv_name = f"cspm-demo-kv-{SUFFIX}"
try:
    # Get tenant ID for access policies
    poller = kvmc.vaults.begin_create_or_update(RG_NAME, kv_name, {
        "location": LOCATION,
        "tags": TAGS,
        "properties": {
            "sku": {"family": "A", "name": "standard"},
            "tenant_id": TENANT_ID,
            "access_policies": [],          # no access policies configured
            "enable_soft_delete": False,    # AZ-KV-001 (HIGH)
            "enable_purge_protection": None, # AZ-KV-002 (HIGH) — not set
            "enable_rbac_authorization": False,  # AZ-KV-009 (MEDIUM)
            "network_acls": {
                "default_action": "Allow",  # AZ-KV-006 (MEDIUM) — public access
                "bypass": "AzureServices",
            },
        }
    })
    kv = poller.result()
    ok(f"Key Vault '{kv_name}': no soft-delete, no purge protection, public access  → AZ-KV-001..009 (HIGH/MEDIUM)")
    created.append(("Key Vault", kv_name, "AZ-KV-001,002,003,006,009", "HIGH"))
except HttpResponseError as e:
    # Some subscriptions block disabling soft-delete — warn and continue
    err(f"Key Vault: {e.message}")
    info("  Note: Some Azure subscriptions enforce soft-delete by policy. This is expected.")


# ══════════════════════════════════════════════════════════════════════════════
#  4. SQL SERVER — no auditing, no threat detection, public access
# ══════════════════════════════════════════════════════════════════════════════
section("SQL SERVER — no auditing or threat detection")

sql_server_name = f"cspm-demo-sql-{SUFFIX}"
sql_admin_pass  = f"CspmDemo!{SUFFIX[:6]}2026"  # meets Azure complexity

try:
    poller = sqlc.servers.begin_create_or_update(RG_NAME, sql_server_name, {
        "location": LOCATION,
        "tags": TAGS,
        "administrator_login": "cspmdemoAdmin",
        "administrator_login_password": sql_admin_pass,
        "public_network_access": "Enabled",  # AZ-SQL-001 (CRITICAL)
        "minimal_tls_version": "1.0",        # AZ-SQL-002 (HIGH) — weak TLS
    })
    sql_server = poller.result()

    # Allow all Azure services + public IPs (wide open firewall)
    sqlc.firewall_rules.create_or_update(
        RG_NAME, sql_server_name, "AllowAll",
        {"start_ip_address": "0.0.0.0", "end_ip_address": "255.255.255.255"}
    )
    # DO NOT enable auditing → AZ-SQL-003,004 (HIGH)
    # DO NOT enable threat detection → AZ-SQL-005 (HIGH)
    # DO NOT enable AAD admin → AZ-SQL-007 (MEDIUM)

    ok(f"SQL Server '{sql_server_name}': public access, weak TLS, no auditing, no threat detection  → AZ-SQL-001..010 (CRITICAL/HIGH)")
    info(f"  Admin password: {sql_admin_pass}  (temporary demo credential)")
    created.append(("SQL Server", sql_server_name, "AZ-SQL-001,002,003,004,005,007", "CRITICAL"))
except HttpResponseError as e:
    err(f"SQL Server: {e.message}")


# ══════════════════════════════════════════════════════════════════════════════
#  5. VIRTUAL MACHINE — Standard_B1s, no disk encryption, no extensions
# ══════════════════════════════════════════════════════════════════════════════
section("VIRTUAL MACHINE — Standard_B1s, no disk encryption")

nic_name = f"cspm-demo-nic-{SUFFIX}"
vm_name  = f"cspm-demo-vm-{SUFFIX}"

# Create NIC
try:
    # Public IP
    pip_poller = nmc.public_ip_addresses.begin_create_or_update(
        RG_NAME, f"cspm-demo-pip-{SUFFIX}",
        {"location": LOCATION, "tags": TAGS,
         "sku": {"name": "Basic"},
         "public_ip_allocation_method": "Dynamic"}
    )
    pip = pip_poller.result()

    nic_poller = nmc.network_interfaces.begin_create_or_update(
        RG_NAME, nic_name, {
            "location": LOCATION,
            "tags": TAGS,
            "ip_configurations": [{
                "name": "ipconfig1",
                "subnet": {"id": subnet_ref.id},
                "public_ip_address": {"id": pip.id},
            }],
            "network_security_group": {"id": nsg_ssh.id} if nsg_ssh else None,
        }
    )
    nic = nic_poller.result()
    ok(f"NIC: {nic_name}")

    vm_poller = cmc.virtual_machines.begin_create_or_update(
        RG_NAME, vm_name, {
            "location": LOCATION,
            "tags": TAGS,
            "hardware_profile": {"vm_size": "Standard_B1s"},
            "storage_profile": {
                "image_reference": {
                    "publisher": "Canonical",
                    "offer":     "UbuntuServer",
                    "sku":       "18.04-LTS",
                    "version":   "latest",
                },
                "os_disk": {
                    "create_option": "FromImage",
                    "managed_disk": {"storage_account_type": "Standard_LRS"},
                    # No disk encryption set → AZ-VM-001,002 (HIGH)
                },
            },
            "os_profile": {
                "computer_name":  "cspm-demo-vm",
                "admin_username": "cspmdemo",
                "admin_password": sql_admin_pass,
                "linux_configuration": {
                    "disable_password_authentication": False,  # AZ-VM-004 (MEDIUM)
                    "patch_settings": {"patch_mode": "ImageDefault"},
                },
            },
            "network_profile": {
                "network_interfaces": [{"id": nic.id, "primary": True}]
            },
            # No boot diagnostics → AZ-VM-005 (MEDIUM)
            # No extensions (no antimalware, no monitoring) → AZ-VM-006,007 (MEDIUM)
        }
    )
    vm = vm_poller.result()
    ok(f"VM '{vm_name}' (Standard_B1s): no disk encryption, SSH password auth, no boot diag  → AZ-VM-001..007 (HIGH/MEDIUM)")
    info("  ⚠  Remember to delete this VM after the demo to avoid charges")
    created.append(("Virtual Machine", vm_name, "AZ-VM-001,002,004,005,006,007", "HIGH"))
except HttpResponseError as e:
    err(f"VM: {e.message}")
except Exception as e:
    err(f"VM (unexpected): {e}")


# ══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
section("DEPLOYMENT COMPLETE — SUMMARY")

print(f"\n  Suffix: \033[1m{SUFFIX}\033[0m  |  Resource Group: \033[1m{RG_NAME}\033[0m")
print(f"  Subscription: {SUBSCRIPTION_ID}  |  Region: {LOCATION}\n")

print(f"  {'RESOURCE':<30} {'NAME':<35} {'RULE':<30} {'SEVERITY'}")
print(f"  {'─'*30} {'─'*35} {'─'*30} {'─'*8}")
for (rtype, name, rule, sev) in created:
    col = {"CRITICAL": "\033[31m", "HIGH": "\033[33m", "MEDIUM": "\033[34m", "LOW": "\033[37m"}.get(sev, "")
    print(f"  {rtype:<30} {name[:35]:<35} {rule:<30} {col}{sev}\033[0m")

print(f"""
  ──────────────────────────────────────────────────────────────
  NEXT STEPS:
  1. Add this Azure account to Vanguard (Accounts → Add Account)
     Tenant ID:       {TENANT_ID}
     Client ID:       {CLIENT_ID}
     Subscription ID: {SUBSCRIPTION_ID}
  2. Click SCAN — expect 25–35 findings
  3. Show findings grouped by severity
  4. Filter by CIS-Azure / PCI / GDPR framework

  CLEANUP (run after demo — deletes entire resource group):
  python3 cleanup_vulnerable_azure.py --suffix {SUFFIX}
  ──────────────────────────────────────────────────────────────
""")

# Save for cleanup
with open("demo_infra/.azure_demo_suffix", "w") as f:
    f.write(f"{SUFFIX}\n{SUBSCRIPTION_ID}\n{RG_NAME}")
print(f"  Suffix saved to demo_infra/.azure_demo_suffix for cleanup script.")
