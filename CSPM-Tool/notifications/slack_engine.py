"""
Slack Engine
Sends alert notifications to Slack via incoming webhooks.

Configure per-alert in the Alerts settings page by pasting an Incoming Webhook URL.
Create a webhook: your-workspace.slack.com → Settings → Apps → Incoming Webhooks

No extra dependencies — uses urllib from the standard library.
"""

import json
import logging
import urllib.request
import urllib.error
from datetime import datetime

logger = logging.getLogger(__name__)


def is_slack_webhook_valid(url: str) -> bool:
    return bool(url and url.startswith("https://hooks.slack.com/"))


def send_slack_notification(
    webhook_url: str,
    account_name: str,
    cloud: str,
    score: int,
    threshold: int,
    findings: list,
    trigger_reason: str = "",
) -> bool:
    """
    Send a Slack Block Kit alert message. Returns True on success.
    """
    if not is_slack_webhook_valid(webhook_url):
        logger.warning("Invalid or missing Slack webhook URL — skipping.")
        return False

    score_emoji = "🟢" if score >= 80 else "🟡" if score >= 60 else "🟠" if score >= 40 else "🔴"
    cloud_label = cloud.upper()

    sev_counts: dict[str, int] = {}
    for f in findings:
        sev = (f.get("severity") or "LOW").upper()
        sev_counts[sev] = sev_counts.get(sev, 0) + 1

    sev_line = "  ".join(
        f"*{s}:* {n}"
        for s, n in [("CRITICAL", sev_counts.get("CRITICAL", 0)),
                     ("HIGH",     sev_counts.get("HIGH",     0)),
                     ("MEDIUM",   sev_counts.get("MEDIUM",   0)),
                     ("LOW",      sev_counts.get("LOW",      0))]
        if n > 0
    )

    top_findings_text = ""
    for f in findings[:5]:
        sev  = (f.get("severity") or "").upper()
        rid  = f.get("rule_id", "")
        res  = f.get("resource_name") or f.get("resource_id") or ""
        msg  = (f.get("message") or "")[:80]
        top_findings_text += f"• `{sev}` {rid} — {res}\n  _{msg}_\n"

    if len(findings) > 5:
        top_findings_text += f"_...and {len(findings) - 5} more findings_\n"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{score_emoji} Vanguard CSPM Alert — {account_name}",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Account:*\n{account_name} ({cloud_label})"},
                {"type": "mrkdwn", "text": f"*Risk Score:*\n{score_emoji} {score}/100"},
                {"type": "mrkdwn", "text": f"*Threshold:*\n{threshold}"},
                {"type": "mrkdwn", "text": f"*Trigger:*\n{trigger_reason or 'Threshold breached'}"},
            ],
        },
    ]

    if sev_line:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Finding counts:*\n{sev_line}"},
        })

    if top_findings_text:
        blocks.append({"type": "divider"})
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Top findings:*\n{top_findings_text}"},
        })

    blocks.append({
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": f"Vanguard CSPM • {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            }
        ],
    })

    payload = json.dumps({"blocks": blocks}).encode("utf-8")

    try:
        req = urllib.request.Request(
            webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            if resp.status == 200 and body == "ok":
                logger.info(f"Slack alert sent → {account_name} ({trigger_reason})")
                return True
            logger.warning(f"Slack returned unexpected response {resp.status}: {body}")
            return False
    except urllib.error.HTTPError as e:
        logger.error(f"Slack HTTP error {e.code}: {e.read().decode('utf-8', errors='replace')}")
        return False
    except urllib.error.URLError as e:
        logger.error(f"Slack network error: {e.reason}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending Slack notification: {e}")
        return False


def test_slack_webhook(webhook_url: str) -> dict:
    """
    Send a test message to verify the webhook URL. Returns status dict.
    """
    if not is_slack_webhook_valid(webhook_url):
        return {"ok": False, "error": "Invalid webhook URL. Must start with https://hooks.slack.com/"}

    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": ":white_check_mark: *Vanguard CSPM* — Slack integration test successful!\nYou'll receive alerts here when conditions are triggered.",
            },
        }
    ]
    payload = json.dumps({"blocks": blocks}).encode("utf-8")

    try:
        req = urllib.request.Request(
            webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            if resp.status == 200 and body == "ok":
                return {"ok": True}
            return {"ok": False, "error": f"Slack returned {resp.status}: {body}"}
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        return {"ok": False, "error": f"HTTP {e.code}: {err}"}
    except urllib.error.URLError as e:
        return {"ok": False, "error": f"Network error: {e.reason}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
