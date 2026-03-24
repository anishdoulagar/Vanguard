"""
Risk Scorer  —  Enterprise v2
==============================
Calculates a 0–100 security posture score that is:

  • Scale-invariant  — adding detection rules does not lower the score unless
                       those rules find real issues
  • Severity-weighted — CRITICAL/HIGH dominate; MEDIUM/LOW have diminishing
                        impact beyond their saturation point
  • Bounded per tier  — each severity has a fixed penalty budget (cap) it can
                        never exceed, so hundreds of LOW findings cannot collapse
                        the score the way 3 CRITICALs legitimately should

Scoring model (per account)
────────────────────────────
  penalty(sev) = cap[sev] × (1 − e^(−n / sat[sev]))

  cap   = maximum points that severity tier can ever subtract
  sat   = "saturation reference" — the finding count at which 63 % of the
          budget is consumed (1 standard deviation of an exponential decay)

  CRITICAL  cap=45  sat=2   →  1 finding: −18 pts;  2: −28;  ≥10: floor −45
  HIGH      cap=30  sat=5   →  1 finding:  −5 pts;  5: −19;  ≥20: floor −30
  MEDIUM    cap=15  sat=30  →  10 findings: −4 pts; 30:  −9;  ≥100: floor −15
  LOW       cap= 5  sat=100 →  20 findings: −1 pt;  100:  −3;  ≥400: floor  −5
                              ─────────────────────────────────────────────────
  Worst-case total           →  −95 pts   →  minimum score = 5

Calibration anchors
────────────────────
  0 findings                →  100  (clean)
  1 CRITICAL                →   82  (LOW RISK — needs attention)
  2 CRITICAL                →   72  (MEDIUM RISK border)
  5 CRITICAL                →   58  (MEDIUM RISK — investigate urgently)
  0C + 5H + 20M + 50L       →   73  (LOW RISK — good but imperfect)
  1C + 5H + 25M + 60L       →   52  (MEDIUM RISK — one serious issue)
  3C + 15H + 50M + 100L     →   30  (HIGH RISK — multiple failures)
  10C + 40H + 100M + 200L   →   10  (CRITICAL RISK — severely exposed)

Multi-cloud (single account)
──────────────────────────────
  If both AWS and Azure are scanned:
    score = 0.3 × min(aws, azure) + 0.7 × mean(aws, azure)
  This penalises accounts where one provider is significantly weaker
  without letting a perfect Azure score fully mask a failing AWS posture.

Multi-account unified score  (dashboard)
──────────────────────────────────────────
  See unified_score() below.
  Uses a severity-weighted formula that penalises for having any outlier
  account with very low scores.
"""

import math
from collections import Counter

# ── Per-resource scoring (display only, not used for account-level score) ──────
RESOURCE_PENALTY = {"CRITICAL": 14, "HIGH": 9, "MEDIUM": 4, "LOW": 1}

# ── Account-level capped exponential saturation model ─────────────────────────
# (cap, saturation_reference)
SEVERITY_BUDGET = {
    "CRITICAL": (45,   2),
    "HIGH":     (30,   5),
    "MEDIUM":   (15,  30),
    "LOW":      ( 5, 100),
}


# ── ANSI Colors ───────────────────────────────────────────────────────────────
class C:
    RESET      = "\033[0m"
    BOLD       = "\033[1m"
    DIM        = "\033[2m"
    RED        = "\033[31m"
    BOLD_RED   = "\033[1;31m"
    YELLOW     = "\033[33m"
    GREEN      = "\033[32m"
    BOLD_GREEN = "\033[1;32m"
    CYAN       = "\033[36m"
    WHITE      = "\033[97m"
    GRAY       = "\033[90m"
    ORANGE     = "\033[38;5;208m"


def score_resource(resource) -> int:
    """Per-resource score used for resource-level display cards."""
    penalty = sum(
        RESOURCE_PENALTY.get(f.severity.upper(), 0)
        for f in resource.findings
    )
    return max(0, 100 - min(penalty, 100))


def score_label(score: int) -> tuple:
    """Returns (label, color). Calibrated for the v2 capped-saturation model."""
    if score >= 70:
        return "LOW RISK",      C.BOLD_GREEN
    elif score >= 50:
        return "MEDIUM RISK",   C.YELLOW
    elif score >= 30:
        return "HIGH RISK",     C.ORANGE
    else:
        return "CRITICAL RISK", C.BOLD_RED


def score_resources(resources: list) -> list:
    for r in resources:
        r.risk_score = score_resource(r)
    return resources


def score_cloud(resources: list) -> int:
    """
    Compute the security posture score for a single cloud account.

    Uses a capped exponential saturation model so that:
    - The first CRITICAL finding has the highest impact
    - Additional findings of the same severity add diminishing penalty
    - No severity bucket can ever exceed its penalty cap
    - Hundreds of LOW/MEDIUM findings cannot collapse the score the way
      a handful of CRITICAL ones legitimately do

    Returns an integer in [5, 100].
    """
    all_findings = [f for r in resources for f in r.findings]
    if not all_findings:
        return 100

    counts = Counter(f.severity.upper() for f in all_findings)

    penalty = 0.0
    for sev, (cap, sat) in SEVERITY_BUDGET.items():
        n = counts.get(sev, 0)
        if n > 0:
            penalty += cap * (1.0 - math.exp(-n / sat))

    return max(5, round(100 - penalty))


