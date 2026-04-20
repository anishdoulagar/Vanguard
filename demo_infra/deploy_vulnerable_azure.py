"""
deploy_vulnerable_azure.py
==========================
Deploys intentionally misconfigured (or secured) Azure resources to demonstrate
Vanguard CSPM findings during a presentation.

PROFILES:
  --profile vulnerable  All misconfigs on — ~25–35 findings (CRITICAL/HIGH/MEDIUM)
  --profile moderate    Partial misconfigs — ~10–18 findings (MEDIUM/HIGH)
  --profile secure      Compliant infra — minimal findings, high score

USAGE:
  python3 deploy_vulnerable_azure.py [--profile vulnerable|moderate|secure] [--team alpha|beta|gamma]

  Resource group name: cspm-demo-{team}  (or cspm-demo-rg-{suffix} if no team)

COST:
  vulnerable: ~$0.02/hour (Standard_B1s VM + SQL Server)
  moderate:   ~$0.01/hour (SQL Server only)
  secure:     ~$0.00/hour (no VM/SQL)
"""

import argparse
import os
import random
import string
import sys
import time
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from load_env import load_env
load_env()

from azure.identity import ClientSecretCredential
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.storage import StorageManagementClient
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.keyvault import KeyVaultManagementClient
from azure.mgmt.sql import SqlManagementClient
from azure.mgmt.compute import ComputeManagementClient
from azure.core.exceptions import HttpResponseError

# ── Args ──────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("--profile", default="vulnerable",
                    choices=["secure", "moderate", "vulnerable"])
parser.add_argument("--team", default=None,
                    choices=["alpha", "beta", "gamma"])
args, _ = parser.parse_known_args()

PROFILE = args.profile
TEAM    = args.team

TENANT_ID       = os.environ.get("AZURE_TENANT_ID")
CLIENT_ID       = os.environ.get("AZURE_CLIENT_ID")
CLIENT_SECRET   = os.environ.get("AZURE_CLIENT_SECRET")
SUBSCRIPTION_ID = os.environ.get("AZURE_SUBSCRIPTION_ID")
LOCATION        = "eastus2"

if not all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SUBSCRIPTION_ID]):
    print("ERROR: Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID")
    sys.exit(1)

SUFFIX  = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
RG_NAME = f"cspm-demo-{TEAM}" if TEAM else f"cspm-demo-rg-{SUFFIX}"
TAGS    = {"project": "cspm-demo", "env": "demo", "profile": PROFILE}

SUFFIX_FILE = pathlib.Path(__file__).parent / (
    f".azure_demo_suffix_{TEAM}" if TEAM else ".azure_demo_suffix"
)

created = []

GREEN  = "\033[32m"
YELLOW = "\033[33m"
RED    = "\033[31m"
CYAN   = "\033[36m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):   print(f"  {GREEN}✓{RESET}  {msg}")
def info(msg): print(f"  {YELLOW}→{RESET}  {msg}")
def err(msg):  print(f"  {RED}✗{RESET}  {msg}")
def section(t):
    print(f"\n{CYAN}{BOLD}{'─'*60}{RESET}")
    print(f"{CYAN}{BOLD}  {t}{RESET}")
    print(f"{CYAN}{BOLD}{'─'*60}{RESET}")

# ── Credentials & clients ─────────────────────────────────────────────────────
try:
    cred = ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET)
    from azure.mgmt.resource.subscriptions import SubscriptionClient
    sub_client = SubscriptionClient(cred)
    sub = next((s for s in sub_client.subscriptions.list()
                if s.subscription_id == SUBSCRIPTION_ID), None)
    if not sub:
        err(f"Subscription {SUBSCRIPTION_ID} not accessible")
        sys.exit(1)
    info(f"Azure subscription: {sub.display_name}  ({SUBSCRIPTION_ID})")
    info(f"Profile: {BOLD}{PROFILE}{RESET}  |  Team: {TEAM or 'default'}  |  RG: {RG_NAME}")
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
#  1. STORAGE ACCOUNTS
# ══════════════════════════════════════════════════════════════════════════════
section("STORAGE ACCOUNTS")

