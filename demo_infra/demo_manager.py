#!/usr/bin/env python3
"""
Vanguard CSPM — Demo Infrastructure Manager
============================================
Deploys intentionally vulnerable cloud resources for CSPM testing,
then tears them down cleanly so you are not charged for idle resources.

SETUP (one time):
  cp demo_infra/.env.example demo_infra/.env
  # Fill in your Azure / AWS credentials in demo_infra/.env
  # Also fill in VANGUARD_API_URL, VANGUARD_ADMIN_USERNAME, VANGUARD_ADMIN_PASSWORD

USAGE:
  python3 demo_infra/demo_manager.py demo              # Full demo: 3 teams × 2 clouds + Vanguard provisioning (~20 min)
  python3 demo_infra/demo_manager.py demo-destroy      # Tear everything down after presentation

  python3 demo_infra/demo_manager.py deploy azure      # Single Azure env (vulnerable profile) ~5 min
  python3 demo_infra/demo_manager.py deploy aws        # Single AWS env (vulnerable profile) ~3 min
  python3 demo_infra/demo_manager.py status            # List running resources
  python3 demo_infra/demo_manager.py destroy azure     # Delete single Azure demo
  python3 demo_infra/demo_manager.py destroy aws       # Delete single AWS demo

DEMO COMMAND DETAILS:
  'demo' deploys 6 environments across 3 teams with different security postures:
    Team Alpha  (secure)     → expected CSPM score ~85–95
    Team Beta   (moderate)   → expected CSPM score ~60–72
    Team Gamma  (vulnerable) → expected CSPM score ~25–40
  Then provisions Vanguard with teams, users (alice/bob/carol/dave/eve/frank),
  and cloud accounts, and triggers initial scans.

COST:
  Full demo:  ~$0.03–0.05/hour (1 EC2 + 2 SQL Servers + 1 Azure VM for Gamma only)
  Single env: Azure ~$0.05/hour, AWS ~$0.01/hour
  Destroy immediately after the presentation to avoid charges.
"""

import os, sys, subprocess, pathlib

# ── Bootstrap: load credentials from demo_infra/.env ─────────────────────────
SCRIPTS = pathlib.Path(__file__).parent
sys.path.insert(0, str(SCRIPTS))
from load_env import load_env

GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def banner(title):
    print(f"\n{CYAN}{BOLD}{'─' * 60}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{BOLD}{'─' * 60}{RESET}")

def run_script(script_name, extra_args=()):
    """Run a sibling script in the same process env, streaming output."""
    cmd = [sys.executable, str(SCRIPTS / script_name)] + list(extra_args)
    result = subprocess.run(cmd, env=os.environ)
    return result.returncode


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_deploy(cloud):
    load_env()
    if cloud == "azure":
        banner("DEPLOYING AZURE DEMO INFRASTRUCTURE")
        print(f"  {YELLOW}→{RESET}  This creates intentionally misconfigured resources.")
        print(f"  {YELLOW}→{RESET}  Expected findings: 25–35 (CRITICAL / HIGH / MEDIUM / LOW)")
        print(f"  {YELLOW}→{RESET}  Estimated cost: ~$0.05/hour while running\n")
        rc = run_script("deploy_vulnerable_azure.py")
        if rc == 0:
            print(f"\n  {YELLOW}→{RESET}  Adding Key Vault, SQL Server, VM...")
            run_script("deploy_azure_missing.py")
        print(f"\n  {GREEN}✓{RESET}  Deploy complete.")
        print(f"  {YELLOW}→{RESET}  Add this Azure account in Vanguard and run a scan.")
        print(f"  {YELLOW}→{RESET}  Run 'destroy azure' when done to avoid charges.\n")

    elif cloud == "aws":
        banner("DEPLOYING AWS DEMO INFRASTRUCTURE")
        print(f"  {YELLOW}→{RESET}  Expected findings: 30–40 (CRITICAL / HIGH / MEDIUM / LOW)")
        print(f"  {YELLOW}→{RESET}  Estimated cost: ~$0.01/hour while running\n")
        run_script("deploy_vulnerable_aws.py")
        print(f"\n  {GREEN}✓{RESET}  Deploy complete.")
        print(f"  {YELLOW}→{RESET}  Run 'destroy aws' when done to avoid charges.\n")

    else:
        print(f"{RED}Unknown cloud '{cloud}'. Use: azure | aws{RESET}")
        sys.exit(1)


def cmd_destroy(cloud):
    load_env()
    if cloud == "azure":
        banner("DESTROYING AZURE DEMO RESOURCES")
        run_script("cleanup_vulnerable_azure.py", ["--yes"])
        print(f"\n  {GREEN}✓{RESET}  Azure demo resources deleted. No further charges.\n")

    elif cloud == "aws":
        banner("DESTROYING AWS DEMO RESOURCES")
        run_script("cleanup_vulnerable_aws.py", ["--yes"])
        print(f"\n  {GREEN}✓{RESET}  AWS demo resources deleted. No further charges.\n")

    else:
        print(f"{RED}Unknown cloud '{cloud}'. Use: azure | aws{RESET}")
        sys.exit(1)


