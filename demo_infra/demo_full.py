"""
demo_full.py — Vanguard CSPM Full Demo Orchestrator
=====================================================
Deploys 3 AWS + 3 Azure environments with different vulnerability profiles,
then provisions Vanguard with teams, users, and accounts automatically.

Run via:  python3 demo_infra/demo_manager.py demo

Requires .env to include:
  VANGUARD_API_URL, VANGUARD_ADMIN_EMAIL, VANGUARD_ADMIN_PASSWORD

TEAMS / PROFILES:
  Team Alpha  (Financial)   → secure     → expected score ~85–95
  Team Beta   (Operations)  → moderate   → expected score ~60–72
  Team Gamma  (Legacy)      → vulnerable → expected score ~25–40

DEMO USERS created:
  alice  — superadmin         (all teams)
  bob    — admin, Team Alpha
  carol  — analyst, Team Alpha
  dave   — admin, Team Beta
  eve    — analyst, Team Beta
  frank  — admin, Team Gamma

All demo users use password: VanguardDemo2024!

COST ESTIMATE:
  ~$0.03–0.05/hour while running (EC2 + 2× SQL Server + VMs for Gamma only)
  Run 'demo-destroy' immediately after presentation.
"""

import os
import subprocess
import sys
import time
import pathlib

SCRIPTS = pathlib.Path(__file__).parent
sys.path.insert(0, str(SCRIPTS))
from load_env import load_env
load_env()

GREEN  = "\033[32m"
YELLOW = "\033[33m"
RED    = "\033[31m"
CYAN   = "\033[36m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

DEMO_PASSWORD = "VanguardDemo2024!"

# ── DEMO USERS ─────────────────────────────────────────────────────────────────
DEMO_USERS = [
    # (username, display_name, email, role, team_key)
    ("alice_demo",  "Alice Chen",    "alice@demo.vanguard",  "superadmin", None),
    ("bob_demo",    "Bob Martinez",  "bob@demo.vanguard",    "admin",      "alpha"),
    ("carol_demo",  "Carol Singh",   "carol@demo.vanguard",  "analyst",    "alpha"),
    ("dave_demo",   "Dave Park",     "dave@demo.vanguard",   "admin",      "beta"),
    ("eve_demo",    "Eve Johnson",   "eve@demo.vanguard",    "analyst",    "beta"),
    ("frank_demo",  "Frank Wilson",  "frank@demo.vanguard",  "admin",      "gamma"),
]

# ── TEAM DEFINITIONS ───────────────────────────────────────────────────────────
TEAMS = [
    ("alpha", "Demo Alpha — Financial",   "Financial services team (secure posture)"),
    ("beta",  "Demo Beta — Operations",   "Operations team (moderate posture)"),
    ("gamma", "Demo Gamma — Legacy",      "Legacy systems team (vulnerable posture)"),
]

# ── PROFILES ───────────────────────────────────────────────────────────────────
PROFILES = {
    "alpha": "secure",
    "beta":  "moderate",
    "gamma": "vulnerable",
}

# Each team deploys to a distinct AWS region so the CSPM scanner sees
# only that team's resources → genuinely different scores per team.
TEAM_REGIONS = {
    "alpha": "us-east-1",   # secure   → high score
    "beta":  "us-west-2",   # moderate → medium score
    "gamma": "eu-west-1",   # vulnerable → low score
}

def banner(title):
    print(f"\n{CYAN}{BOLD}{'═' * 60}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{BOLD}{'═' * 60}{RESET}")

def ok(msg):   print(f"  {GREEN}✓{RESET}  {msg}")
def info(msg): print(f"  {YELLOW}→{RESET}  {msg}")
def err(msg):  print(f"  {RED}✗{RESET}  {msg}")
def step(n, total, msg):
    print(f"\n  {CYAN}[{n}/{total}]{RESET}  {BOLD}{msg}{RESET}")


def run_script(script_name, extra_args=()):
    cmd = [sys.executable, str(SCRIPTS / script_name)] + list(extra_args)
    result = subprocess.run(cmd, env=os.environ)
    return result.returncode


# ══════════════════════════════════════════════════════════════════════════════
#  STEP 1: Deploy cloud resources (6 environments)
# ══════════════════════════════════════════════════════════════════════════════
def deploy_cloud_environments():
    banner("STEP 1 OF 3 — DEPLOYING CLOUD ENVIRONMENTS")
    total = 6
    n = 0

    for team_key, team_name, _ in TEAMS:
        profile = PROFILES[team_key]

        n += 1
        step(n, total, f"AWS  [{profile:>10}]  → Team {team_name.split('—')[0].strip()}")
        rc = run_script("deploy_vulnerable_aws.py",
                        ["--profile", profile, "--team", team_key,
                         "--region", TEAM_REGIONS[team_key]])
        if rc != 0:
            err(f"AWS deploy failed for team={team_key} — skipping this team")
            n += 1  # keep counter aligned
            continue

        n += 1
        step(n, total, f"Azure [{profile:>10}]  → Team {team_name.split('—')[0].strip()}")
        rc = run_script("deploy_vulnerable_azure.py",
                        ["--profile", profile, "--team", team_key])
        if rc != 0:
            err(f"Azure deploy failed for team={team_key}")
            continue

        # deploy_azure_missing adds KV/SQL/VM for vulnerable profile
        if profile == "vulnerable":
            info("  Adding Key Vault, SQL Server, VM (vulnerable extras)...")
            run_script("deploy_azure_missing.py", ["--team", team_key])

    ok("All 6 cloud environments deployed.")


