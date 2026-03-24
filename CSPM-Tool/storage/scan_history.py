"""
Scan History Storage
Saves and loads the last N scans to/from a JSON file.
Also tracks per-finding acknowledgement status.
"""

import json
import os
from datetime import datetime

_HERE              = os.path.dirname(os.path.abspath(__file__))
HISTORY_FILE       = os.path.join(_HERE, "scan_history.json")
FINDING_STATUS_FILE = os.path.join(_HERE, "finding_status.json")
MAX_HISTORY        = 10


def load_history() -> list:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_scan(result: dict):
    history = load_history()

    # Build the entry
    entry = {
        "timestamp":        datetime.now().isoformat(),
        "date_label":       datetime.now().strftime("%b %d, %H:%M"),
        "cloud":            result.get("cloud", "unknown"),
        "scores":           result.get("scores", {}),
        "resources_scanned": result.get("resources_scanned", 0),
        "findings":         result.get("findings", []),
        "finding_counts": {
            "critical": sum(1 for f in result.get("findings", []) if f.get("severity") == "CRITICAL"),
            "high":     sum(1 for f in result.get("findings", []) if f.get("severity") == "HIGH"),
            "medium":   sum(1 for f in result.get("findings", []) if f.get("severity") == "MEDIUM"),
            "low":      sum(1 for f in result.get("findings", []) if f.get("severity") == "LOW"),
        },
    }

    # Duplicate guard — skip if same date + cloud + score as the last entry
    if history:
        last = history[-1]
        if (
            last.get("date_label") == entry["date_label"] and
            last.get("cloud")      == entry["cloud"]      and
            last.get("scores")     == entry["scores"]
        ):
            return

    history.append(entry)
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]

    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


def load_finding_statuses() -> dict:
    if not os.path.exists(FINDING_STATUS_FILE):
        return {}
    try:
        with open(FINDING_STATUS_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def update_finding_status(finding_key: str, status: str):
    statuses = load_finding_statuses()
    statuses[finding_key] = status
    with open(FINDING_STATUS_FILE, "w") as f:
        json.dump(statuses, f, indent=2)
