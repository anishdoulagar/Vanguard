"""
Email Engine
Sends alert emails via SMTP.
Supports Gmail, SendGrid, any standard SMTP provider.

Configure in .env:
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=you@gmail.com
  SMTP_PASSWORD=your_app_password
  SMTP_FROM=you@gmail.com

For Gmail: use an App Password (not your account password).
Go to: myaccount.google.com -> Security -> 2FA -> App Passwords
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger(__name__)


def _smtp_config() -> dict:
    return {
        "host":     os.environ.get("SMTP_HOST", ""),
        "port":     int(os.environ.get("SMTP_PORT", "587")),
        "user":     os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASSWORD", ""),
        "from":     os.environ.get("SMTP_FROM", os.environ.get("SMTP_USER", "")),
    }


def is_email_configured() -> bool:
    cfg = _smtp_config()
    placeholders = {"", "YOUR_GMAIL@gmail.com", "YOUR_16_CHAR_APP_PASSWORD"}
    return (
        bool(cfg["host"]) and
        cfg["user"]     not in placeholders and
        cfg["password"] not in placeholders
    )



def send_alert_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send an HTML email. Returns True on success, False on failure.
    """
    cfg = _smtp_config()
    if not is_email_configured():
        logger.warning("Email not configured — skipping alert email.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = cfg["from"]
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))

        # Port 465 = implicit SSL (SMTP_SSL), Port 587 = STARTTLS (SMTP + starttls)
        if cfg["port"] == 465:
            with smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15) as server:
                server.login(cfg["user"], cfg["password"])
                refused = server.sendmail(cfg["from"], to_email, msg.as_string())
                if refused:
                    logger.warning(f"Brevo refused delivery for {refused}")
        else:
            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(cfg["user"], cfg["password"])
                refused = server.sendmail(cfg["from"], to_email, msg.as_string())
                if refused:
                    logger.warning(f"SMTP refused delivery for {refused}")

        logger.info(f"Email sent → {to_email} | {subject}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {e.smtp_code} {e.smtp_error}")
        return False
    except smtplib.SMTPRecipientsRefused as e:
        logger.error(f"SMTP recipient refused for {to_email}: {e}")
        return False
    except smtplib.SMTPSenderRefused as e:
        logger.error(f"SMTP sender refused ({cfg['from']}): {e.smtp_code} {e.smtp_error} — "
                     "Verify the SMTP_FROM address is a verified sender in your email provider dashboard.")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending to {to_email}: {e}")
        return False
    except OSError as e:
        logger.error(f"Network error connecting to SMTP ({cfg['host']}:{cfg['port']}): {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email to {to_email}: {e}")
        return False


def test_smtp_connection() -> dict:
    """
    Test SMTP connectivity and authentication.
    Returns a dict with status details for the admin diagnostic endpoint.
    """
    cfg = _smtp_config()
    result = {
        "configured": is_email_configured(),
        "host":       cfg["host"] or "(not set)",
        "port":       cfg["port"],
        "user":       cfg["user"] or "(not set)",
        "from":       cfg["from"] or "(not set)",
        "connected":  False,
        "auth_ok":    False,
        "error":      None,
    }

    if not result["configured"]:
        result["error"] = "SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env"
        return result

    try:
        if cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=10)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()
        result["connected"] = True

        server.login(cfg["user"], cfg["password"])
        result["auth_ok"] = True
        server.quit()

    except smtplib.SMTPAuthenticationError as e:
        result["error"] = f"Authentication failed ({e.smtp_code}): wrong username or password."
    except smtplib.SMTPConnectError as e:
        result["error"] = f"Cannot connect to {cfg['host']}:{cfg['port']} — {e}"
    except OSError as e:
        result["error"] = f"Network error: {e}"
    except Exception as e:
        result["error"] = str(e)

    return result


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """
    Send a password reset email with a secure link.
    Returns True on success, False on failure.
    """
    subject = "[CSPM] Reset your password"
    html = f"""
<!DOCTYPE html><html><body style="background:#111214;color:#e8e8e8;
  font-family:'Segoe UI',sans-serif;margin:0;padding:40px">
  <div style="max-width:520px;margin:0 auto">
    <h1 style="font-size:20px;letter-spacing:0.05em;margin-bottom:4px">
      MULTI-CLOUD CSPM
    </h1>
    <p style="color:#606068;font-size:13px;margin-top:0">Password Reset Request</p>

    <div style="background:#1e2026;border-radius:10px;padding:28px;
                margin:24px 0;border-left:4px solid #7b8cde">
      <p style="margin:0 0 16px;font-size:14px;color:#e8e8e8">
        A password reset was requested for your account (<strong>{to_email}</strong>).
      </p>
      <p style="margin:0 0 20px;font-size:13px;color:#a0a0a8">
        Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <a href="{reset_url}" style="display:inline-block;padding:12px 28px;
         background:#7b8cde;color:#111214;text-decoration:none;border-radius:6px;
         font-weight:700;font-size:13px;letter-spacing:0.06em">
        RESET PASSWORD
      </a>
    </div>

    <p style="color:#606068;font-size:11px;margin-top:24px">
      If you didn't request this, you can safely ignore this email.
      The link will expire automatically after 1 hour.
    </p>
  </div>
</body></html>"""
    return send_alert_email(to_email, subject, html)