# ══════════════════════════════════════════════════════════════════════════════
#  STEP 2: Provision Vanguard (teams, users, accounts)
# ══════════════════════════════════════════════════════════════════════════════
def provision_vanguard():
    banner("STEP 2 OF 3 — PROVISIONING VANGUARD")

    api_url  = os.environ.get("VANGUARD_API_URL", "http://localhost:8000")
    adm_user = os.environ.get("VANGUARD_ADMIN_USERNAME", "")
    adm_pass = os.environ.get("VANGUARD_ADMIN_PASSWORD", "")

    if not adm_user or not adm_pass:
        err("VANGUARD_ADMIN_USERNAME / VANGUARD_ADMIN_PASSWORD not set in .env — skipping Vanguard provisioning")
        info("  Add accounts manually in the Vanguard dashboard.")
        return {}

    from vanguard_api import VanguardAPI, VanguardAPIError

    api = VanguardAPI(api_url, adm_user, adm_pass)
    try:
        api.login()
        ok(f"Logged in to Vanguard at {api_url}")
    except VanguardAPIError as e:
        err(f"Vanguard login failed: {e}")
        info("  Is the Vanguard backend running? Check VANGUARD_ADMIN_USERNAME/PASSWORD.")
        return {}

    # Create teams
    team_ids = {}
    info("Creating teams...")
    for team_key, team_name, team_desc in TEAMS:
        try:
            tid = api.create_team(team_name, team_desc)
            team_ids[team_key] = tid
            ok(f"Team '{team_name}'  →  id={tid}")
        except VanguardAPIError as e:
            err(f"Create team '{team_name}': {e}")

    # Create users
    user_ids = {}
    info("\nCreating demo users...")
    for username, display_name, email, role, team_key in DEMO_USERS:
        try:
            uid = api.create_user(username, display_name, email, DEMO_PASSWORD, role)
            user_ids[username] = uid
            ok(f"User '{username}' ({role})  →  id={uid}")

            # Add to team if applicable
            if team_key and team_key in team_ids:
                api.add_to_team(team_ids[team_key], uid)
                ok(f"  Added '{username}' to team '{team_key}'")
        except VanguardAPIError as e:
            err(f"Create user '{username}': {e}")

    # Register cloud accounts
    aws_key_id     = os.environ.get("AWS_ACCESS_KEY_ID", "")
    aws_secret     = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    az_sub         = os.environ.get("AZURE_SUBSCRIPTION_ID", "")
    az_tenant      = os.environ.get("AZURE_TENANT_ID", "")
    az_client_id   = os.environ.get("AZURE_CLIENT_ID", "")
    az_client_sec  = os.environ.get("AZURE_CLIENT_SECRET", "")

    account_ids = {}
    info("\nRegistering cloud accounts...")
    for team_key, team_name, _ in TEAMS:
        short = team_name.split("—")[0].strip()
        tid = team_ids.get(team_key)
        if not tid:
            err(f"No team_id for {team_key} — skipping accounts")
            continue

        # Read region from the suffix file written during deployment.
        # Falls back to the TEAM_REGIONS default if the file is missing.
        suffix_file = SCRIPTS / f".aws_demo_suffix_{team_key}"
        if suffix_file.exists():
            lines = suffix_file.read_text().strip().split("\n")
            team_aws_region = lines[2] if len(lines) > 2 else TEAM_REGIONS[team_key]
        else:
            team_aws_region = TEAM_REGIONS[team_key]

        if aws_key_id:
            try:
                aid = api.add_aws_account(
                    name=f"Demo-AWS-{team_key.capitalize()}",
                    access_key_id=aws_key_id,
                    secret_access_key=aws_secret,
                    region=team_aws_region,
                    team_id=tid,
                )
                account_ids[f"aws_{team_key}"] = aid
                ok(f"AWS account 'Demo-AWS-{team_key.capitalize()}'  →  id={aid}  region={team_aws_region}  (team={tid})")
            except VanguardAPIError as e:
                err(f"Add AWS account for {team_key}: {e}")
        else:
            info(f"AWS credentials not configured — skipping AWS account for {team_key}")

        if az_sub and az_tenant:
            # Read resource group from the suffix file written during deployment.
            az_suffix_file = SCRIPTS / f".azure_demo_suffix_{team_key}"
            if az_suffix_file.exists():
                az_lines = az_suffix_file.read_text().strip().split("\n")
                team_rg = az_lines[2] if len(az_lines) > 2 else f"cspm-demo-{team_key}"
            else:
                team_rg = f"cspm-demo-{team_key}"

            try:
                aid = api.add_azure_account(
                    name=f"Demo-Azure-{team_key.capitalize()}",
                    subscription_id=az_sub,
                    tenant_id=az_tenant,
                    client_id=az_client_id,
                    client_secret=az_client_sec,
                    team_id=tid,
                    resource_group=team_rg,
                )
                account_ids[f"azure_{team_key}"] = aid
                ok(f"Azure account 'Demo-Azure-{team_key.capitalize()}'  →  id={aid}  rg={team_rg}  (team={tid})")
            except VanguardAPIError as e:
                err(f"Add Azure account for {team_key}: {e}")
        else:
            info(f"Azure credentials not configured — skipping Azure account for {team_key}")

    return account_ids