def make_storage(name, params_override, finding_desc, rule, sev):
    base = {
        "sku": {"name": "Standard_LRS"}, "kind": "StorageV2",
        "location": LOCATION, "tags": TAGS,
        "allow_blob_public_access": False,
        "enable_https_traffic_only": True,
        "minimum_tls_version": "TLS1_2",
    }
    base.update(params_override)
    try:
        stmc.storage_accounts.begin_create(RG_NAME, name, base).result()
        ok(f"Storage '{name}': {finding_desc}  → {rule} ({sev})")
        created.append(("Storage Account", name, rule, sev))
        return True
    except HttpResponseError as e:
        err(f"Storage {name}: {e.message}")
        return False

st_pub  = f"cspmdemopub{SUFFIX}"
st_http = f"cspmdemohtt{SUFFIX}"
st_tls  = f"cspmdemowtl{SUFFIX}"

if PROFILE == "vulnerable":
    make_storage(st_pub,  {"allow_blob_public_access": True},
                 "public blob access", "AZ-ST-001", "CRITICAL")
    make_storage(st_http, {"enable_https_traffic_only": False},
                 "HTTP allowed", "AZ-ST-002", "HIGH")
    if make_storage(st_tls,  {"minimum_tls_version": "TLS1_0"},
                    "TLS 1.0, no soft-delete", "AZ-ST-004,008", "MEDIUM"):
        try:
            stmc.blob_services.set_service_properties(
                RG_NAME, st_tls, {"delete_retention_policy": {"enabled": False}})
        except Exception:
            pass

elif PROFILE == "moderate":
    # No public blob, HTTPS required, but weak TLS on one and no versioning
    make_storage(st_pub,  {"minimum_tls_version": "TLS1_1"},
                 "TLS 1.1 (weak)", "AZ-ST-004", "MEDIUM")
    make_storage(st_http, {},  # fully secure
                 "compliant", "-", "PASS")
    if make_storage(st_tls, {},
                    "compliant but no soft-delete", "AZ-ST-008", "LOW"):
        try:
            stmc.blob_services.set_service_properties(
                RG_NAME, st_tls, {"delete_retention_policy": {"enabled": False}})
        except Exception:
            pass

else:  # secure
    for name in [st_pub, st_http, st_tls]:
        make_storage(name, {}, "fully compliant", "-", "PASS")


# ══════════════════════════════════════════════════════════════════════════════
#  2. VNET + NSGs
# ══════════════════════════════════════════════════════════════════════════════
section("VNET + NETWORK SECURITY GROUPS")

vnet_name = f"cspm-demo-vnet-{SUFFIX}"
poller = nmc.virtual_networks.begin_create_or_update(RG_NAME, vnet_name, {
    "location": LOCATION, "tags": TAGS,
    "address_space": {"address_prefixes": ["10.98.0.0/16"]},
    "subnets": [{"name": "default", "address_prefix": "10.98.1.0/24"}],
})
vnet = poller.result()
subnet_ref = vnet.subnets[0]
ok(f"VNet: {vnet_name}")

def make_nsg(name, rules, desc, rule_id, sev):
    try:
        nsg = nmc.network_security_groups.begin_create_or_update(RG_NAME, name, {
            "location": LOCATION, "tags": TAGS, "security_rules": rules,
        }).result()
        ok(f"NSG '{name}': {desc}  → {rule_id} ({sev})")
        created.append(("NSG", name, rule_id, sev))
        return nsg
    except HttpResponseError as e:
        err(f"NSG {name}: {e.message}")
        return None

nsg_ssh = nsg_rdp = None

