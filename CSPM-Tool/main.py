#!/usr/bin/env python3
"""
Multi-Cloud CSPM Tool v2.0 — CLI Entry Point
Usage:
  python3 main.py --cloud aws
  python3 main.py --cloud azure
  python3 main.py --cloud all
  python3 main.py --cloud aws --fail-on critical
"""

import argparse
import getpass
import sys
import os
import json
from datetime import datetime

# Make sure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from connectors.aws_connector   import AWSConnector
from connectors.azure_connector import AzureConnector
from translator.normalizer      import normalize_all
from policies.aws_rules         import check_aws_resources
from policies.azure_rules       import check_azure_resources
from scoring.risk_scorer        import score_resources, score_cloud, print_report
from reporter.json_reporter     import save_json_report
from reporter.html_reporter     import save_html_report
from storage.scan_history       import save_scan


def parse_args():
    parser = argparse.ArgumentParser(
        description="Multi-Cloud CSPM Tool — Security Posture Scanner",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--cloud",
        choices=["aws", "azure", "all"],
        required=True,
        help="Cloud provider to scan: aws | azure | all",
    )
    parser.add_argument(
        "--fail-on",
        choices=["critical", "high", "medium", "low"],
        default=None,
        dest="fail_on",
        help="Exit with code 1 if findings at this severity or above exist.\nUseful for CI/CD pipeline integration.",
    )
    parser.add_argument(
        "--output",
        choices=["json", "html", "both", "none"],
        default="both",
        help="Report output format (default: both)",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Do not save scan to history",
    )
    return parser.parse_args()


def prompt_aws_credentials():
    print("\n  AWS Credentials")
    print("  " + "─" * 40)
    access_key = input("  Access Key ID:     ").strip()
    secret_key = getpass.getpass("  Secret Access Key: ")
    region     = input("  Region [us-east-1]: ").strip() or "us-east-1"
    return {
        "aws_access_key_id":     access_key,
        "aws_secret_access_key": secret_key,
        "region_name":           region,
    }


def prompt_azure_credentials():
    print("\n  Azure Credentials (Service Principal)")
    print("  " + "─" * 40)
    subscription_id = input("  Subscription ID: ").strip()
    tenant_id       = input("  Tenant ID:       ").strip()
    client_id       = input("  Client ID:       ").strip()
    client_secret   = getpass.getpass("  Client Secret:   ")
    return {
        "subscription_id": subscription_id,
        "tenant_id":       tenant_id,
        "client_id":       client_id,
        "client_secret":   client_secret,
    }


def banner():
    print()
    print("  ╔══════════════════════════════════════════════════╗")
    print("  ║      Multi-Cloud CSPM Tool v2.0                  ║")
    print("  ║      Security Posture Management Platform         ║")
    print("  ╚══════════════════════════════════════════════════╝")
    print(f"  Scan started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()


def main():
    args   = parse_args()
    banner()

    aws_raw   = None
    azure_raw = None

    # ── Collect credentials and run connectors ───────────────────────────────

    if args.cloud in ("aws", "all"):
        creds = prompt_aws_credentials()
        print("\n  Connecting to AWS...")
        try:
            connector = AWSConnector(**creds)
            connector.test_connection()
            print("  ✓ AWS connection verified")
            print("  Collecting AWS resources...")
            aws_raw = connector.collect_all()
            count = sum(len(v) if isinstance(v, list) else 1
                        for v in aws_raw.values() if v)
            print(f"  ✓ Collected {count} raw AWS resources")
        except Exception as e:
            print(f"  ✗ AWS connection failed: {e}")
            if args.cloud == "aws":
                sys.exit(1)

    if args.cloud in ("azure", "all"):
        creds = prompt_azure_credentials()
        print("\n  Connecting to Azure...")
        try:
            connector = AzureConnector(**creds)
            connector.test_connection()
            print("  ✓ Azure connection verified")
            print("  Collecting Azure resources...")
            azure_raw = connector.collect_all()
            count = sum(len(v) if isinstance(v, list) else 1
                        for v in azure_raw.values() if v)
            print(f"  ✓ Collected {count} raw Azure resources")
        except Exception as e:
            print(f"  ✗ Azure connection failed: {e}")
            if args.cloud == "azure":
                sys.exit(1)

    # ── Normalize ────────────────────────────────────────────────────────────

    print("\n  Normalizing resources...")
    resources = normalize_all(aws_raw or {}, azure_raw or {})
    print(f"  ✓ {len(resources)} resources normalized")

    # ── Policy checks ─────────────────────────────────────────────────────────

    print("  Running policy checks...")
    all_findings = []
    if aws_raw:
        aws_findings = check_aws_resources(resources)
        all_findings.extend(aws_findings)
        print(f"  ✓ AWS: {len(aws_findings)} findings")
    if azure_raw:
        az_findings = check_azure_resources(resources)
        all_findings.extend(az_findings)
        print(f"  ✓ Azure: {len(az_findings)} findings")

    # Attach findings to resources
    finding_map = {}
    for f in all_findings:
        finding_map.setdefault(f.resource_id, []).append(f)
    for r in resources:
        r.findings = finding_map.get(r.resource_id, [])

    # ── Score ─────────────────────────────────────────────────────────────────

    scored = score_resources(resources)

    # ── Print Report ──────────────────────────────────────────────────────────

    print_report(scored, all_findings, args.cloud)

    # ── Save Reports ──────────────────────────────────────────────────────────

    if args.output in ("json", "both"):
        path = save_json_report(scored, all_findings, args.cloud)
        print(f"\n  JSON report: {path}")

    if args.output in ("html", "both"):
        path = save_html_report(scored, all_findings, args.cloud)
        print(f"  HTML report: {path}")

    # ── Save to History ───────────────────────────────────────────────────────

    if not args.no_save:
        scores = {}
        if aws_raw:
            aws_res = [r for r in scored if r.cloud == "aws"]
            if aws_res:
                scores["aws"] = score_cloud(aws_res)
        if azure_raw:
            az_res = [r for r in scored if r.cloud == "azure"]
            if az_res:
                scores["azure"] = score_cloud(az_res)
        if "aws" in scores and "azure" in scores:
            scores["overall"] = round((scores["aws"] + scores["azure"]) / 2)
        elif "aws" in scores:
            scores["overall"] = scores["aws"]
        elif "azure" in scores:
            scores["overall"] = scores["azure"]

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

        save_scan({
            "scores":            scores,
            "findings":          findings_out,
            "resources_scanned": len(resources),
            "cloud":             args.cloud,
        })

    # ── CI/CD Exit Code ───────────────────────────────────────────────────────

    if args.fail_on:
        severity_order = ["low", "medium", "high", "critical"]
        threshold = severity_order.index(args.fail_on)
        for finding in all_findings:
            if severity_order.index(finding.severity.lower()) >= threshold:
                print(f"\n  PIPELINE FAILED — findings at or above {args.fail_on.upper()} threshold detected.")
                sys.exit(1)

    print()
    sys.exit(0)


if __name__ == "__main__":
    main()
