"""
CSPM Configuration
Loads settings from settings.yaml and exposes them as module-level constants.
"""

import os
import yaml

_CONFIG_DIR  = os.path.dirname(os.path.abspath(__file__))
_SETTINGS    = os.path.join(_CONFIG_DIR, "settings.yaml")

with open(_SETTINGS, "r") as f:
    _cfg = yaml.safe_load(f)

# Output directory for reports
OUTPUT_DIR   = os.path.join(
    os.path.dirname(_CONFIG_DIR),
    _cfg.get("output_dir", "output")
)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Storage directory for scan history
STORAGE_DIR  = os.path.join(
    os.path.dirname(_CONFIG_DIR),
    _cfg.get("storage_dir", "storage")
)
os.makedirs(STORAGE_DIR, exist_ok=True)

# History settings
MAX_HISTORY  = _cfg.get("max_history", 10)

# API settings
API_HOST     = _cfg.get("api_host", "0.0.0.0")
API_PORT     = _cfg.get("api_port", 8000)

# Risk scoring thresholds
SCORE_THRESHOLDS = _cfg.get("score_thresholds", {
    "low":      80,
    "medium":   60,
    "high":     40,
    "critical":  0,
})