if PROFILE == "vulnerable":
    nsg_ssh = make_nsg(f"cspm-demo-nsg-ssh-{SUFFIX}", [{
        "name": "Allow-SSH-Internet", "priority": 100, "direction": "Inbound",
        "access": "Allow", "protocol": "Tcp",
        "source_port_range": "*", "destination_port_range": "22",
        "source_address_prefix": "Internet", "destination_address_prefix": "*",
    }], "SSH (22) open to Internet", "AZ-NSG-002", "CRITICAL")

    nsg_rdp = make_nsg(f"cspm-demo-nsg-rdp-{SUFFIX}", [{
        "name": "Allow-RDP-Internet", "priority": 100, "direction": "Inbound",
        "access": "Allow", "protocol": "Tcp",
        "source_port_range": "*", "destination_port_range": "3389",
        "source_address_prefix": "*", "destination_address_prefix": "*",
    }], "RDP (3389) open to 0.0.0.0/0", "AZ-NSG-001", "CRITICAL")

elif PROFILE == "moderate":
    nsg_ssh = make_nsg(f"cspm-demo-nsg-http-{SUFFIX}", [{
        "name": "Allow-HTTP-Internet", "priority": 100, "direction": "Inbound",
        "access": "Allow", "protocol": "Tcp",
        "source_port_range": "*", "destination_port_range": "80",
        "source_address_prefix": "Internet", "destination_address_prefix": "*",
    }], "HTTP (80) open to Internet", "AZ-NSG-003", "MEDIUM")

else:  # secure — deny-all NSG
    nsg_ssh = make_nsg(f"cspm-demo-nsg-secure-{SUFFIX}", [{
        "name": "Deny-All-Inbound", "priority": 100, "direction": "Inbound",
        "access": "Deny", "protocol": "*",
        "source_port_range": "*", "destination_port_range": "*",
        "source_address_prefix": "*", "destination_address_prefix": "*",
    }], "Deny all inbound — compliant", "-", "PASS")


# ══════════════════════════════════════════════════════════════════════════════
#  3. KEY VAULT
# ══════════════════════════════════════════════════════════════════════════════
section("KEY VAULT")

kv_name = f"cspm-demo-kv-{SUFFIX}"
try:
    if PROFILE == "vulnerable":
        kv_props = {
            "sku": {"family": "A", "name": "standard"},
            "tenant_id": TENANT_ID, "access_policies": [],
            "enable_soft_delete": False, "enable_purge_protection": None,
            "enable_rbac_authorization": False,
            "network_acls": {"default_action": "Allow", "bypass": "AzureServices"},
        }
        kvmc.vaults.begin_create_or_update(RG_NAME, kv_name,
                                            {"location": LOCATION, "tags": TAGS,
                                             "properties": kv_props}).result()
        ok(f"Key Vault '{kv_name}': no soft-delete, public access  → AZ-KV-001..009 (HIGH)")
        created.append(("Key Vault", kv_name, "AZ-KV-001,002,003,006,009", "HIGH"))

    elif PROFILE == "moderate":
        kv_props = {
            "sku": {"family": "A", "name": "standard"},
            "tenant_id": TENANT_ID, "access_policies": [],
            "enable_soft_delete": True, "enable_purge_protection": None,  # no purge protection
            "enable_rbac_authorization": False,
            "network_acls": {"default_action": "Allow", "bypass": "AzureServices"},
        }
        kvmc.vaults.begin_create_or_update(RG_NAME, kv_name,
                                            {"location": LOCATION, "tags": TAGS,
                                             "properties": kv_props}).result()
        ok(f"Key Vault '{kv_name}': no purge protection  → AZ-KV-002 (HIGH)")
        created.append(("Key Vault", kv_name, "AZ-KV-002", "HIGH"))

    else:  # secure
        kv_props = {
            "sku": {"family": "A", "name": "standard"},
            "tenant_id": TENANT_ID, "access_policies": [],
            "enable_soft_delete": True, "enable_rbac_authorization": True,
            "network_acls": {"default_action": "Deny", "bypass": "AzureServices"},
        }
        kvmc.vaults.begin_create_or_update(RG_NAME, kv_name,
                                            {"location": LOCATION, "tags": TAGS,
                                             "properties": kv_props}).result()
        ok(f"Key Vault '{kv_name}': compliant")
        created.append(("Key Vault", kv_name, "-", "PASS"))