def send_invite_email(to_email: str, role: str, invite_url: str) -> bool:
    subject = "[Vanguard] You've been invited"
    html = f"""
<!DOCTYPE html><html><body style="background:#111214;color:#e8e8e8;
  font-family:'Segoe UI',sans-serif;margin:0;padding:40px">
  <div style="max-width:520px;margin:0 auto">
    <h1 style="font-size:20px;letter-spacing:0.05em;margin-bottom:4px">VANGUARD</h1>
    <p style="color:#606068;font-size:13px;margin-top:0">// MULTI-CLOUD SECURITY POSTURE MANAGEMENT</p>

    <div style="background:#1e2026;border-radius:10px;padding:28px;
                margin:24px 0;border-left:4px solid #ffe600">
      <p style="margin:0 0 12px;font-size:14px;color:#e8e8e8">
        You've been invited to join <strong>Vanguard</strong> as a
        <strong style="color:#ffe600">{role.upper()}</strong>.
      </p>
      <p style="margin:0 0 20px;font-size:13px;color:#a0a0a8">
        Click the button below to set up your account. This invitation expires in <strong>72 hours</strong>.
      </p>
      <a href="{invite_url}" style="display:inline-block;padding:12px 28px;
         background:#ffe600;color:#111214;text-decoration:none;border-radius:6px;
         font-weight:700;font-size:13px;letter-spacing:0.06em">
        ACCEPT INVITATION
      </a>
    </div>

    <p style="color:#606068;font-size:11px;margin-top:24px">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  </div>
</body></html>"""
    return send_alert_email(to_email, subject, html)


def build_alert_email(account_name: str, cloud: str, score: int,
                       threshold: int, findings: list) -> tuple[str, str]:
    """
    Build the subject and HTML body for a score-drop alert.
    Returns (subject, html_body).
    """
    subject = f"[CSPM Alert] {account_name} — Score dropped to {score}/100"

    sev_color = {"CRITICAL": "#e05555", "HIGH": "#d97b3a",
                 "MEDIUM":   "#c9a84c", "LOW":  "#4caf7d"}

    score_color = ("#4caf7d" if score >= 80 else "#c9a84c"
                   if score >= 60 else "#d97b3a" if score >= 40 else "#e05555")

    finding_rows = ""
    for f in findings[:10]:
        color = sev_color.get(f.get("severity", "LOW"), "#888")
        finding_rows += f"""
        <tr>
          <td style="padding:8px 12px;color:{color};font-weight:700;
                     font-family:monospace">{f.get('severity','')}</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:12px">
              {f.get('rule_id','')}</td>
          <td style="padding:8px 12px">{f.get('resource_name','')}</td>
          <td style="padding:8px 12px;font-size:12px;color:#888">
              {f.get('message','')[:80]}...</td>
        </tr>"""

    more = ""
    if len(findings) > 10:
        more = f"<p style='color:#888;font-size:12px'>...and {len(findings)-10} more findings</p>"

    html = f"""
<!DOCTYPE html><html><body style="background:#111214;color:#e8e8e8;
  font-family:'Segoe UI',sans-serif;margin:0;padding:40px">

  <div style="max-width:680px;margin:0 auto">
    <h1 style="font-size:20px;letter-spacing:0.05em;margin-bottom:4px">
      MULTI-CLOUD CSPM — ALERT
    </h1>
    <p style="color:#606068;font-size:13px;margin-top:0">
      {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}
    </p>

    <div style="background:#1e2026;border-radius:10px;padding:24px;
                margin:24px 0;border-left:4px solid {score_color}">
      <div style="font-size:48px;font-weight:800;color:{score_color};
                  line-height:1">{score}</div>
      <div style="color:{score_color};font-size:13px;margin-top:4px">
          RISK SCORE — {account_name} ({cloud.upper()})</div>
      <div style="color:#606068;font-size:12px;margin-top:8px">
          Alert triggered: score dropped below threshold of {threshold}</div>
    </div>

    <h2 style="font-size:14px;letter-spacing:0.08em;color:#a0a0a8">
        TOP FINDINGS</h2>
    <table style="width:100%;border-collapse:collapse;background:#18191d;
                  border-radius:8px;overflow:hidden">
      <thead>
        <tr style="background:#111214">
          <th style="padding:10px 12px;text-align:left;font-size:10px;
                     letter-spacing:0.1em;color:#606068">SEVERITY</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;
                     letter-spacing:0.1em;color:#606068">RULE</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;
                     letter-spacing:0.1em;color:#606068">RESOURCE</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;
                     letter-spacing:0.1em;color:#606068">DETAIL</th>
        </tr>
      </thead>
      <tbody>{finding_rows}</tbody>
    </table>
    {more}

    <p style="color:#606068;font-size:11px;margin-top:32px">
      This alert was sent by Multi-Cloud CSPM. Log in at
      <a href="{os.environ.get("FRONTEND_URL", "http://localhost:5173")}" style="color:#e8e8e8">{os.environ.get("FRONTEND_URL", "http://localhost:5173")}</a>
      to view the full report.
    </p>
  </div>
</body></html>"""

    return subject, html
