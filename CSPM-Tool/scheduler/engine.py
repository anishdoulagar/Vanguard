"""
Scheduler Engine
Runs background scans automatically based on each account's scan_interval_hours.

How it works:
  1. On startup, all accounts with scan_interval_hours > 0 get a row in
     scheduled_jobs with their next_run_at time.
  2. Every 60 seconds the _tick() function fires.
  3. It queries scheduled_jobs for any rows where next_run_at <= now()
     and is_running = false.
  4. For each due job it:
       a. Sets is_running = true (prevents duplicate runs)
       b. Decrypts the stored credentials
       c. Runs the full scan engine
       d. Saves results to scan_results table
       e. Sets next_run_at = now() + interval
       f. Sets is_running = false
  5. Errors are caught, logged, and stored in last_error column
     so users can see if their scheduled scan is failing.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval  import IntervalTrigger

logger = logging.getLogger(__name__)

# Single scheduler instance — created once, shared across the app
_scheduler: AsyncIOScheduler | None = None

# Limit concurrent scheduled scans to avoid cloud rate limits and memory spikes
_scan_semaphore = asyncio.Semaphore(5)

# Per-account scan lock: prevents a second tick from double-scanning the same account
# if is_running DB update races with a new tick
_running_accounts: set = set()


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="UTC")
    return _scheduler


async def start_scheduler(pool) -> None:
    """
    Called once on app startup.
    Initialises scheduled_jobs for all existing accounts,
    then starts the APScheduler tick.
    """
    scheduler = get_scheduler()

    # Register the tick job — fires every 60 seconds
    scheduler.add_job(
        _tick,
        trigger=IntervalTrigger(seconds=60),
        args=[pool],
        id="cspm_tick",
        replace_existing=True,
        max_instances=1,       # never run two ticks simultaneously
    )

    scheduler.start()
    logger.info("✓ Scheduler started — checking for due scans every 60s")

    # Seed scheduled_jobs for any accounts that don't have a row yet
    await _seed_jobs(pool)


async def stop_scheduler() -> None:
    """Called on app shutdown."""
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")


async def register_account(pool, account_id: str,
                            interval_hours: float) -> None:
    """
    Call this whenever a new account is created or its interval updated.
    Creates/updates the scheduled_jobs row for that account.
    interval_hours = 0 means manual only — no job registered.
    """
    if interval_hours <= 0:
        # Remove existing job if interval set to manual
        async with pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM scheduled_jobs WHERE account_id = $1",
                account_id
            )
        return

    next_run = datetime.now(timezone.utc) + timedelta(hours=interval_hours)
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO scheduled_jobs (account_id, next_run_at)
            VALUES ($1, $2)
            ON CONFLICT (account_id)
            DO UPDATE SET next_run_at = $2, is_running = false
            """,
            account_id, next_run
        )
    logger.info(f"Scheduled account {account_id} — next run at {next_run.isoformat()}")


# ── Internal ──────────────────────────────────────────────────────────────────

async def _seed_jobs(pool) -> None:
    """
    On startup, make sure every account with interval_hours > 0
    has a row in scheduled_jobs. Accounts that already have a row
    are left untouched (preserving their next_run_at).
    """
    async with pool.acquire() as conn:
        accounts = await conn.fetch(
            """
            SELECT id, scan_interval_hours
            FROM cloud_accounts
            WHERE scan_interval_hours > 0
              AND id NOT IN (SELECT account_id FROM scheduled_jobs)
            """
        )
        for acc in accounts:
            next_run = datetime.now(timezone.utc) + timedelta(
                hours=float(acc["scan_interval_hours"])
            )
            await conn.execute(
                """
                INSERT INTO scheduled_jobs (account_id, next_run_at)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                """,
                acc["id"], next_run
            )
    if accounts:
        logger.info(f"Seeded {len(accounts)} scheduled jobs from existing accounts.")