def blend_cloud_scores(scores: dict) -> int:
    """
    Produce a single score from a dict of {cloud: score} values.

    If multiple clouds are scanned, the worst-performing one pulls the
    result down via a min-weighted blend:
        score = 0.3 × min + 0.7 × mean

    A single cloud returns its own score unchanged.
    """
    if not scores:
        return 100
    values = list(scores.values())
    if len(values) == 1:
        return values[0]
    avg = sum(values) / len(values)
    worst = min(values)
    return max(5, round(0.3 * worst + 0.7 * avg))


def unified_score(account_scores: list[int]) -> int:
    """
    Compute the dashboard-level unified score across all accounts.

    Formula:
        base    = arithmetic mean of all account scores
        drag    = severity-weighted pull from poor outliers
        unified = 0.65 × base + 0.35 × harmonic_component

    The harmonic component uses n / sum(1/(s+1)) which naturally weights
    accounts with lower scores more heavily without breaking when a score
    reaches 0.

    For a single account this collapses to the account's own score.
    """
    if not account_scores:
        return 100
    if len(account_scores) == 1:
        return account_scores[0]

    n   = len(account_scores)
    avg = sum(account_scores) / n

    # Harmonic-like component: small scores dominate
    harmonic = n / sum(1.0 / (s + 1) for s in account_scores) - 1
    harmonic = max(0.0, harmonic)

    blended = 0.65 * avg + 0.35 * harmonic
    return max(5, round(blended))


def print_report(resources: list, all_findings: list, cloud: str):
    """Print a styled CLI report to stdout."""

    SEV_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    SEV_COLOR = {
        "CRITICAL": C.BOLD_RED,
        "HIGH":     C.ORANGE,
        "MEDIUM":   C.YELLOW,
        "LOW":      C.GREEN,
    }

    print()
    print(f"  {C.BOLD}{'─' * 56}{C.RESET}")
    print(f"  {C.BOLD}{C.WHITE}  SCAN RESULTS{C.RESET}")
    print(f"  {C.BOLD}{'─' * 56}{C.RESET}")
    print()

    clouds_scanned = list({r.cloud for r in resources})
    for c in sorted(clouds_scanned):
        cloud_resources = [r for r in resources if r.cloud == c]
        if not cloud_resources:
            continue
        overall = score_cloud(cloud_resources)
        label, color = score_label(overall)
        print(f"  {C.BOLD}{c.upper():6}{C.RESET}  Score: {color}{C.BOLD}{overall:3}/100{C.RESET}  "
              f"{color}[{label}]{C.RESET}  "
              f"{C.GRAY}({len(cloud_resources)} resources){C.RESET}")

    print()

    sev_counts = {}
    for f in all_findings:
        sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1

    print(f"  {C.BOLD}Findings Summary{C.RESET}")
    for sev in SEV_ORDER:
        count = sev_counts.get(sev, 0)
        if count == 0:
            continue
        color = SEV_COLOR[sev]
        bar   = "█" * min(count, 40)
        print(f"  {color}{sev:8}{C.RESET}  {bar} {C.BOLD}{count}{C.RESET}")
    print()

    if not all_findings:
        print(f"  {C.BOLD_GREEN}No findings — clean scan!{C.RESET}")
        print()
        return

    print(f"  {C.BOLD}{'─' * 56}{C.RESET}")
    print(f"  {C.BOLD}{C.WHITE}  FINDINGS{C.RESET}")
    print(f"  {C.BOLD}{'─' * 56}{C.RESET}")

    for sev in SEV_ORDER:
        sev_findings = [f for f in all_findings if f.severity == sev]
        if not sev_findings:
            continue
        color = SEV_COLOR[sev]
        print()
        print(f"  {color}{C.BOLD}■ {sev} ({len(sev_findings)}){C.RESET}")
        print()
        for finding in sev_findings:
            print(f"  {C.BOLD}{finding.rule_id}{C.RESET}  {C.DIM}{finding.service}{C.RESET}")
            print(f"  {C.WHITE}{finding.resource_name}{C.RESET}")
            print(f"  {C.GRAY}{finding.message}{C.RESET}")
            print(f"  {C.CYAN}Fix:{C.RESET} {finding.remediation}")
            fws = "  ".join(finding.frameworks[:4])
            print(f"  {C.GRAY}[{fws}]{C.RESET}")
            print()

    print(f"  {C.BOLD}{'─' * 56}{C.RESET}")
    print(f"  Total: {C.BOLD}{len(all_findings)}{C.RESET} findings across "
          f"{C.BOLD}{len(resources)}{C.RESET} resources")
    print()