def cmd_status():
    load_env()
    banner("DEMO INFRASTRUCTURE STATUS")

    # ── Azure ────────────────────────────────────────────────────────────────
    azure_creds_ok = all(
        os.environ.get(k) for k in
        ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_SUBSCRIPTION_ID"]
    )
    if azure_creds_ok:
        try:
            from azure.identity import ClientSecretCredential
            from azure.mgmt.resource import ResourceManagementClient
            cred = ClientSecretCredential(
                os.environ["AZURE_TENANT_ID"],
                os.environ["AZURE_CLIENT_ID"],
                os.environ["AZURE_CLIENT_SECRET"],
            )
            rmc = ResourceManagementClient(cred, os.environ["AZURE_SUBSCRIPTION_ID"])
            rgs = [rg for rg in rmc.resource_groups.list() if "cspm-demo" in rg.name]
            if not rgs:
                print(f"  {YELLOW}Azure:{RESET}  No demo resource groups found.")
                print(f"          Run: python3 demo_infra/demo_manager.py deploy azure")
            for rg in rgs:
                resources = list(rmc.resources.list_by_resource_group(rg.name))
                print(f"  {GREEN}Azure:{RESET}  {rg.name}  ({len(resources)} resources, {rg.location})")
                for r in resources:
                    rtype = r.type.split("/")[-1] if "/" in r.type else r.type
                    print(f"          {YELLOW}•{RESET}  {rtype:35s}  {r.name}")
        except Exception as e:
            print(f"  {RED}Azure error:{RESET} {e}")
    else:
        print(f"  {YELLOW}Azure:{RESET}  Credentials not configured in demo_infra/.env")

    print()

    # ── AWS ──────────────────────────────────────────────────────────────────
    aws_creds_ok = all(
        os.environ.get(k) for k in ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
    )
    if aws_creds_ok:
        suffix_file = SCRIPTS / ".aws_demo_suffix"
        if suffix_file.exists():
            try:
                import boto3
                lines = suffix_file.read_text().strip().split("\n")
                suffix = lines[0]
                region = lines[2] if len(lines) > 2 else os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
                session = boto3.Session(region_name=region)
                ec2 = session.client("ec2")
                s3  = session.client("s3")
                buckets = [b["Name"] for b in s3.list_buckets().get("Buckets", [])
                           if f"cspm-demo" in b["Name"] and suffix in b["Name"]]
                instances = ec2.describe_instances(Filters=[
                    {"Name": "tag:project", "Values": ["cspm-demo"]},
                    {"Name": "instance-state-name", "Values": ["running", "stopped"]},
                ])
                inst_count = sum(
                    len(r["Instances"])
                    for res in instances["Reservations"]
                    for r in [res]
                )
                print(f"  {GREEN}AWS:{RESET}    suffix={suffix}  region={region}")
                print(f"          {YELLOW}•{RESET}  S3 buckets: {len(buckets)}")
                print(f"          {YELLOW}•{RESET}  EC2 instances: {inst_count}")
            except Exception as e:
                print(f"  {RED}AWS error:{RESET} {e}")
        else:
            print(f"  {YELLOW}AWS:{RESET}    No active demo deployment found.")
            print(f"          Run: python3 demo_infra/demo_manager.py deploy aws")
    else:
        print(f"  {YELLOW}AWS:{RESET}    Credentials not configured in demo_infra/.env")

    print()


def cmd_demo_full():
    load_env()
    banner("FULL DEMO DEPLOYMENT — 3 TEAMS × 2 CLOUDS")
    print(f"  {YELLOW}→{RESET}  This deploys 6 cloud environments and provisions Vanguard.")
    print(f"  {YELLOW}→{RESET}  Expected time: 15–25 minutes.")
    print(f"  {YELLOW}→{RESET}  Expected cost: ~$0.03–0.05/hour while running.\n")
    run_script("demo_full.py")


def cmd_demo_destroy():
    load_env()
    banner("FULL DEMO TEARDOWN")
    print(f"  {RED}→{RESET}  This destroys ALL demo cloud resources and Vanguard demo data.\n")
    run_script("demo_destroy_all.py", ["--yes"])


# ── Dispatch ──────────────────────────────────────────────────────────────────
args = sys.argv[1:]

if len(args) == 1 and args[0] == "demo":
    cmd_demo_full()
elif len(args) == 1 and args[0] == "demo-destroy":
    cmd_demo_destroy()
elif len(args) == 2 and args[0] == "deploy":
    cmd_deploy(args[1])
elif len(args) == 2 and args[0] == "destroy":
    cmd_destroy(args[1])
elif len(args) == 1 and args[0] == "status":
    cmd_status()
else:
    print(__doc__)
    sys.exit(0)