async def _tick(pool) -> None:
    """
    Runs every 60 seconds.
    Finds all accounts whose next_run_at has passed and scans them.
    Each scan runs in its own asyncio task so they don't block each other.
    """
    async with pool.acquire() as conn:
        due_jobs = await conn.fetch(
            """
            SELECT sj.account_id, sj.next_run_at,
                   ca.user_id, ca.cloud, ca.encrypted_creds,
                   ca.region, ca.scan_interval_hours, ca.name
            FROM scheduled_jobs sj
            JOIN cloud_accounts ca ON ca.id = sj.account_id
            WHERE sj.next_run_at <= now()
              AND sj.is_running = false
              AND ca.scan_interval_hours > 0
            """
        )

    if not due_jobs:
        return

    logger.info(f"Scheduler tick: {len(due_jobs)} account(s) due for scan")

    for job in due_jobs:
        account_id = str(job["account_id"])
        if account_id in _running_accounts:
            logger.debug(f"Skipping {account_id} — already running in this process")
            continue
        _running_accounts.add(account_id)
        asyncio.create_task(_run_scheduled_scan(pool, dict(job)))


async def _run_scheduled_scan(pool, job: dict) -> None:
    """
    Runs a single scheduled scan for one account.
    Fully isolated — errors here never affect other scans.
    Bounded by semaphore (max 5 concurrent) and 10 min hard timeout.
    """
    account_id = str(job["account_id"])
    user_id    = str(job["user_id"])
    cloud      = job["cloud"]
    name       = job["name"]

    logger.info(f"[Scheduler] Starting scan: {name} ({cloud})")

    # Mark as running
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE scheduled_jobs SET is_running = true WHERE account_id = $1",
            account_id
        )

    async with _scan_semaphore:
        error_msg = None
        try:
            # Import here to avoid circular imports at module level
            from auth.encryption import decrypt_credentials
            from connectors.aws_connector   import AWSConnector
            from connectors.azure_connector import AzureConnector
            from translator.normalizer      import normalize_all
            from policies.aws_rules         import check_aws_resources
            from policies.azure_rules       import check_azure_resources
            from scoring.risk_scorer        import score_resources, score_cloud, blend_cloud_scores
            from database.models            import (
                save_scan_result, update_account_last_scanned,
                get_all_alert_settings_for_account, save_alert_history,
            )
            from notifications.email_engine import (
                build_alert_email, send_alert_email, is_email_configured,
            )
            from notifications.slack_engine import send_slack_notification

            loop      = asyncio.get_event_loop()
            creds     = decrypt_credentials(job["encrypted_creds"])
            aws_raw   = None
            azure_raw = None

            try:
                if cloud == "aws":
                    connector = AWSConnector(
                        aws_access_key_id=creds["access_key_id"],
                        aws_secret_access_key=creds["secret_access_key"],
                        region_name=creds.get("region", "us-east-1"),
                    )
                    aws_raw = await asyncio.wait_for(
                        loop.run_in_executor(None, connector.collect_all),
                        timeout=600,
                    )
                elif cloud == "azure":
                    connector = AzureConnector(
                        subscription_id=creds["subscription_id"],
                        tenant_id=creds["tenant_id"],
                        client_id=creds["client_id"],
                        client_secret=creds["client_secret"],
                    )
                    azure_raw = await asyncio.wait_for(
                        loop.run_in_executor(None, connector.collect_all),
                        timeout=600,
                    )
            except asyncio.TimeoutError:
                raise TimeoutError(f"Connector timed out after 600s for account {name}")

            resources    = normalize_all(aws_raw or {}, azure_raw or {})
            all_findings = []

            if aws_raw:
                all_findings.extend(check_aws_resources(resources))
            if azure_raw:
                all_findings.extend(check_azure_resources(resources))

            finding_map = {}
            for f in all_findings:
                finding_map.setdefault(f.resource_id, []).append(f)
            for resource in resources:
                resource.findings = finding_map.get(resource.resource_id, [])

            scored = score_resources(resources)

            scores = {}
            if aws_raw:
                aws_res = [r for r in scored if r.cloud == "aws"]
                if aws_res:
                    scores["aws"] = score_cloud(aws_res)
            if azure_raw:
                az_res = [r for r in scored if r.cloud == "azure"]
                if az_res:
                    scores["azure"] = score_cloud(az_res)
            scores["overall"] = blend_cloud_scores(
                {k: v for k, v in scores.items() if k in ("aws", "azure")}
            )

            findings_out = [
                {
                    "rule_id":       f.rule_id,
                    "resource_id":   f.resource_id,
                    "resource_name": f.resource_name,
                    "severity":      f.severity,
                    "message":       f.message,
                    "remediation":   f.remediation,
                    "cloud":         f.cloud,
                    "service":       f.service,
                    "frameworks":    f.frameworks,
                    "is_custom":     f.is_custom,
                    "status":        f.status,
                }
                for f in all_findings
            ]

            finding_counts = {
                "critical": sum(1 for f in all_findings if f.severity == "CRITICAL"),
                "high":     sum(1 for f in all_findings if f.severity == "HIGH"),
                "medium":   sum(1 for f in all_findings if f.severity == "MEDIUM"),
                "low":      sum(1 for f in all_findings if f.severity == "LOW"),
            }

            async with pool.acquire() as conn:
                await save_scan_result(
                    conn,
                    user_id=user_id,
                    account_id=account_id,
                    cloud=cloud,
                    scores=scores,
                    resources_scanned=len(resources),
                    finding_counts=finding_counts,
                    findings=findings_out,
                    triggered_by="schedule",
                )
                await update_account_last_scanned(conn, account_id)

            overall = scores.get("overall") or scores.get("aws") or scores.get("azure")
            logger.info(
                f"[Scheduler] ✓ {name} scan complete — "
                f"score: {overall}, findings: {len(all_findings)}"
            )

            if overall is not None and is_email_configured():
                async with pool.acquire() as conn:
                    all_cfgs = await get_all_alert_settings_for_account(conn, account_id)

                for alert_cfg in all_cfgs:
                    should_alert   = False
                    trigger_reason = ""
                    fc = finding_counts

                    if overall <= alert_cfg["score_threshold"]:
                        should_alert   = True
                        trigger_reason = f"Score {overall} ≤ threshold {alert_cfg['score_threshold']}"
                    if alert_cfg.get("alert_on_critical") and fc.get("critical", 0) > 0:
                        should_alert   = True
                        trigger_reason = f"{fc['critical']} CRITICAL finding(s) detected"
                    if alert_cfg.get("alert_on_high") and fc.get("high", 0) > 0:
                        should_alert   = True
                        trigger_reason = f"{fc['high']} HIGH finding(s) detected"
                    if alert_cfg.get("alert_on_medium") and fc.get("medium", 0) > 0:
                        should_alert   = True
                        trigger_reason = f"{fc['medium']} MEDIUM finding(s) detected"

                    if should_alert:
                        subject, html = build_alert_email(
                            account_name=name, cloud=cloud,
                            score=overall, threshold=alert_cfg["score_threshold"],
                            findings=findings_out,
                        )
                        sent = send_alert_email(alert_cfg["email"], subject, html)

                        if alert_cfg.get("slack_enabled") and alert_cfg.get("slack_webhook_url"):
                            send_slack_notification(
                                webhook_url=alert_cfg["slack_webhook_url"],
                                account_name=name, cloud=cloud,
                                score=overall, threshold=alert_cfg["score_threshold"],
                                findings=findings_out, trigger_reason=trigger_reason,
                            )

                        async with pool.acquire() as conn:
                            await save_alert_history(
                                conn, user_id=str(alert_cfg["user_id"]),
                                account_id=account_id, account_name=name,
                                score=overall, trigger=trigger_reason, email_sent=sent,
                            )
                        logger.info(
                            f"[Scheduler] Alert {'sent' if sent else 'failed'} "
                            f"→ {alert_cfg['email']}: {trigger_reason}"
                        )

        except Exception as e:
            logger.error(f"[Scheduler] ✗ {name} scan failed: {e}")
            error_msg = str(e)

        finally:
            interval_hours = float(job["scan_interval_hours"])
            next_run = datetime.now(timezone.utc) + timedelta(hours=interval_hours)
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE scheduled_jobs
                    SET is_running = false,
                        next_run_at = $1,
                        last_error = $2
                    WHERE account_id = $3
                    """,
                    next_run, error_msg, account_id
                )
            _running_accounts.discard(account_id)
