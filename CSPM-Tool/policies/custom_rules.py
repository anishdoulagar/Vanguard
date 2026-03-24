"""
Custom Rules Engine
Handles CRUD operations for user-defined security rules stored in custom_rules.json.
Custom rules are evaluated using a simple field/operator/value matching system
against the unified CloudResource schema.
"""

import json
import os

CUSTOM_RULES_FILE = os.path.join(os.path.dirname(__file__), "custom_rules.json")

# Supported operators for custom rule evaluation
OPERATORS = {
    "is_true":      lambda a, b: a is True,
    "is_false":     lambda a, b: a is False or a is None,
    "equals":       lambda a, b: str(a).lower() == str(b).lower(),
    "not_equals":   lambda a, b: str(a).lower() != str(b).lower(),
    "contains":     lambda a, b: b.lower() in str(a).lower(),
    "not_contains": lambda a, b: b.lower() not in str(a).lower(),
    "greater_than": lambda a, b: float(a or 0) > float(b),
    "less_than":    lambda a, b: float(a or 0) < float(b),
    "starts_with":  lambda a, b: str(a).lower().startswith(b.lower()),
}

# Supported CloudResource fields for custom rule evaluation
ALLOWED_FIELDS = [
    "name", "resource_type", "region", "cloud",
    "is_public", "is_encrypted", "https_only", "ssh_open", "rdp_open",
    "all_traffic_open", "mfa_enabled", "versioning", "imdsv2",
    "logging_enabled", "flow_logs", "soft_delete", "purge_protection",
    "tde_enabled", "auditing_enabled", "tls_12_enforced", "multi_region",
]


def load_custom_rules() -> list:
    """Load all custom rules from disk. Returns empty list if file doesn't exist."""
    if not os.path.exists(CUSTOM_RULES_FILE):
        return []
    try:
        with open(CUSTOM_RULES_FILE, "r") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError):
        return []


def save_custom_rule(rule: dict) -> None:
    """
    Persist a new custom rule to disk.
    Raises ValueError if rule_id already exists.
    """
    rules = load_custom_rules()

    # Validate required fields
    required = ["rule_id", "cloud", "service", "severity", "title",
                "field", "operator", "message", "remediation"]
    for field in required:
        if not rule.get(field):
            raise ValueError(f"Missing required field: {field}")

    # Validate rule_id uniqueness
    if any(r["rule_id"] == rule["rule_id"] for r in rules):
        raise ValueError(f"Rule ID '{rule['rule_id']}' already exists.")

    # Validate field is allowed
    if rule["field"] not in ALLOWED_FIELDS:
        raise ValueError(
            f"Field '{rule['field']}' is not supported. "
            f"Allowed fields: {', '.join(ALLOWED_FIELDS)}"
        )

    # Validate operator
    if rule["operator"] not in OPERATORS:
        raise ValueError(
            f"Operator '{rule['operator']}' is not supported. "
            f"Allowed operators: {', '.join(OPERATORS.keys())}"
        )

    # Validate severity
    if rule["severity"] not in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        raise ValueError("Severity must be one of: CRITICAL, HIGH, MEDIUM, LOW")

    # Validate cloud
    if rule["cloud"] not in ("aws", "azure", "all"):
        raise ValueError("Cloud must be one of: aws, azure, all")

    rule["is_custom"] = True
    if "frameworks" not in rule or not rule["frameworks"]:
        rule["frameworks"] = ["CUSTOM"]

    rules.append(rule)
    _write_rules(rules)


def delete_custom_rule(rule_id: str) -> bool:
    """
    Delete a custom rule by ID.
    Returns True if deleted, False if not found.
    """
    rules = load_custom_rules()
    original_len = len(rules)
    rules = [r for r in rules if r["rule_id"] != rule_id]
    if len(rules) == original_len:
        return False
    _write_rules(rules)
    return True


def update_custom_rule(rule_id: str, updates: dict) -> None:
    """Update an existing custom rule by ID."""
    rules = load_custom_rules()
    for i, rule in enumerate(rules):
        if rule["rule_id"] == rule_id:
            rules[i] = {**rule, **updates}
            _write_rules(rules)
            return
    raise ValueError(f"Rule ID '{rule_id}' not found.")


def _write_rules(rules: list) -> None:
    """Write rule list to disk as formatted JSON."""
    os.makedirs(os.path.dirname(CUSTOM_RULES_FILE), exist_ok=True)
    with open(CUSTOM_RULES_FILE, "w") as f:
        json.dump(rules, f, indent=2)


def evaluate_custom_rules(resource, cloud: str) -> list:
    """
    Evaluate all custom rules against a CloudResource object.
    Returns a list of Finding objects for triggered rules.

    Import is done lazily inside to avoid circular imports.
    """
    from translator.normalizer import Finding

    findings = []
    for rule in load_custom_rules():
        # Check cloud scope
        rule_cloud = rule.get("cloud", "all")
        if rule_cloud not in (cloud, "all"):
            continue

        field    = rule.get("field")
        operator = rule.get("operator")
        value    = rule.get("value", "")

        # Safety: only allow declared fields
        if field not in ALLOWED_FIELDS:
            continue

        field_val = getattr(resource, field, None)
        if field_val is None:
            continue

        op_fn = OPERATORS.get(operator)
        if op_fn is None:
            continue

        try:
            triggered = op_fn(field_val, value)
        except (TypeError, ValueError):
            continue

        if triggered:
            findings.append(Finding(
                rule_id=rule["rule_id"],
                resource_id=resource.resource_id,
                resource_name=resource.name,
                severity=rule["severity"],
                message=rule["message"],
                remediation=rule.get("remediation", "Review and remediate manually."),
                cloud=cloud,
                service=rule.get("service", "Custom"),
                frameworks=rule.get("frameworks", ["CUSTOM"]),
                is_custom=True,
            ))

    return findings
