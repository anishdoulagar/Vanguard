"""
vanguard_api.py — stdlib-only Vanguard REST API client.
Used by demo_full.py and demo_destroy_all.py to provision and clean up
teams, users, and accounts in the Vanguard application.
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request


class VanguardAPIError(Exception):
    def __init__(self, status, detail):
        self.status = status
        self.detail = detail
        super().__init__(f"HTTP {status}: {detail}")


class VanguardAPI:
    def __init__(self, base_url: str, username: str, password: str):
        self.base     = base_url.rstrip("/")
        self.username = username   # Vanguard login username (not email)
        self.password = password
        self.token: str | None = None

    # ── low-level request ─────────────────────────────────────────────────────

    def _req(self, method: str, path: str, body: dict | None = None) -> dict:
        url = f"{self.base}{path}"
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode()
                return json.loads(raw) if raw.strip() else {}
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            try:
                detail = json.loads(raw).get("detail", raw)
            except Exception:
                detail = raw
            raise VanguardAPIError(e.code, detail)

    # ── auth ──────────────────────────────────────────────────────────────────

    def login(self) -> str:
        resp = self._req("POST", "/auth/login",
                         {"username": self.username, "password": self.password})

        # MFA required — prompt interactively for the TOTP code
        if resp.get("mfa_required"):
            mfa_token = resp.get("mfa_token")
            print(f"\n  \033[33m→\033[0m  MFA is enabled on this account.")
            print(f"  \033[33m→\033[0m  Open your authenticator app and enter the 6-digit code.")
            code = input("  MFA code: ").strip()
            resp = self._req("POST", "/auth/mfa/verify",
                             {"mfa_token": mfa_token, "code": code})

        token = resp.get("token") or resp.get("access_token")
        if not token:
            raise VanguardAPIError(200, f"No token in response: {resp}")
        self.token = token
        return token

    # ── teams ─────────────────────────────────────────────────────────────────

    def create_team(self, name: str, description: str = "") -> str:
        resp = self._req("POST", "/teams", {"name": name, "description": description})
        team_id = resp.get("team", {}).get("id")
        if not team_id:
            raise VanguardAPIError(0, f"No team.id in create_team response: {resp}")
        return str(team_id)

    def list_teams(self) -> list:
        resp = self._req("GET", "/teams")
        return resp.get("teams", [])

    def delete_team(self, team_id: str) -> None:
        self._req("DELETE", f"/teams/{team_id}")

    # ── users ─────────────────────────────────────────────────────────────────

    def create_user(self, username: str, display_name: str, email: str,
                    password: str, role: str) -> str:
        """
        Create a user via the invite flow (superadmin-only).
        Passes always_return_url=true so the invite URL is returned even
        when SMTP is configured and the email was sent.
        Returns the new user's ID.
        """
        # Step 1: send invite — always_return_url ensures we get the token
        # even when SMTP is enabled and the email was successfully delivered.
        inv = self._req("POST", "/admin/invite", {
            "email":             email,
            "role":              role,
            "always_return_url": True,
        })

        invite_url = inv.get("invite_url")
        if not invite_url:
            raise VanguardAPIError(0,
                f"No invite_url returned for {email}. "
                "Ensure the Vanguard backend is up to date (always_return_url support required).")

        # Step 2: extract token from URL (e.g. http://host?invite_token=abc)
        parsed = urllib.parse.urlparse(invite_url)
        token = urllib.parse.parse_qs(parsed.query).get("invite_token", [None])[0]
        if not token:
            raise VanguardAPIError(0, f"Could not extract invite_token from: {invite_url}")

        # Step 3: accept invite to create the account
        resp = self._req("POST", "/auth/accept-invite", {
            "token":    token,
            "username": username,
            "name":     display_name,
            "password": password,
        })

        # Response format: {"token": "...", "user": {"id": "uuid", ...}}
        user_id = resp.get("user", {}).get("id")
        if not user_id:
            raise VanguardAPIError(0,
                f"No user.id in accept-invite response for {username}: {resp}")
        return str(user_id)

    def list_users(self) -> list:
        resp = self._req("GET", "/admin/users")
        return resp.get("users", [])

    def set_user_role(self, user_id: str, role: str) -> None:
        self._req("PUT", f"/admin/users/{user_id}/role", {"role": role})

    def delete_user(self, user_id: str) -> None:
        self._req("DELETE", f"/admin/users/{user_id}")

    # ── team membership ───────────────────────────────────────────────────────

    def add_to_team(self, team_id: str, user_id: str) -> None:
        self._req("POST", f"/teams/{team_id}/members", {"user_id": user_id})

    # ── cloud accounts ────────────────────────────────────────────────────────

    def add_aws_account(self, name: str, access_key_id: str,
                        secret_access_key: str, region: str,
                        team_id: str) -> str:
        resp = self._req("POST", "/accounts", {
            "name":               name,
            "cloud":              "aws",
            "access_key_id":      access_key_id,
            "secret_access_key":  secret_access_key,
            "region":             region,
            "scan_interval_hours": 0,
            "category":           "Demo",
            "team_id":            team_id,
        })
        account_id = resp.get("account", {}).get("id")
        if not account_id:
            raise VanguardAPIError(0, f"No account.id in add_aws_account response: {resp}")
        return str(account_id)

    def add_azure_account(self, name: str, subscription_id: str, tenant_id: str,
                          client_id: str, client_secret: str, team_id: str,
                          resource_group: str = "") -> str:
        resp = self._req("POST", "/accounts", {
            "name":            name,
            "cloud":           "azure",
            "subscription_id": subscription_id,
            "tenant_id":       tenant_id,
            "client_id":       client_id,
            "client_secret":   client_secret,
            "resource_group":  resource_group,
            "scan_interval_hours": 0,
            "category":        "Demo",
            "team_id":         team_id,
        })
        account_id = resp.get("account", {}).get("id")
        if not account_id:
            raise VanguardAPIError(0, f"No account.id in add_azure_account response: {resp}")
        return str(account_id)

    def list_accounts(self) -> list:
        resp = self._req("GET", "/accounts")
        return resp.get("accounts", [])

    def delete_account(self, account_id: str) -> None:
        self._req("DELETE", f"/accounts/{account_id}")

    def trigger_scan(self, account_id: str) -> None:
        self._req("POST", f"/accounts/{account_id}/scan")
