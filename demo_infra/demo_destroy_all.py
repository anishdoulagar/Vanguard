"""
demo_destroy_all.py — Full Demo Teardown
=========================================
Destroys ALL demo cloud resources and removes demo teams/users/accounts
from the Vanguard application.

Run via:  python3 demo_infra/demo_manager.py demo-destroy
"""

import os
import subprocess
import sys
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

TEAMS = ["alpha", "beta", "gamma"]

def banner(title):
    print(f"\n{CYAN}{BOLD}{'═' * 60}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{BOLD}{'═' * 60}{RESET}")

def ok(msg):   print(f"  {GREEN}✓{RESET}  {msg}")
def info(msg): print(f"  {YELLOW}→{RESET}  {msg}")
def err(msg):  print(f"  {RED}✗{RESET}  {msg}")

def run_script(script_name, extra_args=()):
    cmd = [sys.executable, str(SCRIPTS / script_name)] + list(extra_args)
    result = subprocess.run(cmd, env=os.environ)
    return result.returncode


# ══════════════════════════════════════════════════════════════════════════════
#  STEP 1: Remove demo data from Vanguard
# ══════════════════════════════════════════════════════════════════════════════
def cleanup_vanguard():
    banner("STEP 1 OF 3 — REMOVING VANGUARD DEMO DATA")

    api_url  = os.environ.get("VANGUARD_API_URL", "http://localhost:8000")
    adm_user = os.environ.get("VANGUARD_ADMIN_USERNAME", "")
    adm_pass = os.environ.get("VANGUARD_ADMIN_PASSWORD", "")

    if not adm_user or not adm_pass:
        info("VANGUARD_ADMIN_USERNAME / VANGUARD_ADMIN_PASSWORD not set — skipping Vanguard cleanup")
        info("  Delete demo accounts/teams/users manually in the dashboard.")
        return

    from vanguard_api import VanguardAPI, VanguardAPIError

    api = VanguardAPI(api_url, adm_user, adm_pass)
    try:
        api.login()
        ok(f"Logged in to Vanguard at {api_url}")
    except VanguardAPIError as e:
        err(f"Vanguard login failed: {e}")
        return

    # Delete demo accounts (name starts with "Demo-")
    info("Deleting demo cloud accounts...")
    try:
        accounts = api.list_accounts()
        for acc in accounts:
            name = acc.get("name", "")
            if name.startswith("Demo-"):
                try:
                    api.delete_account(str(acc["id"]))
                    ok(f"Deleted account: {name}")
                except VanguardAPIError as e:
                    err(f"Delete account '{name}': {e}")
    except VanguardAPIError as e:
        err(f"List accounts: {e}")

    # Delete demo users (email ends with @demo.vanguard)
    info("Deleting demo users...")
    try:
        users = api.list_users()
        for user in users:
            email = user.get("email", "")
            if email.endswith("@demo.vanguard"):
                try:
                    api.delete_user(str(user["id"]))
                    ok(f"Deleted user: {email}")
                except VanguardAPIError as e:
                    err(f"Delete user '{email}': {e}")
    except VanguardAPIError as e:
        err(f"List users: {e}")

    # Delete demo teams (name starts with "Demo ")
    info("Deleting demo teams...")
    try:
        teams = api.list_teams()
        for team in teams:
            name = team.get("name", "")
            if name.startswith("Demo "):
                try:
                    api.delete_team(str(team["id"]))
                    ok(f"Deleted team: {name}")
                except VanguardAPIError as e:
                    err(f"Delete team '{name}': {e}")
    except VanguardAPIError as e:
        err(f"List teams: {e}")

    ok("Vanguard cleanup complete.")


# ══════════════════════════════════════════════════════════════════════════════
#  STEP 2: Destroy cloud resources
# ══════════════════════════════════════════════════════════════════════════════
def destroy_cloud_resources():
    banner("STEP 2 OF 3 — DESTROYING CLOUD RESOURCES")

    for team_key in TEAMS:
        # AWS
        aws_file = SCRIPTS / f".aws_demo_suffix_{team_key}"
        if aws_file.exists():
            info(f"Destroying AWS resources for team={team_key}...")
            rc = run_script("cleanup_vulnerable_aws.py", ["--team", team_key])
            if rc == 0:
                ok(f"AWS {team_key} resources deleted")
            else:
                err(f"AWS {team_key} cleanup had errors — check output above")
        else:
            info(f"No AWS deployment found for team={team_key} — skipping")

        # Azure
        az_file = SCRIPTS / f".azure_demo_suffix_{team_key}"
        if az_file.exists():
            lines = az_file.read_text().strip().split("\n")
            rg_name = lines[2] if len(lines) > 2 else f"cspm-demo-{team_key}"
            info(f"Destroying Azure resource group: {rg_name}...")
            rc = run_script("cleanup_vulnerable_azure.py", ["--rg", rg_name, "--yes"])
            if rc == 0:
                ok(f"Azure {team_key} resources deleted (RG: {rg_name})")
            else:
                err(f"Azure {team_key} cleanup had errors")
        else:
            info(f"No Azure deployment found for team={team_key} — skipping")

    ok("Cloud resource teardown complete.")


# ══════════════════════════════════════════════════════════════════════════════
#  STEP 3: Remove local state files
# ══════════════════════════════════════════════════════════════════════════════
def cleanup_state_files():
    banner("STEP 3 OF 3 — REMOVING LOCAL STATE FILES")

    patterns = (
        [f".aws_demo_suffix_{t}" for t in TEAMS] +
        [f".azure_demo_suffix_{t}" for t in TEAMS] +
        [".aws_demo_suffix", ".azure_demo_suffix"]
    )
    for fname in patterns:
        fpath = SCRIPTS / fname
        if fpath.exists():
            fpath.unlink()
            ok(f"Removed {fname}")

    ok("State files cleaned up.")


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"\n{RED}{BOLD}⚠  DEMO TEARDOWN — This will destroy all demo cloud resources and app data.{RESET}")
    if "--yes" not in sys.argv:
        confirm = input("  Type 'yes' to confirm: ").strip().lower()
        if confirm != "yes":
            print("Aborted.")
            sys.exit(0)

    cleanup_vanguard()
    destroy_cloud_resources()
    cleanup_state_files()

    print(f"\n{GREEN}{BOLD}✓  Demo teardown complete. No further cloud charges will accrue.{RESET}\n")