except HttpResponseError as e:
    err(f"Key Vault: {e.message}")
    info("  Note: Some subscriptions enforce soft-delete by policy — this is expected.")


# ══════════════════════════════════════════════════════════════════════════════
#  4. SQL SERVER (vulnerable and moderate only — most expensive)
# ══════════════════════════════════════════════════════════════════════════════
if PROFILE in ("vulnerable", "moderate"):
    section("SQL SERVER")

    sql_server_name = f"cspm-demo-sql-{SUFFIX}"
    sql_admin_pass  = f"CspmDemo!{SUFFIX[:6]}2026"

    try:
        if PROFILE == "vulnerable":
            sqlc.servers.begin_create_or_update(RG_NAME, sql_server_name, {
                "location": LOCATION, "tags": TAGS,
                "administrator_login": "cspmdemoAdmin",
                "administrator_login_password": sql_admin_pass,
                "public_network_access": "Enabled",
                "minimal_tls_version": "1.0",
            }).result()
            sqlc.firewall_rules.create_or_update(
                RG_NAME, sql_server_name, "AllowAll",
                {"start_ip_address": "0.0.0.0", "end_ip_address": "255.255.255.255"})
            ok(f"SQL Server '{sql_server_name}': public, weak TLS, no auditing  → AZ-SQL-001..010 (CRITICAL/HIGH)")
            created.append(("SQL Server", sql_server_name, "AZ-SQL-001,002,003,004,005,007", "CRITICAL"))

        else:  # moderate
            sqlc.servers.begin_create_or_update(RG_NAME, sql_server_name, {
                "location": LOCATION, "tags": TAGS,
                "administrator_login": "cspmdemoAdmin",
                "administrator_login_password": sql_admin_pass,
                "public_network_access": "Enabled",
                "minimal_tls_version": "1.2",
            }).result()
            sqlc.firewall_rules.create_or_update(
                RG_NAME, sql_server_name, "AllowAzure",
                {"start_ip_address": "0.0.0.0", "end_ip_address": "0.0.0.0"})
            ok(f"SQL Server '{sql_server_name}': public access, no auditing  → AZ-SQL-001,003,004 (HIGH)")
            created.append(("SQL Server", sql_server_name, "AZ-SQL-001,003,004", "HIGH"))

        info(f"  SQL admin: cspmdemoAdmin / {sql_admin_pass}")
    except HttpResponseError as e:
        err(f"SQL Server: {e.message}")