# ══════════════════════════════════════════════════════════════════════════════
#  STEP 3: Trigger initial scans
# ══════════════════════════════════════════════════════════════════════════════
def trigger_scans(account_ids: dict):
    if not account_ids:
        return

    banner("STEP 3 OF 3 — TRIGGERING INITIAL SCANS")

    api_url  = os.environ.get("VANGUARD_API_URL", "http://localhost:8000")
    adm_user = os.environ.get("VANGUARD_ADMIN_USERNAME", "")
    adm_pass = os.environ.get("VANGUARD_ADMIN_PASSWORD", "")

    from vanguard_api import VanguardAPI, VanguardAPIError
    api = VanguardAPI(api_url, adm_user, adm_pass)
    try:
        api.login()
    except Exception:
        return

    for key, aid in account_ids.items():
        try:
            api.trigger_scan(aid)
            ok(f"Scan triggered: {key}  (account_id={aid})")
        except VanguardAPIError as e:
            err(f"Scan trigger {key}: {e}")

    info("Scans are running asynchronously — results appear in Vanguard in 2–5 minutes.")


# ══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
def print_summary():
    banner("DEMO ENVIRONMENT READY")

    print(f"""
  {BOLD}TEAM STRUCTURE:{RESET}
  ┌─────────────┬─────────────────────────┬──────────────┬─────────────┬──────────────────┐
  │ Team        │ Name                    │ Profile      │ AWS Region  │ Expected Score   │
  ├─────────────┼─────────────────────────┼──────────────┼─────────────┼──────────────────┤
  │ alpha       │ Demo Alpha — Financial  │ secure       │ us-east-1   │ {GREEN}85–95{RESET}             │
  │ beta        │ Demo Beta — Operations  │ moderate     │ us-west-2   │ {YELLOW}60–72{RESET}             │
  │ gamma       │ Demo Gamma — Legacy     │ vulnerable   │ eu-west-1   │ {RED}25–40{RESET}             │
  └─────────────┴─────────────────────────┴──────────────┴─────────────┴──────────────────┘

  {BOLD}DEMO USER CREDENTIALS:{RESET}  (password: {BOLD}{DEMO_PASSWORD}{RESET})
  ┌──────────────┬─────────────┬───────────────────────────────────────────────┐
  │ Username     │ Role        │ Access                                        │
  ├──────────────┼─────────────┼───────────────────────────────────────────────┤
  │ alice_demo   │ superadmin  │ All teams, all accounts, admin settings       │
  │ bob_demo     │ admin       │ Team Alpha only — AWS + Azure Alpha accounts  │
  │ carol_demo   │ analyst     │ Team Alpha only — read-only                   │
  │ dave_demo    │ admin       │ Team Beta only  — AWS + Azure Beta accounts   │
  │ eve_demo     │ analyst     │ Team Beta only  — read-only                   │
  │ frank_demo   │ admin       │ Team Gamma only — AWS + Azure Gamma accounts  │
  └──────────────┴─────────────┴───────────────────────────────────────────────┘

  {BOLD}WHAT TO DEMONSTRATE:{RESET}
  1. Log in as alice_demo (superadmin) → see all 3 teams, all 6 accounts, different scores
  2. Log in as bob_demo (admin, Alpha) → see ONLY Team Alpha accounts (high score)
  3. Log in as dave_demo (admin, Beta) → see ONLY Team Beta accounts (medium score)
  4. Log in as frank_demo (admin, Gamma) → see ONLY Team Gamma accounts (low score, many findings)
  5. Show Policies page → 345+ rules across AWS + Azure frameworks
  6. Show Alerts page → configure thresholds per account
  7. Show History page → filter by date, cloud, severity
  8. Show Audit log → user actions tracked per team

  {BOLD}AFTER THE PRESENTATION — DESTROY EVERYTHING:{RESET}
  {YELLOW}python3 demo_infra/demo_manager.py demo-destroy{RESET}
""")


if __name__ == "__main__":
    deploy_cloud_environments()
    account_ids = provision_vanguard()
    trigger_scans(account_ids)
    print_summary()
