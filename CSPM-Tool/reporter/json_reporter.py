"""JSON Reporter — saves scan results to output/"""
import json
import os
from datetime import datetime
from scoring.risk_scorer import score_cloud

_HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(_HERE, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def save_json_report(resources: list, findings: list, cloud: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = os.path.join(OUTPUT_DIR, f"report_{cloud}_{timestamp}.json")

    report = {
        "timestamp":        datetime.now().isoformat(),
        "cloud":            cloud,
        "resources_scanned": len(resources),
        "findings_total":   len(findings),
        "scores": {
            c: score_cloud([r for r in resources if r.cloud == c])
            for c in {r.cloud for r in resources}
        },
        "findings": [
            {
                "rule_id":       f.rule_id,
                "resource_id":   f.resource_id,
                "resource_name": f.resource_name,
                "severity":      f.severity,
                "service":       f.service,
                "message":       f.message,
                "remediation":   f.remediation,
                "frameworks":    f.frameworks,
                "cloud":         f.cloud,
                "is_custom":     f.is_custom,
            }
            for f in findings
        ],
    }

    with open(filename, "w") as f:
        json.dump(report, f, indent=2)

    return filename