# ══════════════════════════════════════════════════════════════════════════════
#  5. VIRTUAL MACHINE (vulnerable only — most expensive)
# ══════════════════════════════════════════════════════════════════════════════
if PROFILE == "vulnerable":
    section("VIRTUAL MACHINE — Standard_B1s (misconfig)")

    nic_name = f"cspm-demo-nic-{SUFFIX}"
    vm_name  = f"cspm-demo-vm-{SUFFIX}"

    try:
        # Register providers
        for ns in ["Microsoft.Compute"]:
            try:
                rmc.providers.register(ns)
            except Exception:
                pass
        time.sleep(5)

        pip_poller = nmc.public_ip_addresses.begin_create_or_update(
            RG_NAME, f"cspm-demo-pip-{SUFFIX}",
            {"location": LOCATION, "tags": TAGS,
             "sku": {"name": "Standard"},
             "public_ip_allocation_method": "Static"}
        )
        pip = pip_poller.result()

        nic_poller = nmc.network_interfaces.begin_create_or_update(
            RG_NAME, nic_name, {
                "location": LOCATION, "tags": TAGS,
                "ip_configurations": [{"name": "ipconfig1",
                                        "subnet": {"id": subnet_ref.id},
                                        "public_ip_address": {"id": pip.id}}],
                "network_security_group": {"id": nsg_ssh.id} if nsg_ssh else None,
            }
        )
        nic = nic_poller.result()

        sql_admin_pass_vm = f"CspmDemo!{SUFFIX[:6]}2026"
        vm_poller = cmc.virtual_machines.begin_create_or_update(
            RG_NAME, vm_name, {
                "location": LOCATION, "tags": TAGS,
                "hardware_profile": {"vm_size": "Standard_B2s"},
                "storage_profile": {
                    "image_reference": {
                        "publisher": "Canonical", "offer": "UbuntuServer",
                        "sku": "18.04-LTS", "version": "latest",
                    },
                    "os_disk": {
                        "create_option": "FromImage",
                        "managed_disk": {"storage_account_type": "Standard_LRS"},
                    },
                },
                "os_profile": {
                    "computer_name": "cspm-demo-vm", "admin_username": "cspmdemo",
                    "admin_password": sql_admin_pass_vm,
                    "linux_configuration": {
                        "disable_password_authentication": False,
                        "patch_settings": {"patch_mode": "ImageDefault"},
                    },
                },
                "network_profile": {
                    "network_interfaces": [{"id": nic.id, "primary": True}]
                },
            }
        )
        vm = vm_poller.result()
        ok(f"VM '{vm_name}': no disk encryption, password auth  → AZ-VM-001..007 (HIGH/MEDIUM)")
        created.append(("Virtual Machine", vm_name, "AZ-VM-001,002,004,005,006,007", "HIGH"))
        info("  ⚠  Delete this VM after demo to avoid charges")
    except HttpResponseError as e:
        err(f"VM: {e.message}")
    except Exception as e:
        err(f"VM: {e}")


# ══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
section(f"DEPLOYMENT COMPLETE — profile={PROFILE}  team={TEAM or 'default'}")

print(f"\n  Suffix: {BOLD}{SUFFIX}{RESET}  |  Resource Group: {BOLD}{RG_NAME}{RESET}")
print(f"  Subscription: {SUBSCRIPTION_ID}  |  Region: {LOCATION}\n")
print(f"  {'RESOURCE':<30} {'NAME':<35} {'RULE':<30} {'SEVERITY'}")
print(f"  {'─'*30} {'─'*35} {'─'*30} {'─'*8}")
for (rtype, name, rule, sev) in created:
    col = {"CRITICAL": "\033[31m", "HIGH": "\033[33m", "MEDIUM": "\033[34m",
           "LOW": "\033[37m", "PASS": "\033[32m"}.get(sev, "")
    print(f"  {rtype:<30} {str(name)[:35]:<35} {rule:<30} {col}{sev}{RESET}")

print(f"""
  ──────────────────────────────────────────────────────────
  Add this Azure account to Vanguard:
    Tenant ID:       {TENANT_ID}
    Client ID:       {CLIENT_ID}
    Subscription ID: {SUBSCRIPTION_ID}
  Expected findings:
    secure={GREEN}~3–8 (LOW){RESET}  moderate={YELLOW}~10–18 (MEDIUM/HIGH){RESET}  vulnerable={RED}~25–35 (CRITICAL+){RESET}
  CLEANUP:
  python3 demo_infra/cleanup_vulnerable_azure.py --rg {RG_NAME} --yes
  ──────────────────────────────────────────────────────────
""")

with open(SUFFIX_FILE, "w") as f:
    f.write(f"{SUFFIX}\n{SUBSCRIPTION_ID}\n{RG_NAME}")
print(f"  Suffix saved to {SUFFIX_FILE}")
