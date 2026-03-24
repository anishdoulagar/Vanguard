"""
AWS Security Policy Rules — 90 checks
Mapped to: CIS, NIST 800-53, PCI DSS, HIPAA, SOC2, ISO 27001, GDPR
"""

from translator.normalizer import Finding
from policies.custom_rules import evaluate_custom_rules

AWS_RULES = [

    # ━━━ IDENTITY & ACCESS MANAGEMENT ━━━
    {
        "rule_id":     "AWS-IAM-001",
        "severity":    "CRITICAL",
        "service":     "IAM",
        "title":       "Root account MFA not enabled",
        "message":     "The AWS root account has no MFA device configured, leaving it vulnerable to credential theft.",
        "remediation": "Enable MFA on root account: AWS Console → IAM → Security credentials → Assign MFA device.",
        "frameworks":  ["CIS-1.5", "NIST-AC-2", "SOC2-CC6.1", "PCI-8.4", "ISO27001-A.9.4"],
    },
    {
        "rule_id":     "AWS-IAM-002",
        "severity":    "CRITICAL",
        "service":     "IAM",
        "title":       "Root account access keys exist",
        "message":     "Active access keys exist for the root account. Root access keys should never exist.",
        "remediation": "Delete root access keys immediately: IAM → Security credentials → Access keys → Delete.",
        "frameworks":  ["CIS-1.4", "NIST-AC-6", "PCI-8.2", "ISO27001-A.9.2"],
    },
    {
        "rule_id":     "AWS-IAM-003",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "No IAM account password policy configured",
        "message":     "No account-level password policy is set. Default settings allow weak passwords.",
        "remediation": "Configure password policy: IAM → Account settings → Change password policy.",
        "frameworks":  ["CIS-1.8", "NIST-IA-5", "PCI-8.3.6"],
    },
    {
        "rule_id":     "AWS-IAM-004",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Password minimum length less than 14 characters",
        "message":     "Password policy minimum length is below 14 characters.",
        "remediation": "Set minimum password length to 14 or more in IAM password policy.",
        "frameworks":  ["CIS-1.9", "NIST-IA-5", "PCI-8.3.6"],
    },
    {
        "rule_id":     "AWS-IAM-005",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Password policy does not require uppercase",
        "message":     "IAM password policy does not require at least one uppercase letter.",
        "remediation": "Enable 'Require at least one uppercase letter' in IAM password policy.",
        "frameworks":  ["CIS-1.10", "NIST-IA-5"],
    },
    {
        "rule_id":     "AWS-IAM-006",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Password policy does not require lowercase",
        "message":     "IAM password policy does not require at least one lowercase letter.",
        "remediation": "Enable 'Require at least one lowercase letter' in IAM password policy.",
        "frameworks":  ["CIS-1.11", "NIST-IA-5"],
    },
    {
        "rule_id":     "AWS-IAM-007",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Password policy does not require numbers",
        "message":     "IAM password policy does not require at least one numeric character.",
        "remediation": "Enable 'Require at least one number' in IAM password policy.",
        "frameworks":  ["CIS-1.12", "NIST-IA-5"],
    },
    {
        "rule_id":     "AWS-IAM-008",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Password policy does not require symbols",
        "message":     "IAM password policy does not require at least one non-alphanumeric character.",
        "remediation": "Enable 'Require at least one non-alphanumeric character' in IAM password policy.",
        "frameworks":  ["CIS-1.13", "NIST-IA-5"],
    },
    {
        "rule_id":     "AWS-IAM-009",
        "severity":    "MEDIUM",
        "service":     "IAM",
        "title":       "Password expiry not configured (>90 days)",
        "message":     "IAM password policy does not enforce expiry or expiry exceeds 90 days.",
        "remediation": "Set password expiry to 90 days or fewer in IAM password policy.",
        "frameworks":  ["CIS-1.14", "PCI-8.3.9"],
    },
    {
        "rule_id":     "AWS-IAM-010",
        "severity":    "MEDIUM",
        "service":     "IAM",
        "title":       "Password reuse prevention less than 24",
        "message":     "IAM password policy remembers fewer than 24 previous passwords.",
        "remediation": "Set password reuse prevention to 24 in IAM password policy.",
        "frameworks":  ["CIS-1.15", "NIST-IA-5"],
    },
    {
        "rule_id":     "AWS-IAM-011",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Console user with no MFA enabled",
        "message":     "One or more IAM users with console access have no MFA device configured.",
        "remediation": "Enable MFA for all IAM users with console access: IAM → Users → Security credentials.",
        "frameworks":  ["CIS-1.22", "NIST-IA-3", "PCI-8.4"],
    },
    {
        "rule_id":     "AWS-IAM-012",
        "severity":    "MEDIUM",
        "service":     "IAM",
        "title":       "Access key not rotated in over 90 days",
        "message":     "One or more IAM user access keys have not been rotated in more than 90 days.",
        "remediation": "Rotate access keys: IAM → Users → Security credentials → Create new access key → Delete old key.",
        "frameworks":  ["CIS-1.20", "NIST-IA-5", "PCI-8.3.9"],
    },
    {
        "rule_id":     "AWS-IAM-013",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Inline policy attached directly to user",
        "message":     "IAM users have inline policies attached. Policies should be attached via groups/roles.",
        "remediation": "Move inline policies to managed policies and attach via IAM groups or roles.",
        "frameworks":  ["CIS-1.16", "NIST-AC-6", "ISO27001-A.9.2"],
    },
    {
        "rule_id":     "AWS-IAM-014",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Full admin policy attached directly to user",
        "message":     "AdministratorAccess or equivalent is attached directly to an IAM user.",
        "remediation": "Remove admin policies from users. Use roles with admin access for specific tasks.",
        "frameworks":  ["CIS-1.17", "NIST-AC-6", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-IAM-015",
        "severity":    "MEDIUM",
        "service":     "IAM",
        "title":       "No AWS support role defined",
        "message":     "No IAM role with AWSSupportAccess policy exists for handling support cases.",
        "remediation": "Create an IAM role with the AWSSupportAccess managed policy.",
        "frameworks":  ["CIS-1.20", "NIST-AC-2"],
    },

    # ━━━ S3 ━━━
    {
        "rule_id":     "AWS-S3-001",
        "severity":    "CRITICAL",
        "service":     "S3",
        "title":       "S3 bucket public access block not enabled",
        "message":     "S3 bucket does not have public access block settings enabled, potentially exposing data.",
        "remediation": "Enable all four public access block settings: S3 → Bucket → Permissions → Block public access.",
        "frameworks":  ["CIS-2.1.5", "NIST-SC-7", "PCI-1.3", "GDPR-Art32"],
    },
    {
        "rule_id":     "AWS-S3-002",
        "severity":    "HIGH",
        "service":     "S3",
        "title":       "S3 bucket server-side encryption disabled",
        "message":     "S3 bucket does not have default server-side encryption (SSE) configured.",
        "remediation": "Enable SSE: S3 → Bucket → Properties → Default encryption → Enable (AES-256 or KMS).",
        "frameworks":  ["CIS-2.1.1", "NIST-SC-28", "HIPAA-164.312", "PCI-3.4"],
    },
    {
        "rule_id":     "AWS-S3-003",
        "severity":    "MEDIUM",
        "service":     "S3",
        "title":       "S3 bucket versioning disabled",
        "message":     "S3 bucket versioning is not enabled, risking unrecoverable data loss.",
        "remediation": "Enable versioning: S3 → Bucket → Properties → Bucket Versioning → Enable.",
        "frameworks":  ["CIS-2.1.3", "NIST-CP-9", "ISO27001-A.12.3"],
    },
    {
        "rule_id":     "AWS-S3-004",
        "severity":    "LOW",
        "service":     "S3",
        "title":       "S3 bucket access logging disabled",
        "message":     "S3 bucket server access logging is not enabled.",
        "remediation": "Enable logging: S3 → Bucket → Properties → Server access logging → Enable.",
        "frameworks":  ["CIS-2.1.2", "NIST-AU-2", "PCI-10.1"],
    },
    {
        "rule_id":     "AWS-S3-005",
        "severity":    "HIGH",
        "service":     "S3",
        "title":       "S3 bucket MFA delete not enabled",
        "message":     "MFA delete is not enabled on this S3 bucket, allowing deletion without MFA.",
        "remediation": "Enable MFA delete using AWS CLI: aws s3api put-bucket-versioning with MfaDelete=Enabled.",
        "frameworks":  ["CIS-2.1.3", "NIST-CM-3", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AWS-S3-006",
        "severity":    "MEDIUM",
        "service":     "S3",
        "title":       "S3 bucket allows HTTP (no HTTPS-only policy)",
        "message":     "S3 bucket policy does not enforce HTTPS-only access, allowing unencrypted transfers.",
        "remediation": "Add bucket policy denying requests where aws:SecureTransport is false.",
        "frameworks":  ["NIST-SC-8", "GDPR-Art32", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-S3-007",
        "severity":    "MEDIUM",
        "service":     "S3",
        "title":       "S3 bucket has no lifecycle policy",
        "message":     "No lifecycle policy is configured on this S3 bucket.",
        "remediation": "Configure lifecycle rules: S3 → Bucket → Management → Lifecycle rules → Create rule.",
        "frameworks":  ["ISO27001-A.8.3", "GDPR-Art5", "NIST-SI-12"],
    },

    # ━━━ EC2 ━━━
    {
        "rule_id":     "AWS-EC2-001",
        "severity":    "HIGH",
        "service":     "EC2",
        "title":       "EC2 IMDSv2 not enforced",
        "message":     "Instance does not require IMDSv2, leaving it vulnerable to SSRF-based metadata attacks.",
        "remediation": "Enforce IMDSv2: EC2 → Instance → Actions → Modify instance metadata options → Required.",
        "frameworks":  ["CIS-5.6", "NIST-SC-8", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AWS-EC2-002",
        "severity":    "MEDIUM",
        "service":     "EC2",
        "title":       "EC2 instance has a public IP address",
        "message":     "EC2 instance has a public IP address, increasing its attack surface.",
        "remediation": "Place instances in private subnets and use a load balancer or NAT gateway for access.",
        "frameworks":  ["CIS-5.4", "NIST-SC-7", "ISO27001-A.13.1"],
    },
    {
        "rule_id":     "AWS-EC2-003",
        "severity":    "HIGH",
        "service":     "EC2",
        "title":       "EC2 detailed monitoring disabled",
        "message":     "Detailed monitoring is disabled, reducing visibility into instance performance and security events.",
        "remediation": "Enable detailed monitoring: EC2 → Instance → Actions → Monitor and troubleshoot → Enable detailed monitoring.",
        "frameworks":  ["NIST-AU-12", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-EC2-004",
        "severity":    "MEDIUM",
        "service":     "EC2",
        "title":       "EC2 instance has no IAM instance profile",
        "message":     "No IAM instance profile attached. Application credentials may be hardcoded.",
        "remediation": "Attach an IAM role with least-privilege permissions as an instance profile.",
        "frameworks":  ["NIST-AC-3", "ISO27001-A.9.4", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-EC2-005",
        "severity":    "MEDIUM",
        "service":     "EC2",
        "title":       "EC2 instance running in default VPC",
        "message":     "Instance is running in the default VPC which has permissive default settings.",
        "remediation": "Migrate to a custom VPC with properly configured subnets, routing, and security groups.",
        "frameworks":  ["CIS-5.4", "NIST-SC-7"],
    },
    {
        "rule_id":     "AWS-EC2-006",
        "severity":    "HIGH",
        "service":     "EC2",
        "title":       "EC2 instance using deprecated AMI",
        "message":     "Instance is running an AMI that is no longer receiving security patches.",
        "remediation": "Migrate to a current, supported AMI with active security patching.",
        "frameworks":  ["NIST-SI-2", "CIS-7.1"],
    },
    {
        "rule_id":     "AWS-EC2-007",
        "severity":    "MEDIUM",
        "service":     "EC2",
        "title":       "EC2 termination protection disabled",
        "message":     "Termination protection is not enabled on this instance.",
        "remediation": "Enable termination protection: EC2 → Instance → Actions → Instance settings → Change termination protection.",
        "frameworks":  ["ISO27001-A.11.2", "NIST-CP-9"],
    },

    # ━━━ SECURITY GROUPS ━━━
    {
        "rule_id":     "AWS-SG-001",
        "severity":    "CRITICAL",
        "service":     "Security Groups",
        "title":       "SSH port 22 open to 0.0.0.0/0",
        "message":     "Security group allows inbound SSH (port 22) from any IP address.",
        "remediation": "Restrict SSH access to specific IP ranges or use AWS Systems Manager Session Manager.",
        "frameworks":  ["CIS-5.2", "PCI-1.2.1", "NIST-SC-7", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AWS-SG-002",
        "severity":    "CRITICAL",
        "service":     "Security Groups",
        "title":       "RDP port 3389 open to 0.0.0.0/0",
        "message":     "Security group allows inbound RDP (port 3389) from any IP address.",
        "remediation": "Restrict RDP to specific IPs or use a bastion host / VPN. Consider AWS Systems Manager.",
        "frameworks":  ["CIS-5.3", "PCI-1.2.1", "NIST-SC-7", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AWS-SG-003",
        "severity":    "CRITICAL",
        "service":     "Security Groups",
        "title":       "Security group allows all inbound traffic",
        "message":     "Security group has a rule allowing all inbound traffic (0.0.0.0/0 on all ports).",
        "remediation": "Remove the all-traffic inbound rule and replace with specific port/IP rules.",
        "frameworks":  ["CIS-5.1", "NIST-SC-7", "PCI-1.2"],
    },
    {
        "rule_id":     "AWS-SG-004",
        "severity":    "HIGH",
        "service":     "Security Groups",
        "title":       "Unrestricted inbound access on any port",
        "message":     "Security group allows unrestricted inbound access (0.0.0.0/0) on a non-standard port.",
        "remediation": "Restrict inbound rules to specific IP ranges and only required ports.",
        "frameworks":  ["NIST-SC-7", "SOC2-CC6.6", "ISO27001-A.13.1"],
    },
    {
        "rule_id":     "AWS-SG-005",
        "severity":    "MEDIUM",
        "service":     "Security Groups",
        "title":       "Default security group allows inbound/outbound traffic",
        "message":     "The default security group is not configured to deny all traffic.",
        "remediation": "Remove all inbound/outbound rules from the default security group.",
        "frameworks":  ["CIS-5.4", "NIST-SC-7"],
    },

    # ━━━ EBS ━━━
    {
        "rule_id":     "AWS-EBS-001",
        "severity":    "HIGH",
        "service":     "EBS",
        "title":       "EBS volume not encrypted",
        "message":     "EBS volume is not encrypted at rest.",
        "remediation": "Create an encrypted snapshot and restore to a new encrypted volume. Or enable account-level EBS encryption by default.",
        "frameworks":  ["CIS-2.2.1", "HIPAA-164.312", "NIST-SC-28", "PCI-3.4"],
    },
    {
        "rule_id":     "AWS-EBS-002",
        "severity":    "HIGH",
        "service":     "EBS",
        "title":       "EBS snapshot is publicly accessible",
        "message":     "An EBS snapshot has been made public, exposing potentially sensitive data.",
        "remediation": "Remove public permission: EC2 → Snapshots → Modify permissions → Private.",
        "frameworks":  ["CIS-2.2.2", "NIST-SC-28", "GDPR-Art32"],
    },
    {
        "rule_id":     "AWS-EBS-003",
        "severity":    "MEDIUM",
        "service":     "EBS",
        "title":       "EBS snapshot not encrypted",
        "message":     "EBS snapshot is not encrypted, exposing data if the snapshot is accessed.",
        "remediation": "Copy snapshot with encryption enabled: EC2 → Snapshots → Copy → Enable encryption.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-EBS-004",
        "severity":    "MEDIUM",
        "service":     "EBS",
        "title":       "EBS volume delete-on-termination disabled",
        "message":     "EBS volume persists after instance termination, risking orphaned sensitive data.",
        "remediation": "Set DeleteOnTermination to true for root volumes unless persistent storage is required.",
        "frameworks":  ["NIST-CP-9", "ISO27001-A.8.3"],
    },

    # ━━━ VPC ━━━
    {
        "rule_id":     "AWS-VPC-001",
        "severity":    "MEDIUM",
        "service":     "VPC",
        "title":       "VPC flow logs not enabled",
        "message":     "VPC flow logs are disabled. Network traffic metadata is not being captured.",
        "remediation": "Enable flow logs: VPC → Your VPCs → Flow logs → Create flow log.",
        "frameworks":  ["CIS-3.9", "NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-VPC-002",
        "severity":    "MEDIUM",
        "service":     "VPC",
        "title":       "Default VPC exists and is in use",
        "message":     "The default VPC has permissive settings and should not be used for production.",
        "remediation": "Create a custom VPC with appropriate settings and migrate resources out of the default VPC.",
        "frameworks":  ["CIS-5.4", "NIST-SC-7"],
    },
    {
        "rule_id":     "AWS-VPC-003",
        "severity":    "LOW",
        "service":     "VPC",
        "title":       "VPC peering connection with unrestricted routes",
        "message":     "VPC peering route allows broad access beyond intended scope.",
        "remediation": "Restrict route table entries for VPC peering connections to only required CIDR blocks.",
        "frameworks":  ["NIST-SC-7", "ISO27001-A.13.1"],
    },
    {
        "rule_id":     "AWS-VPC-004",
        "severity":    "MEDIUM",
        "service":     "VPC",
        "title":       "Network ACL does not restrict sensitive ports",
        "message":     "Network ACL allows unrestricted access to sensitive ports.",
        "remediation": "Add deny rules in Network ACLs for sensitive ports not required by your application.",
        "frameworks":  ["NIST-SC-7", "PCI-1.2"],
    },
    {
        "rule_id":     "AWS-VPC-005",
        "severity":    "LOW",
        "service":     "VPC",
        "title":       "Subnet auto-assigns public IP on launch",
        "message":     "Subnet is configured to automatically assign public IPs to new instances.",
        "remediation": "Disable auto-assign public IP: VPC → Subnets → Modify auto-assign IP settings.",
        "frameworks":  ["NIST-SC-7", "CIS-5.4"],
    },

    # ━━━ CLOUDTRAIL ━━━
    {
        "rule_id":     "AWS-CT-001",
        "severity":    "CRITICAL",
        "service":     "CloudTrail",
        "title":       "CloudTrail not enabled",
        "message":     "AWS CloudTrail is not logging in this region. API activity is not being recorded.",
        "remediation": "Enable CloudTrail: CloudTrail → Create trail → Apply to all regions.",
        "frameworks":  ["CIS-3.1", "NIST-AU-2", "SOC2-CC7.2", "PCI-10.1"],
    },
    {
        "rule_id":     "AWS-CT-002",
        "severity":    "MEDIUM",
        "service":     "CloudTrail",
        "title":       "CloudTrail not configured for all regions",
        "message":     "CloudTrail trail is not set to multi-region, leaving activity in other regions unlogged.",
        "remediation": "Edit trail: CloudTrail → Trails → Edit → Apply trail to all regions → Save.",
        "frameworks":  ["CIS-3.1", "NIST-AU-9"],
    },
    {
        "rule_id":     "AWS-CT-003",
        "severity":    "HIGH",
        "service":     "CloudTrail",
        "title":       "CloudTrail log file validation disabled",
        "message":     "Log file validation is disabled. Tampered logs cannot be detected.",
        "remediation": "Enable log validation: CloudTrail → Edit trail → Enable log file validation.",
        "frameworks":  ["CIS-3.2", "NIST-AU-9", "SOC2-CC7.3"],
    },
    {
        "rule_id":     "AWS-CT-004",
        "severity":    "HIGH",
        "service":     "CloudTrail",
        "title":       "CloudTrail S3 bucket is publicly accessible",
        "message":     "The S3 bucket storing CloudTrail logs is publicly accessible.",
        "remediation": "Enable block public access on the CloudTrail S3 bucket immediately.",
        "frameworks":  ["CIS-3.3", "NIST-AU-9"],
    },
    {
        "rule_id":     "AWS-CT-005",
        "severity":    "MEDIUM",
        "service":     "CloudTrail",
        "title":       "CloudTrail not integrated with CloudWatch Logs",
        "message":     "CloudTrail is not sending logs to CloudWatch. Real-time alerting is not possible.",
        "remediation": "Enable CloudWatch Logs integration: CloudTrail → Edit trail → CloudWatch Logs → Configure.",
        "frameworks":  ["CIS-3.4", "NIST-AU-6"],
    },
    {
        "rule_id":     "AWS-CT-006",
        "severity":    "MEDIUM",
        "service":     "CloudTrail",
        "title":       "CloudTrail logs not encrypted with KMS",
        "message":     "CloudTrail log files are not encrypted with a KMS Customer Managed Key.",
        "remediation": "Enable KMS encryption on CloudTrail trail and specify a CMK.",
        "frameworks":  ["CIS-3.7", "NIST-SC-28"],
    },

    # ━━━ CLOUDWATCH ALARMS ━━━
    {
        "rule_id":     "AWS-CW-001",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for root account usage",
        "message":     "No alarm is configured to alert on root account API/console usage.",
        "remediation": "Create metric filter and alarm for root account usage in CloudWatch.",
        "frameworks":  ["CIS-3.3", "NIST-AU-6"],
    },
    {
        "rule_id":     "AWS-CW-002",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for IAM policy changes",
        "message":     "No alarm detects changes to IAM policies.",
        "remediation": "Create metric filter for IAM policy changes and attach a CloudWatch alarm.",
        "frameworks":  ["CIS-3.4", "NIST-AU-6"],
    },
    {
        "rule_id":     "AWS-CW-003",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for CloudTrail config changes",
        "message":     "No alarm detects changes to CloudTrail configuration.",
        "remediation": "Create metric filter for CloudTrail config changes and attach a CloudWatch alarm.",
        "frameworks":  ["CIS-3.5", "NIST-AU-6"],
    },
    {
        "rule_id":     "AWS-CW-004",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for console authentication failures",
        "message":     "No alarm monitors for repeated console login failures.",
        "remediation": "Create metric filter for ConsoleLogin failures and attach a CloudWatch alarm.",
        "frameworks":  ["CIS-3.6", "NIST-AU-6"],
    },
    {
        "rule_id":     "AWS-CW-005",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for security group changes",
        "message":     "No alarm monitors changes to security groups.",
        "remediation": "Create metric filter for security group events and attach a CloudWatch alarm.",
        "frameworks":  ["CIS-3.10", "NIST-AU-6"],
    },
    {
        "rule_id":     "AWS-CW-006",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for VPC changes",
        "message":     "No alarm monitors changes to VPC configuration.",
        "remediation": "Create metric filter for VPC changes and attach a CloudWatch alarm.",
        "frameworks":  ["CIS-3.14", "NIST-AU-6"],
    },

    # ━━━ RDS ━━━
    {
        "rule_id":     "AWS-RDS-001",
        "severity":    "CRITICAL",
        "service":     "RDS",
        "title":       "RDS instance is publicly accessible",
        "message":     "RDS database instance is publicly accessible from the internet.",
        "remediation": "Disable public accessibility: RDS → Modify → Connectivity → Public accessibility → No.",
        "frameworks":  ["CIS-2.3.3", "HIPAA-164.312", "NIST-SC-7", "PCI-1.3"],
    },
    {
        "rule_id":     "AWS-RDS-002",
        "severity":    "HIGH",
        "service":     "RDS",
        "title":       "RDS instance not encrypted at rest",
        "message":     "RDS storage encryption is not enabled.",
        "remediation": "Encryption must be set at creation. Snapshot the instance and restore with encryption enabled.",
        "frameworks":  ["CIS-2.3.1", "HIPAA-164.312", "NIST-SC-28", "PCI-3.4"],
    },
    {
        "rule_id":     "AWS-RDS-003",
        "severity":    "MEDIUM",
        "service":     "RDS",
        "title":       "RDS auto minor version upgrade disabled",
        "message":     "Auto minor version upgrade is disabled. Security patches may be missed.",
        "remediation": "Enable auto minor version upgrade: RDS → Modify → Auto minor version upgrade → Yes.",
        "frameworks":  ["NIST-SI-2"],
    },
    {
        "rule_id":     "AWS-RDS-004",
        "severity":    "MEDIUM",
        "service":     "RDS",
        "title":       "RDS instance not configured for Multi-AZ",
        "message":     "RDS instance does not have Multi-AZ deployment enabled.",
        "remediation": "Enable Multi-AZ: RDS → Modify → Multi-AZ deployment → Yes.",
        "frameworks":  ["NIST-CP-9", "ISO27001-A.17.2"],
    },
    {
        "rule_id":     "AWS-RDS-005",
        "severity":    "MEDIUM",
        "service":     "RDS",
        "title":       "RDS backup retention period less than 7 days",
        "message":     "RDS automated backup retention is set below 7 days.",
        "remediation": "Set backup retention to at least 7 days: RDS → Modify → Backup retention period.",
        "frameworks":  ["NIST-CP-9", "SOC2-A1.2"],
    },
    {
        "rule_id":     "AWS-RDS-006",
        "severity":    "HIGH",
        "service":     "RDS",
        "title":       "RDS snapshot is publicly accessible",
        "message":     "An RDS snapshot has been shared publicly, exposing database contents.",
        "remediation": "Remove public access: RDS → Snapshots → Modify → Disable public access.",
        "frameworks":  ["CIS-2.3.2", "NIST-SC-28"],
    },
    {
        "rule_id":     "AWS-RDS-007",
        "severity":    "MEDIUM",
        "service":     "RDS",
        "title":       "RDS deletion protection disabled",
        "message":     "Deletion protection is not enabled on this RDS instance.",
        "remediation": "Enable deletion protection: RDS → Modify → Deletion protection → Enable.",
        "frameworks":  ["ISO27001-A.11.2", "NIST-CP-9"],
    },
    {
        "rule_id":     "AWS-RDS-008",
        "severity":    "HIGH",
        "service":     "RDS",
        "title":       "RDS instance does not enforce SSL connections",
        "message":     "SSL is not enforced for connections to this RDS instance.",
        "remediation": "Set rds.force_ssl parameter to 1 in the RDS parameter group.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },

    # ━━━ KMS ━━━
    {
        "rule_id":     "AWS-KMS-001",
        "severity":    "MEDIUM",
        "service":     "KMS",
        "title":       "KMS key automatic rotation disabled",
        "message":     "KMS Customer Managed Key does not have automatic annual rotation enabled.",
        "remediation": "Enable key rotation: KMS → Customer managed keys → Select key → Key rotation → Enable.",
        "frameworks":  ["CIS-3.8", "NIST-SC-12", "ISO27001-A.10.1"],
    },
    {
        "rule_id":     "AWS-KMS-002",
        "severity":    "HIGH",
        "service":     "KMS",
        "title":       "KMS key policy allows public access",
        "message":     "KMS key policy grants access to all AWS principals ('*').",
        "remediation": "Restrict KMS key policy to specific IAM principals only.",
        "frameworks":  ["NIST-SC-12", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AWS-KMS-003",
        "severity":    "MEDIUM",
        "service":     "KMS",
        "title":       "KMS key is scheduled for deletion",
        "message":     "A KMS key is pending deletion. This may break services using it.",
        "remediation": "Cancel key deletion if the key is still in use: KMS → Key → Cancel deletion.",
        "frameworks":  ["NIST-SC-12"],
    },

    # ━━━ LAMBDA ━━━
    {
        "rule_id":     "AWS-LAM-001",
        "severity":    "MEDIUM",
        "service":     "Lambda",
        "title":       "Lambda function URL is publicly accessible",
        "message":     "Lambda function URL has no authentication configured (AuthType: NONE).",
        "remediation": "Set function URL auth type to AWS_IAM or remove the function URL if not needed.",
        "frameworks":  ["NIST-AC-3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AWS-LAM-002",
        "severity":    "MEDIUM",
        "service":     "Lambda",
        "title":       "Lambda function has no dead letter queue configured",
        "message":     "No DLQ configured. Failed asynchronous invocations are silently dropped.",
        "remediation": "Configure a Dead Letter Queue (SQS or SNS) on the Lambda function.",
        "frameworks":  ["ISO27001-A.12.1"],
    },
    {
        "rule_id":     "AWS-LAM-003",
        "severity":    "LOW",
        "service":     "Lambda",
        "title":       "Lambda function using deprecated runtime",
        "message":     "Lambda function is using a runtime version that is deprecated or end-of-life.",
        "remediation": "Upgrade Lambda runtime to a currently supported version.",
        "frameworks":  ["NIST-SI-2"],
    },
    {
        "rule_id":     "AWS-LAM-004",
        "severity":    "HIGH",
        "service":     "Lambda",
        "title":       "Lambda function has administrative permissions",
        "message":     "Lambda execution role has administrator-level permissions (AdministratorAccess policy).",
        "remediation": "Apply least-privilege: create a custom role granting only the permissions the function needs.",
        "frameworks":  ["NIST-AC-6", "CIS-1.17", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-LAM-005",
        "severity":    "MEDIUM",
        "service":     "Lambda",
        "title":       "Lambda function not configured within a VPC",
        "message":     "Lambda function accesses resources over the public internet instead of a private VPC.",
        "remediation": "Configure the Lambda function to run inside a VPC with appropriate security groups.",
        "frameworks":  ["NIST-SC-7"],
    },

    # ━━━ CLOUDFRONT ━━━
    {
        "rule_id":     "AWS-CF-001",
        "severity":    "HIGH",
        "service":     "CloudFront",
        "title":       "CloudFront distribution allows HTTP viewer connections",
        "message":     "CloudFront viewer protocol policy allows unencrypted HTTP connections.",
        "remediation": "Set Viewer Protocol Policy to 'Redirect HTTP to HTTPS' or 'HTTPS Only'.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-CF-002",
        "severity":    "MEDIUM",
        "service":     "CloudFront",
        "title":       "CloudFront distribution has no WAF attached",
        "message":     "No AWS WAF web ACL is associated with this CloudFront distribution.",
        "remediation": "Create a WAF web ACL with appropriate rules and associate it with the distribution.",
        "frameworks":  ["NIST-SI-3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AWS-CF-003",
        "severity":    "MEDIUM",
        "service":     "CloudFront",
        "title":       "CloudFront distribution access logging disabled",
        "message":     "Access logging is not enabled on this CloudFront distribution.",
        "remediation": "Enable logging: CloudFront → Edit → Standard logging → On → specify S3 bucket.",
        "frameworks":  ["NIST-AU-2", "PCI-10.1"],
    },
    {
        "rule_id":     "AWS-CF-004",
        "severity":    "LOW",
        "service":     "CloudFront",
        "title":       "CloudFront distribution has no geo-restriction",
        "message":     "Distribution has no geographic restriction configured.",
        "remediation": "Enable geo-restriction if access from certain countries should be blocked.",
        "frameworks":  ["GDPR-Art44", "ISO27001-A.13.1"],
    },

    # ━━━ SNS ━━━
    {
        "rule_id":     "AWS-SNS-001",
        "severity":    "HIGH",
        "service":     "SNS",
        "title":       "SNS topic not encrypted with KMS",
        "message":     "SNS topic does not use KMS server-side encryption.",
        "remediation": "Enable SSE: SNS → Topic → Edit → Encryption → Enable → select KMS key.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-SNS-002",
        "severity":    "MEDIUM",
        "service":     "SNS",
        "title":       "SNS topic policy allows public access",
        "message":     "SNS topic access policy grants publish/subscribe access to all principals.",
        "remediation": "Restrict SNS topic policy to specific AWS accounts or IAM principals.",
        "frameworks":  ["NIST-AC-3"],
    },
    {
        "rule_id":     "AWS-SNS-003",
        "severity":    "LOW",
        "service":     "SNS",
        "title":       "SNS topic has no delivery status logging",
        "message":     "Delivery status logging is not configured for this SNS topic.",
        "remediation": "Configure delivery status logging in SNS topic settings.",
        "frameworks":  ["NIST-AU-2"],
    },

    # ━━━ SQS ━━━
    {
        "rule_id":     "AWS-SQS-001",
        "severity":    "HIGH",
        "service":     "SQS",
        "title":       "SQS queue not encrypted with KMS",
        "message":     "SQS queue does not use KMS server-side encryption.",
        "remediation": "Enable SSE: SQS → Queue → Edit → Encryption → SSE-KMS → Select key.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-SQS-002",
        "severity":    "MEDIUM",
        "service":     "SQS",
        "title":       "SQS queue allows public access",
        "message":     "SQS queue policy grants send/receive access to all principals.",
        "remediation": "Restrict SQS queue policy to specific AWS accounts or IAM roles.",
        "frameworks":  ["NIST-AC-3"],
    },
    {
        "rule_id":     "AWS-SQS-003",
        "severity":    "LOW",
        "service":     "SQS",
        "title":       "SQS queue has no dead-letter queue configured",
        "message":     "No dead-letter queue is configured. Failed messages are permanently lost.",
        "remediation": "Configure a redrive policy with a dead-letter queue on this SQS queue.",
        "frameworks":  ["ISO27001-A.12.1"],
    },

    # ━━━ EKS ━━━
    {
        "rule_id":     "AWS-EKS-001",
        "severity":    "HIGH",
        "service":     "EKS",
        "title":       "EKS cluster API server endpoint is public",
        "message":     "EKS cluster Kubernetes API server endpoint is accessible from the public internet.",
        "remediation": "Restrict endpoint access: EKS → Cluster → Networking → Private access only.",
        "frameworks":  ["NIST-SC-7", "CIS-5.4"],
    },
    {
        "rule_id":     "AWS-EKS-002",
        "severity":    "HIGH",
        "service":     "EKS",
        "title":       "EKS cluster Kubernetes secrets not encrypted with KMS",
        "message":     "EKS cluster is not configured to encrypt Kubernetes secrets using KMS.",
        "remediation": "Enable envelope encryption for secrets: EKS → Cluster → Secrets encryption → Enable.",
        "frameworks":  ["NIST-SC-28", "CIS-5.3"],
    },
    {
        "rule_id":     "AWS-EKS-003",
        "severity":    "MEDIUM",
        "service":     "EKS",
        "title":       "EKS cluster control plane logging not fully enabled",
        "message":     "EKS control plane logging is partially or fully disabled.",
        "remediation": "Enable all log types: EKS → Cluster → Logging → Enable all.",
        "frameworks":  ["NIST-AU-2"],
    },
    {
        "rule_id":     "AWS-EKS-004",
        "severity":    "MEDIUM",
        "service":     "EKS",
        "title":       "EKS cluster running outdated Kubernetes version",
        "message":     "EKS cluster is not running the latest supported Kubernetes version.",
        "remediation": "Upgrade to the latest supported Kubernetes version in EKS.",
        "frameworks":  ["NIST-SI-2"],
    },
    {
        "rule_id":     "AWS-EKS-005",
        "severity":    "MEDIUM",
        "service":     "EKS",
        "title":       "EKS node group volumes not encrypted",
        "message":     "EKS managed node group launch template does not specify encrypted volumes.",
        "remediation": "Recreate node group with encrypted volumes specified in the launch template.",
        "frameworks":  ["NIST-SC-28"],
    },

    # ━━━ ECR ━━━
    {
        "rule_id":     "AWS-ECR-001",
        "severity":    "HIGH",
        "service":     "ECR",
        "title":       "ECR repository image scanning disabled",
        "message":     "ECR image scanning on push is not enabled for this repository.",
        "remediation": "Enable scan on push: ECR → Repository → Edit → Image scan settings → Enable.",
        "frameworks":  ["NIST-RA-5", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AWS-ECR-002",
        "severity":    "HIGH",
        "service":     "ECR",
        "title":       "ECR repository is publicly accessible",
        "message":     "ECR repository is public, exposing container images to the internet.",
        "remediation": "Change to a private repository or restrict access via resource policy.",
        "frameworks":  ["NIST-AC-3", "NIST-SC-7"],
    },
    {
        "rule_id":     "AWS-ECR-003",
        "severity":    "MEDIUM",
        "service":     "ECR",
        "title":       "ECR repository image tag mutability enabled",
        "message":     "Image tags can be overwritten, breaking image immutability.",
        "remediation": "Enable tag immutability: ECR → Repository → Edit → Tag immutability → Enable.",
        "frameworks":  ["NIST-CM-3", "ISO27001-A.12.5"],
    },

    # ━━━ SECRETS MANAGER ━━━
    {
        "rule_id":     "AWS-SM-001",
        "severity":    "HIGH",
        "service":     "Secrets Manager",
        "title":       "Secret has not been rotated in over 90 days",
        "message":     "Secrets Manager secret has no rotation configured or last rotation exceeds 90 days.",
        "remediation": "Configure automatic rotation for the secret using a Lambda rotation function.",
        "frameworks":  ["CIS-1.20", "NIST-IA-5", "PCI-8.3.9"],
    },
    {
        "rule_id":     "AWS-SM-002",
        "severity":    "HIGH",
        "service":     "Secrets Manager",
        "title":       "Secret not encrypted with Customer Managed Key",
        "message":     "Secret is encrypted with the default AWS-managed key instead of a CMK.",
        "remediation": "Re-create the secret using a KMS Customer Managed Key.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-SM-003",
        "severity":    "MEDIUM",
        "service":     "Secrets Manager",
        "title":       "Secret not accessed in over 90 days",
        "message":     "Secret has not been accessed or used in over 90 days — may be orphaned.",
        "remediation": "Review and delete unused secrets to reduce attack surface.",
        "frameworks":  ["NIST-AC-6"],
    },

    # ━━━ AWS CONFIG ━━━
    {
        "rule_id":     "AWS-CFG-001",
        "severity":    "HIGH",
        "service":     "Config",
        "title":       "AWS Config not enabled in region",
        "message":     "AWS Config is not recording configuration changes in this region.",
        "remediation": "Enable AWS Config: Config → Get started → Settings → Enable recording.",
        "frameworks":  ["CIS-3.5", "NIST-CM-8", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-CFG-002",
        "severity":    "MEDIUM",
        "service":     "Config",
        "title":       "AWS Config delivery channel not configured",
        "message":     "AWS Config has no delivery channel set up for configuration snapshots.",
        "remediation": "Configure a delivery channel with an S3 bucket and optionally an SNS topic.",
        "frameworks":  ["NIST-CM-8"],
    },

    # ━━━ GUARDDUTY ━━━
    {
        "rule_id":     "AWS-GD-001",
        "severity":    "HIGH",
        "service":     "GuardDuty",
        "title":       "Amazon GuardDuty not enabled in region",
        "message":     "GuardDuty threat detection service is not enabled. Threats will not be detected.",
        "remediation": "Enable GuardDuty: GuardDuty → Get started → Enable GuardDuty.",
        "frameworks":  ["NIST-RA-5", "SOC2-CC7.1", "ISO27001-A.12.6"],
    },
    {
        "rule_id":     "AWS-GD-002",
        "severity":    "MEDIUM",
        "service":     "GuardDuty",
        "title":       "GuardDuty S3 protection not enabled",
        "message":     "GuardDuty S3 data event monitoring is not enabled.",
        "remediation": "Enable S3 protection in GuardDuty settings.",
        "frameworks":  ["NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-GD-003",
        "severity":    "MEDIUM",
        "service":     "GuardDuty",
        "title":       "GuardDuty EKS protection not enabled",
        "message":     "GuardDuty Kubernetes audit log monitoring is not enabled.",
        "remediation": "Enable EKS protection in GuardDuty settings.",
        "frameworks":  ["NIST-AU-2", "SOC2-CC7.2"],
    },

    # ━━━ ELASTICACHE ━━━
    {
        "rule_id":     "AWS-ECA-001",
        "severity":    "HIGH",
        "service":     "ElastiCache",
        "title":       "ElastiCache cluster not encrypted at rest",
        "message":     "ElastiCache cluster does not have encryption at rest enabled.",
        "remediation": "Create a new cluster with at-rest encryption enabled (cannot be enabled on existing clusters).",
        "frameworks":  ["NIST-SC-28", "PCI-3.4", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-ECA-002",
        "severity":    "HIGH",
        "service":     "ElastiCache",
        "title":       "ElastiCache cluster not encrypted in transit",
        "message":     "ElastiCache cluster does not have in-transit encryption (TLS) enabled.",
        "remediation": "Create a new cluster with in-transit encryption enabled.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-ECA-003",
        "severity":    "HIGH",
        "service":     "ElastiCache",
        "title":       "ElastiCache Redis cluster has no auth token",
        "message":     "ElastiCache Redis cluster does not require an auth token for access.",
        "remediation": "Enable AUTH token: requires in-transit encryption — create new cluster with both enabled.",
        "frameworks":  ["NIST-IA-5", "PCI-8.4", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AWS-ECA-004",
        "severity":    "MEDIUM",
        "service":     "ElastiCache",
        "title":       "ElastiCache cluster not in Multi-AZ",
        "message":     "ElastiCache cluster does not have Multi-AZ failover configured.",
        "remediation": "Enable Multi-AZ: ElastiCache → Modify → Multi-AZ → Enable.",
        "frameworks":  ["NIST-CP-9", "SOC2-A1.2", "ISO27001-A.17.2"],
    },
    {
        "rule_id":     "AWS-ECA-005",
        "severity":    "MEDIUM",
        "service":     "ElastiCache",
        "title":       "ElastiCache cluster running outdated engine version",
        "message":     "ElastiCache cluster is running an outdated Redis or Memcached version.",
        "remediation": "Upgrade to the latest supported engine version in ElastiCache.",
        "frameworks":  ["NIST-SI-2", "CIS-7.1"],
    },
    {
        "rule_id":     "AWS-ECA-006",
        "severity":    "MEDIUM",
        "service":     "ElastiCache",
        "title":       "ElastiCache cluster not in VPC",
        "message":     "ElastiCache cluster is not deployed within a VPC.",
        "remediation": "Migrate cluster to a VPC for network isolation.",
        "frameworks":  ["NIST-SC-7", "CIS-7.2"],
    },

    # ━━━ DYNAMODB ━━━
    {
        "rule_id":     "AWS-DDB-001",
        "severity":    "HIGH",
        "service":     "DynamoDB",
        "title":       "DynamoDB table not encrypted with CMK",
        "message":     "DynamoDB table is using the default AWS-managed key instead of a Customer Managed Key.",
        "remediation": "Update table encryption: DynamoDB → Table → Additional settings → Encryption → Customer managed CMK.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312", "PCI-3.4"],
    },
    {
        "rule_id":     "AWS-DDB-002",
        "severity":    "HIGH",
        "service":     "DynamoDB",
        "title":       "DynamoDB Point-in-Time Recovery (PITR) not enabled",
        "message":     "PITR is not enabled on this DynamoDB table. Continuous backups are not available.",
        "remediation": "Enable PITR: DynamoDB → Table → Backups → Enable Point-in-time recovery.",
        "frameworks":  ["NIST-CP-9", "SOC2-A1.2", "ISO27001-A.12.3"],
    },
    {
        "rule_id":     "AWS-DDB-003",
        "severity":    "MEDIUM",
        "service":     "DynamoDB",
        "title":       "DynamoDB table deletion protection disabled",
        "message":     "Deletion protection is not enabled on this DynamoDB table.",
        "remediation": "Enable deletion protection: DynamoDB → Table → Additional settings → Deletion protection → Enable.",
        "frameworks":  ["ISO27001-A.11.2", "NIST-CP-9"],
    },
    {
        "rule_id":     "AWS-DDB-004",
        "severity":    "MEDIUM",
        "service":     "DynamoDB",
        "title":       "DynamoDB table has no auto-scaling configured",
        "message":     "DynamoDB table does not have auto-scaling, risking throttling under load.",
        "remediation": "Enable auto-scaling for read/write capacity: DynamoDB → Table → Additional settings.",
        "frameworks":  ["NIST-CP-9", "SOC2-A1.1"],
    },
    {
        "rule_id":     "AWS-DDB-005",
        "severity":    "LOW",
        "service":     "DynamoDB",
        "title":       "DynamoDB table has no TTL configured",
        "message":     "No Time to Live (TTL) attribute is configured to automatically expire old items.",
        "remediation": "Configure TTL: DynamoDB → Table → Additional settings → Time to Live.",
        "frameworks":  ["GDPR-Art5", "NIST-SI-12"],
    },

    # ━━━ LOAD BALANCERS ━━━
    {
        "rule_id":     "AWS-ALB-001",
        "severity":    "MEDIUM",
        "service":     "Load Balancers",
        "title":       "Load balancer access logging not enabled",
        "message":     "Access logs are not enabled for this load balancer.",
        "remediation": "Enable access logs: Load Balancer → Attributes → Edit → Access logs → Enable.",
        "frameworks":  ["NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-ALB-002",
        "severity":    "MEDIUM",
        "service":     "Load Balancers",
        "title":       "Load balancer deletion protection disabled",
        "message":     "Deletion protection is not enabled on this load balancer.",
        "remediation": "Enable deletion protection: Load Balancer → Attributes → Edit → Deletion protection → Enable.",
        "frameworks":  ["ISO27001-A.11.2", "NIST-CP-9"],
    },
    {
        "rule_id":     "AWS-ALB-003",
        "severity":    "HIGH",
        "service":     "Load Balancers",
        "title":       "Application Load Balancer has no WAF attached",
        "message":     "No AWS WAF web ACL is associated with this ALB.",
        "remediation": "Create a WAF web ACL and associate it with the load balancer.",
        "frameworks":  ["NIST-SI-3", "SOC2-CC6.6", "PCI-6.4"],
    },
    {
        "rule_id":     "AWS-ALB-004",
        "severity":    "HIGH",
        "service":     "Load Balancers",
        "title":       "Load balancer has no HTTPS listener",
        "message":     "Internet-facing load balancer does not have an HTTPS listener configured.",
        "remediation": "Add an HTTPS listener with a valid ACM certificate.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1", "SOC2-CC6.7"],
    },
    {
        "rule_id":     "AWS-ALB-005",
        "severity":    "MEDIUM",
        "service":     "Load Balancers",
        "title":       "Application Load Balancer does not drop invalid HTTP headers",
        "message":     "ALB is not configured to drop invalid HTTP headers.",
        "remediation": "Enable drop invalid headers: Load Balancer → Attributes → Edit → Drop invalid header fields → Enable.",
        "frameworks":  ["NIST-SI-10", "CIS-7.6"],
    },
    {
        "rule_id":     "AWS-ALB-006",
        "severity":    "MEDIUM",
        "service":     "Load Balancers",
        "title":       "Load balancer using outdated TLS security policy",
        "message":     "Load balancer HTTPS listener uses an outdated TLS security policy.",
        "remediation": "Update HTTPS listener to use ELBSecurityPolicy-TLS13-1-2-2021-06 or newer.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-ALB-007",
        "severity":    "LOW",
        "service":     "Load Balancers",
        "title":       "Classic Load Balancer in use (deprecated)",
        "message":     "Classic Load Balancer (CLB) is in use. CLBs are deprecated in favor of ALB/NLB.",
        "remediation": "Migrate to Application Load Balancer or Network Load Balancer.",
        "frameworks":  ["NIST-SI-2", "CIS-7.1"],
    },

    # ━━━ API GATEWAY ━━━
    {
        "rule_id":     "AWS-AGW-001",
        "severity":    "MEDIUM",
        "service":     "API Gateway",
        "title":       "API Gateway stage has no access logging",
        "message":     "API Gateway stage does not have access logging configured.",
        "remediation": "Enable access logging: API Gateway → Stage → Logs/Tracing → Enable access logging.",
        "frameworks":  ["NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-AGW-002",
        "severity":    "MEDIUM",
        "service":     "API Gateway",
        "title":       "API Gateway has no WAF attached",
        "message":     "No AWS WAF web ACL is associated with this API Gateway stage.",
        "remediation": "Create a WAF web ACL and associate it with the API Gateway stage.",
        "frameworks":  ["NIST-SI-3", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AWS-AGW-003",
        "severity":    "MEDIUM",
        "service":     "API Gateway",
        "title":       "API Gateway X-Ray tracing not enabled",
        "message":     "AWS X-Ray active tracing is not enabled for this API Gateway stage.",
        "remediation": "Enable X-Ray tracing: API Gateway → Stage → Logs/Tracing → Enable X-Ray.",
        "frameworks":  ["NIST-AU-12", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-AGW-004",
        "severity":    "MEDIUM",
        "service":     "API Gateway",
        "title":       "API Gateway stage has no TLS client certificate",
        "message":     "API Gateway stage does not require client-side SSL certificates for backend calls.",
        "remediation": "Generate a client certificate: API Gateway → Stage → Settings → Client certificate.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-AGW-005",
        "severity":    "LOW",
        "service":     "API Gateway",
        "title":       "API Gateway stage has no usage plan",
        "message":     "API Gateway stage has no usage plan with throttling and quota limits.",
        "remediation": "Create a usage plan and associate it with the API stage to prevent abuse.",
        "frameworks":  ["NIST-SC-5", "SOC2-A1.1"],
    },

    # ━━━ REDSHIFT ━━━
    {
        "rule_id":     "AWS-RS-001",
        "severity":    "CRITICAL",
        "service":     "Redshift",
        "title":       "Redshift cluster is publicly accessible",
        "message":     "Redshift cluster is accessible from the public internet.",
        "remediation": "Disable public accessibility: Redshift → Modify → Network and security → Publicly accessible → No.",
        "frameworks":  ["CIS-7.3", "NIST-SC-7", "PCI-1.3", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-RS-002",
        "severity":    "HIGH",
        "service":     "Redshift",
        "title":       "Redshift cluster not encrypted at rest",
        "message":     "Redshift cluster storage encryption is not enabled.",
        "remediation": "Enable encryption: Redshift → Modify → Database configurations → Encryption → KMS.",
        "frameworks":  ["CIS-7.1", "NIST-SC-28", "PCI-3.4", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-RS-003",
        "severity":    "MEDIUM",
        "service":     "Redshift",
        "title":       "Redshift cluster audit logging not enabled",
        "message":     "Redshift cluster audit logging is disabled. Database activity is not being logged.",
        "remediation": "Enable audit logging: Redshift → Modify → Maintenance → Audit logging → Enable.",
        "frameworks":  ["CIS-7.2", "NIST-AU-2", "PCI-10.1"],
    },
    {
        "rule_id":     "AWS-RS-004",
        "severity":    "HIGH",
        "service":     "Redshift",
        "title":       "Redshift cluster not in a VPC",
        "message":     "Redshift cluster is not deployed inside a VPC.",
        "remediation": "Migrate cluster to a VPC for network isolation.",
        "frameworks":  ["CIS-7.4", "NIST-SC-7"],
    },
    {
        "rule_id":     "AWS-RS-005",
        "severity":    "HIGH",
        "service":     "Redshift",
        "title":       "Redshift cluster does not require SSL connections",
        "message":     "Redshift parameter group does not enforce SSL/TLS for connections.",
        "remediation": "Set require_ssl to true in the Redshift cluster parameter group.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-RS-006",
        "severity":    "MEDIUM",
        "service":     "Redshift",
        "title":       "Redshift automated snapshots not enabled",
        "message":     "Automated snapshot retention period is 0 (disabled).",
        "remediation": "Enable automated snapshots: Redshift → Modify → Backup → Automated snapshot retention period.",
        "frameworks":  ["NIST-CP-9", "SOC2-A1.2"],
    },
    {
        "rule_id":     "AWS-RS-007",
        "severity":    "MEDIUM",
        "service":     "Redshift",
        "title":       "Redshift cluster not using enhanced VPC routing",
        "message":     "Enhanced VPC routing is not enabled. Traffic may leave the VPC.",
        "remediation": "Enable enhanced VPC routing: Redshift → Modify → Network → Enhanced VPC routing → Yes.",
        "frameworks":  ["NIST-SC-7"],
    },
    {
        "rule_id":     "AWS-RS-008",
        "severity":    "LOW",
        "service":     "Redshift",
        "title":       "Redshift cluster using default master username",
        "message":     "Redshift cluster is using the default 'awsuser' or 'admin' master username.",
        "remediation": "Use a unique master username when creating Redshift clusters.",
        "frameworks":  ["NIST-IA-5", "PCI-8.2"],
    },

    # ━━━ ELASTICSEARCH / OPENSEARCH ━━━
    {
        "rule_id":     "AWS-ES-001",
        "severity":    "HIGH",
        "service":     "OpenSearch",
        "title":       "OpenSearch/Elasticsearch domain not encrypted at rest",
        "message":     "Encryption at rest is not enabled for this domain.",
        "remediation": "Create a new domain with encryption at rest enabled (cannot be enabled on existing domains).",
        "frameworks":  ["NIST-SC-28", "PCI-3.4", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-ES-002",
        "severity":    "HIGH",
        "service":     "OpenSearch",
        "title":       "OpenSearch/Elasticsearch node-to-node encryption not enabled",
        "message":     "Node-to-node encryption is not enabled. Inter-node traffic is unencrypted.",
        "remediation": "Enable node-to-node encryption when creating a new domain.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-ES-003",
        "severity":    "HIGH",
        "service":     "OpenSearch",
        "title":       "OpenSearch/Elasticsearch does not enforce HTTPS",
        "message":     "Domain does not require HTTPS for all requests.",
        "remediation": "Enable HTTPS enforcement in domain access policy settings.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-ES-004",
        "severity":    "CRITICAL",
        "service":     "OpenSearch",
        "title":       "OpenSearch/Elasticsearch domain is publicly accessible",
        "message":     "Domain access policy allows public access without VPC isolation.",
        "remediation": "Place domain inside a VPC and restrict access using security groups.",
        "frameworks":  ["CIS-7.4", "NIST-SC-7", "PCI-1.3"],
    },
    {
        "rule_id":     "AWS-ES-005",
        "severity":    "MEDIUM",
        "service":     "OpenSearch",
        "title":       "OpenSearch/Elasticsearch audit logging not enabled",
        "message":     "Audit logs are not enabled for this domain.",
        "remediation": "Enable audit logs: OpenSearch → Logs → Audit logs → Enable.",
        "frameworks":  ["NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-ES-006",
        "severity":    "HIGH",
        "service":     "OpenSearch",
        "title":       "OpenSearch/Elasticsearch fine-grained access control not enabled",
        "message":     "Fine-grained access control (FGAC) is not enabled for this domain.",
        "remediation": "Enable FGAC when creating a new domain (cannot be enabled on existing ones).",
        "frameworks":  ["NIST-AC-3", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-ES-007",
        "severity":    "HIGH",
        "service":     "OpenSearch",
        "title":       "OpenSearch/Elasticsearch domain not in VPC",
        "message":     "Domain is not deployed inside a VPC, allowing potential public access.",
        "remediation": "Create a new domain within a VPC with appropriate security group rules.",
        "frameworks":  ["NIST-SC-7", "CIS-7.4"],
    },

    # ━━━ WAF ━━━
    {
        "rule_id":     "AWS-WAF-001",
        "severity":    "MEDIUM",
        "service":     "WAF",
        "title":       "WAF Web ACL has no logging enabled",
        "message":     "AWS WAF web ACL does not have logging configured.",
        "remediation": "Enable logging: WAF → Web ACL → Logging and metrics → Enable logging.",
        "frameworks":  ["NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-WAF-002",
        "severity":    "MEDIUM",
        "service":     "WAF",
        "title":       "WAF Web ACL has no rate-based rules",
        "message":     "No rate-based rules are configured to protect against brute force or DDoS.",
        "remediation": "Add rate-based rules to limit request rates from individual IPs.",
        "frameworks":  ["NIST-SC-5", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AWS-WAF-003",
        "severity":    "HIGH",
        "service":     "WAF",
        "title":       "WAF Web ACL default action is ALLOW",
        "message":     "WAF Web ACL default action allows all traffic not matched by rules.",
        "remediation": "Review and tighten WAF rules so the default ALLOW does not expose critical resources.",
        "frameworks":  ["NIST-SC-7", "SOC2-CC6.6"],
    },
    {
        "rule_id":     "AWS-WAF-004",
        "severity":    "LOW",
        "service":     "WAF",
        "title":       "WAF Web ACL not associated with any resource",
        "message":     "WAF Web ACL exists but is not associated with any CloudFront, ALB, or API Gateway.",
        "remediation": "Associate the WAF Web ACL with a resource or delete it if unused.",
        "frameworks":  ["NIST-SI-3", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AWS-WAF-005",
        "severity":    "MEDIUM",
        "service":     "WAF",
        "title":       "WAF Web ACL missing AWS Managed Rules",
        "message":     "WAF Web ACL does not use any AWS Managed Rule Groups for baseline protection.",
        "remediation": "Add AWS Managed Rule Groups (e.g., AWSManagedRulesCommonRuleSet) to the WAF Web ACL.",
        "frameworks":  ["NIST-SI-3", "PCI-6.4"],
    },

    # ━━━ COGNITO ━━━
    {
        "rule_id":     "AWS-COG-001",
        "severity":    "HIGH",
        "service":     "Cognito",
        "title":       "Cognito User Pool MFA not enforced",
        "message":     "Multi-factor authentication is not required for Cognito User Pool users.",
        "remediation": "Set MFA configuration to ON or OPTIONAL: Cognito → User pool → Sign-in → MFA.",
        "frameworks":  ["NIST-IA-3", "PCI-8.4", "CIS-1.22"],
    },
    {
        "rule_id":     "AWS-COG-002",
        "severity":    "HIGH",
        "service":     "Cognito",
        "title":       "Cognito User Pool advanced security not enabled",
        "message":     "Cognito advanced security mode is not enabled. Compromised credential protection is inactive.",
        "remediation": "Enable advanced security: Cognito → User pool → Advanced security → Enable.",
        "frameworks":  ["NIST-IA-5", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AWS-COG-003",
        "severity":    "MEDIUM",
        "service":     "Cognito",
        "title":       "Cognito User Pool password minimum length too short",
        "message":     "User Pool password policy minimum length is less than 12 characters.",
        "remediation": "Set minimum password length to 12 or more: Cognito → User pool → Sign-in → Password policy.",
        "frameworks":  ["NIST-IA-5", "CIS-1.9"],
    },
    {
        "rule_id":     "AWS-COG-004",
        "severity":    "MEDIUM",
        "service":     "Cognito",
        "title":       "Cognito temporary password expiry too long",
        "message":     "Temporary password validity exceeds 7 days.",
        "remediation": "Set temporary password validity to 7 days or fewer: Cognito → User pool → Sign-in → Password policy.",
        "frameworks":  ["NIST-IA-5", "PCI-8.3.9"],
    },
    {
        "rule_id":     "AWS-COG-005",
        "severity":    "LOW",
        "service":     "Cognito",
        "title":       "Cognito User Pool allows self-registration",
        "message":     "User self-registration is enabled — anyone can create an account.",
        "remediation": "Disable self-registration if this pool is for internal use only.",
        "frameworks":  ["NIST-AC-2", "SOC2-CC6.2"],
    },
    {
        "rule_id":     "AWS-COG-006",
        "severity":    "MEDIUM",
        "service":     "Cognito",
        "title":       "Cognito User Pool missing deletion protection",
        "message":     "Deletion protection is not enabled on this Cognito User Pool.",
        "remediation": "Enable deletion protection: Cognito → User pool → Properties → Deletion protection → Enable.",
        "frameworks":  ["NIST-CP-9", "ISO27001-A.11.2"],
    },

    # ━━━ SSM ━━━
    {
        "rule_id":     "AWS-SSM-001",
        "severity":    "HIGH",
        "service":     "SSM",
        "title":       "SSM parameter stored as plaintext (not SecureString)",
        "message":     "Sensitive parameter is stored as String or StringList instead of SecureString.",
        "remediation": "Re-create the parameter as SecureString type with a KMS key.",
        "frameworks":  ["NIST-SC-28", "PCI-3.4", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-SSM-002",
        "severity":    "MEDIUM",
        "service":     "SSM",
        "title":       "SSM Session Manager logging not enabled",
        "message":     "Session Manager sessions are not being logged to S3 or CloudWatch Logs.",
        "remediation": "Configure Session Manager preferences: SSM → Session Manager → Preferences → Enable logging.",
        "frameworks":  ["NIST-AU-2", "PCI-10.1", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-SSM-003",
        "severity":    "MEDIUM",
        "service":     "SSM",
        "title":       "EC2 instances not managed by SSM",
        "message":     "One or more EC2 instances are not registered with AWS Systems Manager.",
        "remediation": "Install SSM Agent and attach appropriate IAM role to enable SSM management.",
        "frameworks":  ["NIST-CM-6", "CIS-7.1"],
    },
    {
        "rule_id":     "AWS-SSM-004",
        "severity":    "LOW",
        "service":     "SSM",
        "title":       "SSM documents shared publicly",
        "message":     "One or more SSM documents are shared publicly.",
        "remediation": "Remove public sharing from SSM documents unless explicitly required.",
        "frameworks":  ["NIST-AC-3", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AWS-SSM-005",
        "severity":    "MEDIUM",
        "service":     "SSM",
        "title":       "SSM Session Manager shell profile not configured",
        "message":     "No shell profile is configured for Session Manager to restrict session actions.",
        "remediation": "Configure shell profile in Session Manager preferences to restrict commands.",
        "frameworks":  ["NIST-AC-3", "SOC2-CC6.3"],
    },

    # ━━━ ACM CERTIFICATES ━━━
    {
        "rule_id":     "AWS-ACM-001",
        "severity":    "HIGH",
        "service":     "ACM",
        "title":       "ACM certificate expiring within 30 days",
        "message":     "ACM certificate is expiring within 30 days and may not auto-renew.",
        "remediation": "Verify domain validation records are in place for auto-renewal, or manually renew.",
        "frameworks":  ["NIST-SC-8", "SOC2-CC7.4"],
    },
    {
        "rule_id":     "AWS-ACM-002",
        "severity":    "CRITICAL",
        "service":     "ACM",
        "title":       "ACM certificate expiring within 7 days",
        "message":     "ACM certificate expires in less than 7 days. Immediate action required.",
        "remediation": "Manually renew the certificate immediately and update DNS validation records.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1", "SOC2-CC7.4"],
    },
    {
        "rule_id":     "AWS-ACM-003",
        "severity":    "HIGH",
        "service":     "ACM",
        "title":       "ACM certificate using weak RSA-1024 key",
        "message":     "Certificate uses a 1024-bit RSA key which is below current security standards.",
        "remediation": "Request a new certificate with RSA-2048 or EC-256 key algorithm.",
        "frameworks":  ["NIST-SC-12", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-ACM-004",
        "severity":    "MEDIUM",
        "service":     "ACM",
        "title":       "ACM certificate not eligible for auto-renewal",
        "message":     "ACM certificate is not eligible for automatic renewal.",
        "remediation": "Ensure domain validation (DNS/email) is correctly configured for auto-renewal.",
        "frameworks":  ["NIST-SC-8", "ISO27001-A.10.1"],
    },

    # ━━━ ROUTE53 ━━━
    {
        "rule_id":     "AWS-R53-001",
        "severity":    "MEDIUM",
        "service":     "Route53",
        "title":       "Route53 hosted zone DNSSEC not enabled",
        "message":     "DNSSEC signing is not enabled for this Route53 hosted zone.",
        "remediation": "Enable DNSSEC: Route53 → Hosted zones → DNSSEC signing → Enable DNSSEC signing.",
        "frameworks":  ["NIST-SC-8", "CIS-1.18"],
    },
    {
        "rule_id":     "AWS-R53-002",
        "severity":    "LOW",
        "service":     "Route53",
        "title":       "Route53 hosted zone query logging not enabled",
        "message":     "DNS query logging is not enabled for this Route53 hosted zone.",
        "remediation": "Enable query logging: Route53 → Hosted zone → Configure query logging → CloudWatch log group.",
        "frameworks":  ["NIST-AU-2", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-R53-003",
        "severity":    "HIGH",
        "service":     "Route53",
        "title":       "Route53 domain transfer lock not enabled",
        "message":     "Domain transfer lock is not enabled, allowing unauthorized domain transfers.",
        "remediation": "Enable transfer lock: Route53 → Registered domains → Domain → Enable transfer lock.",
        "frameworks":  ["NIST-CM-3", "ISO27001-A.8.1"],
    },
    {
        "rule_id":     "AWS-R53-004",
        "severity":    "LOW",
        "service":     "Route53",
        "title":       "Route53 domain privacy protection not enabled",
        "message":     "WHOIS privacy protection is not enabled, exposing registrant contact details.",
        "remediation": "Enable privacy protection: Route53 → Registered domains → Domain → Enable privacy protection.",
        "frameworks":  ["GDPR-Art5", "ISO27001-A.8.1"],
    },

    # ━━━ ECS ━━━
    {
        "rule_id":     "AWS-ECS-001",
        "severity":    "CRITICAL",
        "service":     "ECS",
        "title":       "ECS task definition uses privileged container",
        "message":     "ECS task definition has containers with privileged mode enabled.",
        "remediation": "Set privileged to false in container definitions and use least-privilege IAM roles.",
        "frameworks":  ["NIST-AC-6", "CIS-7.5", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-ECS-002",
        "severity":    "HIGH",
        "service":     "ECS",
        "title":       "ECS task definition uses host network mode",
        "message":     "Container shares the host network namespace, bypassing Docker network isolation.",
        "remediation": "Change networkMode to awsvpc or bridge instead of host.",
        "frameworks":  ["NIST-SC-7", "CIS-7.5"],
    },
    {
        "rule_id":     "AWS-ECS-003",
        "severity":    "MEDIUM",
        "service":     "ECS",
        "title":       "ECS task definition container without read-only root filesystem",
        "message":     "Container root filesystem is writable, increasing risk of container escape.",
        "remediation": "Set readonlyRootFilesystem to true in container definitions.",
        "frameworks":  ["NIST-CM-7", "CIS-7.5"],
    },
    {
        "rule_id":     "AWS-ECS-004",
        "severity":    "CRITICAL",
        "service":     "ECS",
        "title":       "ECS task definition passes secrets in environment variables",
        "message":     "Sensitive values are passed as plaintext environment variables instead of secrets.",
        "remediation": "Use ECS secrets integration with Secrets Manager or SSM Parameter Store.",
        "frameworks":  ["NIST-SC-28", "PCI-3.4", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-ECS-005",
        "severity":    "HIGH",
        "service":     "ECS",
        "title":       "ECS task definition has no execution role",
        "message":     "No task execution role is configured for pulling images and sending logs.",
        "remediation": "Create and attach an ecsTaskExecutionRole with least-privilege permissions.",
        "frameworks":  ["NIST-AC-6", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-ECS-006",
        "severity":    "MEDIUM",
        "service":     "ECS",
        "title":       "ECS cluster Container Insights not enabled",
        "message":     "CloudWatch Container Insights is not enabled for this ECS cluster.",
        "remediation": "Enable Container Insights: ECS → Cluster → Update cluster → Container Insights → Enabled.",
        "frameworks":  ["NIST-AU-12", "SOC2-CC7.2"],
    },

    # ━━━ MSK (MANAGED STREAMING FOR KAFKA) ━━━
    {
        "rule_id":     "AWS-MSK-001",
        "severity":    "HIGH",
        "service":     "MSK",
        "title":       "MSK cluster encryption in transit not enabled",
        "message":     "MSK cluster does not enforce TLS for client-broker communication.",
        "remediation": "Set clientBroker to TLS in encryption settings when creating/updating the cluster.",
        "frameworks":  ["NIST-SC-8", "PCI-4.1"],
    },
    {
        "rule_id":     "AWS-MSK-002",
        "severity":    "HIGH",
        "service":     "MSK",
        "title":       "MSK cluster encryption at rest not enabled",
        "message":     "MSK cluster data is not encrypted at rest.",
        "remediation": "Enable at-rest encryption using a KMS key when creating the MSK cluster.",
        "frameworks":  ["NIST-SC-28", "PCI-3.4"],
    },
    {
        "rule_id":     "AWS-MSK-003",
        "severity":    "HIGH",
        "service":     "MSK",
        "title":       "MSK cluster broker nodes publicly accessible",
        "message":     "MSK cluster has public access enabled, exposing Kafka brokers to the internet.",
        "remediation": "Disable public access in MSK connectivity settings.",
        "frameworks":  ["NIST-SC-7", "CIS-7.4"],
    },
    {
        "rule_id":     "AWS-MSK-004",
        "severity":    "MEDIUM",
        "service":     "MSK",
        "title":       "MSK cluster CloudWatch logging not enabled",
        "message":     "MSK broker logs are not being sent to CloudWatch Logs.",
        "remediation": "Enable CloudWatch Logs broker logging in MSK cluster configuration.",
        "frameworks":  ["NIST-AU-2", "SOC2-CC7.2"],
    },

    # ━━━ KINESIS ━━━
    {
        "rule_id":     "AWS-KIN-001",
        "severity":    "HIGH",
        "service":     "Kinesis",
        "title":       "Kinesis Data Stream not encrypted",
        "message":     "Kinesis Data Stream does not have server-side encryption enabled.",
        "remediation": "Enable SSE: Kinesis → Stream → Details → Server-side encryption → Enable.",
        "frameworks":  ["NIST-SC-28", "PCI-3.4", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-KIN-002",
        "severity":    "LOW",
        "service":     "Kinesis",
        "title":       "Kinesis Data Stream retention period too short",
        "message":     "Stream data retention is less than 7 days (168 hours).",
        "remediation": "Increase retention period: Kinesis → Stream → Increase data retention period.",
        "frameworks":  ["NIST-AU-11", "SOC2-A1.2"],
    },
    {
        "rule_id":     "AWS-KIN-003",
        "severity":    "LOW",
        "service":     "Kinesis",
        "title":       "Kinesis Data Stream enhanced monitoring not enabled",
        "message":     "Shard-level metrics are not enabled for this Kinesis stream.",
        "remediation": "Enable enhanced monitoring: Kinesis → Stream → Monitoring → Enable shard-level metrics.",
        "frameworks":  ["NIST-AU-12", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-KIN-004",
        "severity":    "MEDIUM",
        "service":     "Kinesis",
        "title":       "Kinesis Video Stream not encrypted",
        "message":     "Kinesis Video Stream does not have server-side encryption enabled.",
        "remediation": "Enable SSE with KMS on Kinesis Video Streams.",
        "frameworks":  ["NIST-SC-28", "HIPAA-164.312"],
    },

    # ━━━ SES ━━━
    {
        "rule_id":     "AWS-SES-001",
        "severity":    "MEDIUM",
        "service":     "SES",
        "title":       "SES identity DKIM not enabled",
        "message":     "DomainKeys Identified Mail (DKIM) is not enabled for this SES identity.",
        "remediation": "Enable DKIM: SES → Identities → Identity → Authentication → DKIM → Enable.",
        "frameworks":  ["NIST-SI-8", "ISO27001-A.13.2"],
    },
    {
        "rule_id":     "AWS-SES-002",
        "severity":    "MEDIUM",
        "service":     "SES",
        "title":       "SES identity not verified",
        "message":     "SES identity has not completed verification.",
        "remediation": "Complete domain or email verification for the SES identity.",
        "frameworks":  ["NIST-IA-5", "ISO27001-A.13.2"],
    },
    {
        "rule_id":     "AWS-SES-003",
        "severity":    "LOW",
        "service":     "SES",
        "title":       "SES sending not in sandbox mode for production",
        "message":     "SES account may still be in sandbox mode, restricting production email delivery.",
        "remediation": "Request production access: SES → Account dashboard → Request production access.",
        "frameworks":  ["ISO27001-A.13.2"],
    },

    # ━━━ MACIE ━━━
    {
        "rule_id":     "AWS-MAC-001",
        "severity":    "HIGH",
        "service":     "Macie",
        "title":       "Amazon Macie not enabled",
        "message":     "Amazon Macie is not enabled. Sensitive data in S3 will not be automatically discovered.",
        "remediation": "Enable Macie: Macie → Get started → Enable Macie.",
        "frameworks":  ["NIST-RA-5", "HIPAA-164.312", "GDPR-Art25", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AWS-MAC-002",
        "severity":    "MEDIUM",
        "service":     "Macie",
        "title":       "Macie automated sensitive data discovery disabled",
        "message":     "Macie is enabled but automated sensitive data discovery is not configured.",
        "remediation": "Configure automated sensitive data discovery jobs in Macie for S3 buckets.",
        "frameworks":  ["GDPR-Art25", "HIPAA-164.312"],
    },

    # ━━━ INSPECTOR ━━━
    {
        "rule_id":     "AWS-INS-001",
        "severity":    "HIGH",
        "service":     "Inspector",
        "title":       "Amazon Inspector v2 not enabled",
        "message":     "Inspector v2 is not enabled. EC2 and Lambda vulnerability scanning is inactive.",
        "remediation": "Enable Inspector v2: Inspector → Get started → Enable Inspector.",
        "frameworks":  ["NIST-RA-5", "SOC2-CC7.1", "PCI-11.2"],
    },
    {
        "rule_id":     "AWS-INS-002",
        "severity":    "HIGH",
        "service":     "Inspector",
        "title":       "Inspector ECR container scanning not enabled",
        "message":     "Inspector v2 ECR container image scanning is not activated.",
        "remediation": "Enable ECR scanning in Inspector v2 settings.",
        "frameworks":  ["NIST-RA-5", "SOC2-CC7.1"],
    },
    {
        "rule_id":     "AWS-INS-003",
        "severity":    "MEDIUM",
        "service":     "Inspector",
        "title":       "Inspector Lambda code scanning not enabled",
        "message":     "Inspector v2 Lambda code vulnerability scanning is not activated.",
        "remediation": "Enable Lambda scanning in Inspector v2 settings.",
        "frameworks":  ["NIST-RA-5", "SOC2-CC7.1"],
    },

    # ━━━ BACKUP ━━━
    {
        "rule_id":     "AWS-BCK-001",
        "severity":    "HIGH",
        "service":     "Backup",
        "title":       "No AWS Backup plan configured",
        "message":     "No AWS Backup plan is configured to protect critical resources.",
        "remediation": "Create a Backup plan: AWS Backup → Create Backup plan → Add rules → Assign resources.",
        "frameworks":  ["NIST-CP-9", "SOC2-A1.2", "ISO27001-A.12.3"],
    },
    {
        "rule_id":     "AWS-BCK-002",
        "severity":    "HIGH",
        "service":     "Backup",
        "title":       "AWS Backup vault not encrypted with CMK",
        "message":     "Backup vault is using the default encryption key instead of a Customer Managed Key.",
        "remediation": "Create a new backup vault with a KMS CMK specified.",
        "frameworks":  ["NIST-SC-28", "PCI-3.4"],
    },
    {
        "rule_id":     "AWS-BCK-003",
        "severity":    "MEDIUM",
        "service":     "Backup",
        "title":       "No cross-region backup copy rule configured",
        "message":     "No cross-region copy rule exists in backup plans for disaster recovery.",
        "remediation": "Add a copy action to your backup plan to replicate backups to another region.",
        "frameworks":  ["NIST-CP-9", "ISO27001-A.17.2"],
    },

    # ━━━ EXTENDED IAM ━━━
    {
        "rule_id":     "AWS-IAM-016",
        "severity":    "MEDIUM",
        "service":     "IAM",
        "title":       "IAM user with no activity in over 90 days",
        "message":     "IAM user has not logged in or used access keys in over 90 days (potentially orphaned).",
        "remediation": "Deactivate or delete inactive IAM users. Review with account owner first.",
        "frameworks":  ["CIS-1.3", "NIST-AC-2", "SOC2-CC6.2"],
    },
    {
        "rule_id":     "AWS-IAM-017",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "IAM user has multiple active access keys",
        "message":     "IAM user has more than one active access key, increasing the attack surface.",
        "remediation": "Deactivate and delete the oldest access key, keeping only the currently used key.",
        "frameworks":  ["CIS-1.21", "NIST-IA-5"],
    },
    {
        "rule_id":     "AWS-IAM-018",
        "severity":    "CRITICAL",
        "service":     "IAM",
        "title":       "IAM policy allows full wildcard (*:*) permissions",
        "message":     "IAM policy grants full access to all services and actions via wildcard.",
        "remediation": "Replace wildcard policies with least-privilege policies scoped to specific resources.",
        "frameworks":  ["CIS-1.17", "NIST-AC-6", "PCI-7.1", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-IAM-019",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "IAM role has no permission boundary",
        "message":     "High-privilege IAM role does not have a permission boundary set.",
        "remediation": "Attach a permission boundary policy to restrict maximum permissions for this role.",
        "frameworks":  ["NIST-AC-6", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-IAM-020",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "IAM role trusts all AWS principals (cross-account)",
        "message":     "IAM role trust policy allows any AWS principal to assume this role.",
        "remediation": "Restrict the trust policy to specific account IDs, roles, or services.",
        "frameworks":  ["NIST-AC-6", "CIS-1.17", "SOC2-CC6.3"],
    },
    {
        "rule_id":     "AWS-IAM-021",
        "severity":    "MEDIUM",
        "service":     "IAM",
        "title":       "IAM user credentials not used since creation",
        "message":     "IAM user has console password set but has never logged in.",
        "remediation": "Deactivate or delete IAM users who have never logged in.",
        "frameworks":  ["CIS-1.3", "NIST-AC-2"],
    },
    {
        "rule_id":     "AWS-IAM-022",
        "severity":    "HIGH",
        "service":     "IAM",
        "title":       "Service-linked role with overly broad permissions",
        "message":     "Custom role with AdministratorAccess attached exists beyond required scope.",
        "remediation": "Remove AdministratorAccess from custom roles and apply least-privilege policies.",
        "frameworks":  ["NIST-AC-6", "SOC2-CC6.3", "PCI-7.1"],
    },

    # ━━━ EXTENDED CLOUDWATCH ━━━
    {
        "rule_id":     "AWS-CW-007",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for unauthorized API calls",
        "message":     "No alarm monitors for unauthorized (AccessDenied) API calls.",
        "remediation": "Create metric filter for AccessDenied errors and attach a CloudWatch alarm.",
        "frameworks":  ["CIS-3.1", "NIST-AU-6", "SOC2-CC7.3"],
    },
    {
        "rule_id":     "AWS-CW-008",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for Network ACL changes",
        "message":     "No alarm detects changes to Network ACL rules.",
        "remediation": "Create metric filter for NACL events and attach a CloudWatch alarm.",
        "frameworks":  ["CIS-3.11", "NIST-AU-6"],
    },
    {
        "rule_id":     "AWS-CW-009",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "No CloudWatch alarm for customer KMS key deletion",
        "message":     "No alarm detects scheduled deletion of customer KMS keys.",
        "remediation": "Create metric filter for KMS DeleteAlias/ScheduleKeyDeletion and attach an alarm.",
        "frameworks":  ["CIS-3.7", "NIST-AU-6"],
    },
    {
        "rule_id":     "AWS-CW-010",
        "severity":    "MEDIUM",
        "service":     "CloudWatch",
        "title":       "CloudWatch Log Group not encrypted with KMS",
        "message":     "CloudWatch Log Group does not use a KMS key for encryption.",
        "remediation": "Associate a KMS key with the log group: CloudWatch → Log groups → Actions → Associate KMS key.",
        "frameworks":  ["NIST-SC-28", "CIS-3.7"],
    },
    {
        "rule_id":     "AWS-CW-011",
        "severity":    "LOW",
        "service":     "CloudWatch",
        "title":       "CloudWatch Log Group retention less than 365 days",
        "message":     "Log group retention period is less than 365 days.",
        "remediation": "Set log group retention to at least 365 days for compliance.",
        "frameworks":  ["NIST-AU-11", "PCI-10.7", "SOC2-A1.2"],
    },

    # ━━━ EXTENDED CLOUDTRAIL ━━━
    {
        "rule_id":     "AWS-CT-007",
        "severity":    "MEDIUM",
        "service":     "CloudTrail",
        "title":       "CloudTrail does not record data events for S3",
        "message":     "CloudTrail is not configured to record S3 object-level data events.",
        "remediation": "Add S3 data events to CloudTrail trail: Trail → Data events → S3 → All current and future.",
        "frameworks":  ["CIS-3.10", "NIST-AU-2", "PCI-10.2"],
    },
    {
        "rule_id":     "AWS-CT-008",
        "severity":    "MEDIUM",
        "service":     "CloudTrail",
        "title":       "CloudTrail does not record Lambda data events",
        "message":     "CloudTrail is not capturing Lambda function invocation events.",
        "remediation": "Add Lambda data events to CloudTrail trail: Trail → Data events → Lambda.",
        "frameworks":  ["NIST-AU-2", "SOC2-CC7.2"],
    },

    # ━━━ EXTENDED RDS ━━━
    {
        "rule_id":     "AWS-RDS-009",
        "severity":    "MEDIUM",
        "service":     "RDS",
        "title":       "RDS cluster does not have IAM authentication enabled",
        "message":     "IAM database authentication is not enabled for this RDS instance.",
        "remediation": "Enable IAM auth: RDS → Modify → Database authentication → Enable IAM database authentication.",
        "frameworks":  ["NIST-IA-2", "SOC2-CC6.1"],
    },
    {
        "rule_id":     "AWS-RDS-010",
        "severity":    "MEDIUM",
        "service":     "RDS",
        "title":       "RDS instance has no enhanced monitoring",
        "message":     "Enhanced monitoring is not enabled for this RDS instance.",
        "remediation": "Enable enhanced monitoring: RDS → Modify → Monitoring → Enhanced monitoring → Enable.",
        "frameworks":  ["NIST-AU-12", "SOC2-CC7.2"],
    },
    {
        "rule_id":     "AWS-RDS-011",
        "severity":    "HIGH",
        "service":     "RDS",
        "title":       "RDS instance not in VPC",
        "message":     "RDS instance is not deployed inside a VPC.",
        "remediation": "Migrate RDS instance to a VPC. This requires creating a new instance in a VPC.",
        "frameworks":  ["NIST-SC-7", "PCI-1.3"],
    },

    # ━━━ EXTENDED KMS ━━━
    {
        "rule_id":     "AWS-KMS-004",
        "severity":    "MEDIUM",
        "service":     "KMS",
        "title":       "KMS key has no key policy principal restrictions",
        "message":     "KMS key policy uses a wildcard principal, granting access beyond intended scope.",
        "remediation": "Update the key policy to specify only the required IAM principals.",
        "frameworks":  ["NIST-SC-12", "SOC2-CC6.1", "CIS-3.8"],
    },

    # ━━━ EXTENDED S3 ━━━
    {
        "rule_id":     "AWS-S3-008",
        "severity":    "MEDIUM",
        "service":     "S3",
        "title":       "S3 bucket does not have Object Lock enabled",
        "message":     "S3 Object Lock is not enabled. Regulatory compliance or WORM storage cannot be guaranteed.",
        "remediation": "Object Lock must be enabled at bucket creation. Create a new bucket with Object Lock enabled.",
        "frameworks":  ["NIST-AU-9", "SOC2-CC7.3", "GDPR-Art17"],
    },
    {
        "rule_id":     "AWS-S3-009",
        "severity":    "LOW",
        "service":     "S3",
        "title":       "S3 bucket allows cross-account access",
        "message":     "S3 bucket policy grants access to external AWS accounts.",
        "remediation": "Review and restrict cross-account access in the bucket policy to only trusted accounts.",
        "frameworks":  ["NIST-AC-3", "SOC2-CC6.1"],
    },

    # ━━━ EXTENDED LAMBDA ━━━
    {
        "rule_id":     "AWS-LAM-006",
        "severity":    "MEDIUM",
        "service":     "Lambda",
        "title":       "Lambda function has secrets in environment variables",
        "message":     "Lambda function environment variables may contain sensitive credentials or API keys.",
        "remediation": "Use Secrets Manager or SSM Parameter Store instead of plaintext environment variables.",
        "frameworks":  ["NIST-SC-28", "PCI-3.4", "HIPAA-164.312"],
    },
    {
        "rule_id":     "AWS-LAM-007",
        "severity":    "LOW",
        "service":     "Lambda",
        "title":       "Lambda function has no reserved concurrency set",
        "message":     "No reserved concurrency is set, allowing the function to consume all available Lambda capacity.",
        "remediation": "Set reserved concurrency to limit the function's resource consumption.",
        "frameworks":  ["NIST-SC-5", "SOC2-A1.1"],
    },

    # ━━━ EXTENDED EKS ━━━
    {
        "rule_id":     "AWS-EKS-006",
        "severity":    "HIGH",
        "service":     "EKS",
        "title":       "EKS cluster has no secrets encryption",
        "message":     "Kubernetes Secrets in this EKS cluster are not encrypted with KMS.",
        "remediation": "Enable secrets encryption: EKS → Cluster → Secrets encryption → Enable with a KMS key.",
        "frameworks":  ["NIST-SC-28", "PCI-3.4"],
    },
    {
        "rule_id":     "AWS-EKS-007",
        "severity":    "HIGH",
        "service":     "EKS",
        "title":       "EKS cluster API endpoint is public without IP restrictions",
        "message":     "EKS cluster public API endpoint has no authorized IP range restrictions.",
        "remediation": "Configure authorized IP ranges: EKS → Cluster → Networking → Manage networking → Add authorized IP ranges.",
        "frameworks":  ["NIST-SC-7", "CIS-5.4"],
    },
]


def check_aws_resources(resources: list) -> list:
    """
    Evaluate all AWS resources against AWS_RULES.
    Returns a flat list of Finding objects.
    """
    findings = []
    for resource in resources:
        if resource.cloud != "aws":
            continue
        for rule in AWS_RULES:
            finding = _evaluate_rule(resource, rule)
            if finding:
                findings.append(finding)
        # Evaluate custom rules
        findings.extend(evaluate_custom_rules(resource, "aws"))
    return findings


def _evaluate_rule(resource, rule: dict):  # noqa: C901
    """Map rule_id to check logic and return Finding if triggered."""
    rid = rule["rule_id"]
    rc  = resource.raw_config  # shorthand
    triggered = False

    # ── IAM Summary ──────────────────────────────────────────────────────────
    if rid == "AWS-IAM-001" and resource.resource_type == "iam_summary":
        triggered = not resource.mfa_enabled
    elif rid == "AWS-IAM-002" and resource.resource_type == "iam_summary":
        triggered = resource.root_access_keys
    elif rid == "AWS-IAM-003" and resource.resource_type == "iam_summary":
        triggered = not resource.password_policy_exists
    elif rid == "AWS-IAM-004" and resource.resource_type == "iam_summary":
        ml = resource.password_min_length
        triggered = ml is not None and ml < 14
    elif rid == "AWS-IAM-005" and resource.resource_type == "iam_summary":
        triggered = not resource.password_require_upper
    elif rid == "AWS-IAM-006" and resource.resource_type == "iam_summary":
        triggered = not resource.password_require_lower
    elif rid == "AWS-IAM-007" and resource.resource_type == "iam_summary":
        triggered = not resource.password_require_number
    elif rid == "AWS-IAM-008" and resource.resource_type == "iam_summary":
        triggered = not resource.password_require_symbol
    elif rid == "AWS-IAM-009" and resource.resource_type == "iam_summary":
        ma = resource.password_max_age
        triggered = ma is None or ma > 90
    elif rid == "AWS-IAM-010" and resource.resource_type == "iam_summary":
        rp = resource.password_reuse_count
        triggered = rp is None or rp < 24
    elif rid == "AWS-IAM-015" and resource.resource_type == "iam_summary":
        triggered = not rc.get("support_role_exists", True)

    # ── IAM Users ────────────────────────────────────────────────────────────
    elif rid == "AWS-IAM-011" and resource.resource_type == "iam_user":
        triggered = resource.console_access and not resource.mfa_enabled
    elif rid == "AWS-IAM-012" and resource.resource_type == "iam_user":
        age = resource.access_key_age_days
        triggered = age is not None and age > 90
    elif rid == "AWS-IAM-013" and resource.resource_type == "iam_user":
        triggered = rc.get("has_inline_policies", False)
    elif rid == "AWS-IAM-014" and resource.resource_type == "iam_user":
        triggered = rc.get("has_admin_policy", False)
    elif rid == "AWS-IAM-016" and resource.resource_type == "iam_user":
        last_used = rc.get("days_since_last_used")
        triggered = last_used is not None and last_used > 90
    elif rid == "AWS-IAM-017" and resource.resource_type == "iam_user":
        triggered = rc.get("active_key_count", 0) > 1
    elif rid == "AWS-IAM-021" and resource.resource_type == "iam_user":
        triggered = rc.get("never_logged_in", False) and resource.console_access

    # ── IAM Roles ────────────────────────────────────────────────────────────
    elif rid == "AWS-IAM-018" and resource.resource_type == "iam_role":
        triggered = rc.get("has_wildcard_policy", False)
    elif rid == "AWS-IAM-019" and resource.resource_type == "iam_role":
        triggered = rc.get("has_admin_policy", False) and not rc.get("has_permission_boundary", False)
    elif rid == "AWS-IAM-020" and resource.resource_type == "iam_role":
        triggered = rc.get("trust_allows_all_principals", False)
    elif rid == "AWS-IAM-022" and resource.resource_type == "iam_role":
        triggered = rc.get("has_admin_policy", False)

    # ── S3 ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-S3-001" and resource.resource_type == "s3_bucket":
        triggered = resource.is_public
    elif rid == "AWS-S3-002" and resource.resource_type == "s3_bucket":
        triggered = not resource.is_encrypted
    elif rid == "AWS-S3-003" and resource.resource_type == "s3_bucket":
        triggered = not resource.versioning
    elif rid == "AWS-S3-004" and resource.resource_type == "s3_bucket":
        triggered = not resource.logging_enabled
    elif rid == "AWS-S3-005" and resource.resource_type == "s3_bucket":
        triggered = not rc.get("mfa_delete_enabled", False)
    elif rid == "AWS-S3-006" and resource.resource_type == "s3_bucket":
        triggered = not resource.https_only
    elif rid == "AWS-S3-007" and resource.resource_type == "s3_bucket":
        triggered = not rc.get("has_lifecycle_policy", False)
    elif rid == "AWS-S3-008" and resource.resource_type == "s3_bucket":
        triggered = not rc.get("object_lock_enabled", False)
    elif rid == "AWS-S3-009" and resource.resource_type == "s3_bucket":
        triggered = rc.get("has_cross_account_access", False)

    # ── EC2 ──────────────────────────────────────────────────────────────────
    elif rid == "AWS-EC2-001" and resource.resource_type == "ec2_instance":
        triggered = not resource.imdsv2
    elif rid == "AWS-EC2-002" and resource.resource_type == "ec2_instance":
        triggered = resource.is_public
    elif rid == "AWS-EC2-003" and resource.resource_type == "ec2_instance":
        triggered = not rc.get("detailed_monitoring_enabled", False)
    elif rid == "AWS-EC2-004" and resource.resource_type == "ec2_instance":
        triggered = not rc.get("has_iam_profile", False)
    elif rid == "AWS-EC2-005" and resource.resource_type == "ec2_instance":
        triggered = rc.get("in_default_vpc", False)
    elif rid == "AWS-EC2-006" and resource.resource_type == "ec2_instance":
        triggered = rc.get("deprecated_ami", False)
    elif rid == "AWS-EC2-007" and resource.resource_type == "ec2_instance":
        triggered = not rc.get("termination_protection", False)

    # ── Security Groups ───────────────────────────────────────────────────────
    elif rid == "AWS-SG-001" and resource.resource_type == "security_group":
        triggered = resource.ssh_open
    elif rid == "AWS-SG-002" and resource.resource_type == "security_group":
        triggered = resource.rdp_open
    elif rid == "AWS-SG-003" and resource.resource_type == "security_group":
        triggered = resource.all_traffic_open
    elif rid == "AWS-SG-004" and resource.resource_type == "security_group":
        triggered = rc.get("unrestricted_ports", False)
    elif rid == "AWS-SG-005" and resource.resource_type == "security_group":
        triggered = rc.get("is_default_sg", False) and (resource.ssh_open or resource.all_traffic_open)

    # ── EBS ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-EBS-001" and resource.resource_type == "ebs_volume":
        triggered = not resource.is_encrypted
    elif rid == "AWS-EBS-002" and resource.resource_type == "ebs_volume":
        triggered = rc.get("is_public_snapshot", False)
    elif rid == "AWS-EBS-003" and resource.resource_type == "ebs_volume":
        triggered = not rc.get("snapshot_encrypted", True)
    elif rid == "AWS-EBS-004" and resource.resource_type == "ebs_volume":
        triggered = not rc.get("delete_on_termination", True)

    # ── VPC ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-VPC-001" and resource.resource_type == "vpc":
        triggered = not resource.flow_logs
    elif rid == "AWS-VPC-002" and resource.resource_type == "vpc":
        triggered = rc.get("is_default", False)
    elif rid == "AWS-VPC-003" and resource.resource_type == "vpc":
        triggered = rc.get("peering_unrestricted_routes", False)
    elif rid == "AWS-VPC-004" and resource.resource_type == "vpc":
        triggered = rc.get("nacl_allows_all", False)
    elif rid == "AWS-VPC-005" and resource.resource_type == "vpc":
        triggered = rc.get("subnet_auto_assign_public_ip", False)

    # ── CloudTrail ────────────────────────────────────────────────────────────
    elif rid == "AWS-CT-001" and resource.resource_type == "cloudtrail":
        triggered = not resource.logging_enabled
    elif rid == "AWS-CT-002" and resource.resource_type == "cloudtrail":
        triggered = not resource.multi_region
    elif rid == "AWS-CT-003" and resource.resource_type == "cloudtrail":
        triggered = not rc.get("log_file_validation_enabled", False)
    elif rid == "AWS-CT-004" and resource.resource_type == "cloudtrail":
        triggered = rc.get("s3_bucket_public", False)
    elif rid == "AWS-CT-005" and resource.resource_type == "cloudtrail":
        triggered = not rc.get("cloudwatch_logs_enabled", False)
    elif rid == "AWS-CT-006" and resource.resource_type == "cloudtrail":
        triggered = not rc.get("kms_encrypted", False)
    elif rid == "AWS-CT-007" and resource.resource_type == "cloudtrail":
        triggered = not rc.get("s3_data_events_enabled", False)
    elif rid == "AWS-CT-008" and resource.resource_type == "cloudtrail":
        triggered = not rc.get("lambda_data_events_enabled", False)

    # ── CloudWatch ────────────────────────────────────────────────────────────
    # CloudWatch alarms are checked at the iam_summary level (account-wide)
    elif rid == "AWS-CW-001" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_root_usage", False)
    elif rid == "AWS-CW-002" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_iam_policy_changes", False)
    elif rid == "AWS-CW-003" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_cloudtrail_changes", False)
    elif rid == "AWS-CW-004" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_console_failures", False)
    elif rid == "AWS-CW-005" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_sg_changes", False)
    elif rid == "AWS-CW-006" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_vpc_changes", False)
    elif rid == "AWS-CW-007" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_unauthorized_api", False)
    elif rid == "AWS-CW-008" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_nacl_changes", False)
    elif rid == "AWS-CW-009" and resource.resource_type == "iam_summary":
        triggered = not rc.get("alarm_kms_deletion", False)
    elif rid == "AWS-CW-010" and resource.resource_type == "cloudtrail":
        triggered = not rc.get("log_group_kms_encrypted", False)
    elif rid == "AWS-CW-011" and resource.resource_type == "cloudtrail":
        ret = rc.get("log_group_retention_days", 0)
        triggered = ret is not None and ret < 365

    # ── RDS ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-RDS-001" and resource.resource_type == "rds_instance":
        triggered = resource.is_public
    elif rid == "AWS-RDS-002" and resource.resource_type == "rds_instance":
        triggered = not resource.is_encrypted
    elif rid == "AWS-RDS-003" and resource.resource_type == "rds_instance":
        triggered = not rc.get("AutoMinorVersionUpgrade", True)
    elif rid == "AWS-RDS-004" and resource.resource_type == "rds_instance":
        triggered = not rc.get("MultiAZ", False)
    elif rid == "AWS-RDS-005" and resource.resource_type == "rds_instance":
        bp = rc.get("BackupRetentionPeriod", 0)
        triggered = bp < 7
    elif rid == "AWS-RDS-006" and resource.resource_type == "rds_instance":
        triggered = rc.get("snapshot_public", False)
    elif rid == "AWS-RDS-007" and resource.resource_type == "rds_instance":
        triggered = not rc.get("DeletionProtection", False)
    elif rid == "AWS-RDS-008" and resource.resource_type == "rds_instance":
        triggered = not rc.get("force_ssl", False)
    elif rid == "AWS-RDS-009" and resource.resource_type == "rds_instance":
        triggered = not rc.get("IAMDatabaseAuthenticationEnabled", False)
    elif rid == "AWS-RDS-010" and resource.resource_type == "rds_instance":
        triggered = not rc.get("enhanced_monitoring_enabled", False)
    elif rid == "AWS-RDS-011" and resource.resource_type == "rds_instance":
        triggered = not rc.get("in_vpc", True)

    # ── KMS ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-KMS-001" and resource.resource_type == "kms_key":
        triggered = not rc.get("KeyRotationEnabled", False)
    elif rid == "AWS-KMS-002" and resource.resource_type == "kms_key":
        triggered = rc.get("key_policy_public", False)
    elif rid == "AWS-KMS-003" and resource.resource_type == "kms_key":
        triggered = rc.get("PendingDeletion", False)
    elif rid == "AWS-KMS-004" and resource.resource_type == "kms_key":
        triggered = rc.get("policy_uses_wildcard_principal", False)

    # ── Lambda ────────────────────────────────────────────────────────────────
    elif rid == "AWS-LAM-001" and resource.resource_type == "lambda_function":
        triggered = rc.get("function_url_public", False)
    elif rid == "AWS-LAM-002" and resource.resource_type == "lambda_function":
        triggered = not rc.get("dlq_configured", False)
    elif rid == "AWS-LAM-003" and resource.resource_type == "lambda_function":
        triggered = rc.get("runtime_deprecated", False)
    elif rid == "AWS-LAM-004" and resource.resource_type == "lambda_function":
        triggered = rc.get("has_admin_policy", False)
    elif rid == "AWS-LAM-005" and resource.resource_type == "lambda_function":
        triggered = not rc.get("in_vpc", False)
    elif rid == "AWS-LAM-006" and resource.resource_type == "lambda_function":
        triggered = rc.get("has_secrets_in_env", False)
    elif rid == "AWS-LAM-007" and resource.resource_type == "lambda_function":
        triggered = rc.get("reserved_concurrency", -1) == 0

    # ── CloudFront ────────────────────────────────────────────────────────────
    elif rid == "AWS-CF-001" and resource.resource_type == "cloudfront_distribution":
        triggered = not resource.https_only
    elif rid == "AWS-CF-002" and resource.resource_type == "cloudfront_distribution":
        triggered = not rc.get("waf_enabled", False)
    elif rid == "AWS-CF-003" and resource.resource_type == "cloudfront_distribution":
        triggered = not resource.logging_enabled
    elif rid == "AWS-CF-004" and resource.resource_type == "cloudfront_distribution":
        triggered = not rc.get("geo_restriction_enabled", False)

    # ── SNS ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-SNS-001" and resource.resource_type == "sns_topic":
        triggered = not resource.is_encrypted
    elif rid == "AWS-SNS-002" and resource.resource_type == "sns_topic":
        triggered = resource.is_public
    elif rid == "AWS-SNS-003" and resource.resource_type == "sns_topic":
        triggered = not rc.get("delivery_status_logging", False)

    # ── SQS ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-SQS-001" and resource.resource_type == "sqs_queue":
        triggered = not resource.is_encrypted
    elif rid == "AWS-SQS-002" and resource.resource_type == "sqs_queue":
        triggered = resource.is_public
    elif rid == "AWS-SQS-003" and resource.resource_type == "sqs_queue":
        triggered = not rc.get("dlq_configured", False)

    # ── EKS ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-EKS-001" and resource.resource_type == "eks_cluster":
        triggered = rc.get("endpoint_public_access", True) and not rc.get("endpoint_private_access", False)
    elif rid == "AWS-EKS-002" and resource.resource_type == "eks_cluster":
        triggered = not rc.get("secrets_encryption_enabled", False)
    elif rid == "AWS-EKS-003" and resource.resource_type == "eks_cluster":
        triggered = not resource.logging_enabled
    elif rid == "AWS-EKS-004" and resource.resource_type == "eks_cluster":
        triggered = rc.get("kubernetes_version_outdated", False)
    elif rid == "AWS-EKS-005" and resource.resource_type == "eks_cluster":
        triggered = not rc.get("node_volumes_encrypted", False)
    elif rid == "AWS-EKS-006" and resource.resource_type == "eks_cluster":
        triggered = not rc.get("secrets_encryption_enabled", False)
    elif rid == "AWS-EKS-007" and resource.resource_type == "eks_cluster":
        triggered = rc.get("endpoint_public_access", False) and not rc.get("public_access_cidrs_restricted", False)

    # ── ECR ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-ECR-001" and resource.resource_type == "ecr_repository":
        triggered = not rc.get("scan_on_push", False)
    elif rid == "AWS-ECR-002" and resource.resource_type == "ecr_repository":
        triggered = resource.is_public
    elif rid == "AWS-ECR-003" and resource.resource_type == "ecr_repository":
        triggered = rc.get("tag_mutability_mutable", False)

    # ── Secrets Manager ───────────────────────────────────────────────────────
    elif rid == "AWS-SM-001" and resource.resource_type == "secret":
        rot = rc.get("rotation_configured", False)
        days = rc.get("days_since_rotation", 0)
        triggered = not rot or (days is not None and days > 90)
    elif rid == "AWS-SM-002" and resource.resource_type == "secret":
        triggered = not rc.get("uses_cmk", False)
    elif rid == "AWS-SM-003" and resource.resource_type == "secret":
        last = rc.get("days_since_last_accessed")
        triggered = last is not None and last > 90

    # ── Config ────────────────────────────────────────────────────────────────
    elif rid == "AWS-CFG-001" and resource.resource_type == "config_recorder":
        triggered = not rc.get("recording", False)
    elif rid == "AWS-CFG-002" and resource.resource_type == "config_recorder":
        triggered = not rc.get("delivery_channel_configured", False)

    # ── GuardDuty ─────────────────────────────────────────────────────────────
    elif rid == "AWS-GD-001" and resource.resource_type == "guardduty_detector":
        triggered = not rc.get("detector_enabled", False)
    elif rid == "AWS-GD-002" and resource.resource_type == "guardduty_detector":
        triggered = not rc.get("s3_protection_enabled", False)
    elif rid == "AWS-GD-003" and resource.resource_type == "guardduty_detector":
        triggered = not rc.get("kubernetes_audit_logs_enabled", False)

    # ── ElastiCache ───────────────────────────────────────────────────────────
    elif rid == "AWS-ECA-001" and resource.resource_type == "elasticache_cluster":
        triggered = not rc.get("at_rest_encrypted", False)
    elif rid == "AWS-ECA-002" and resource.resource_type == "elasticache_cluster":
        triggered = not rc.get("in_transit_encrypted", False)
    elif rid == "AWS-ECA-003" and resource.resource_type == "elasticache_cluster":
        triggered = not rc.get("auth_token", False)
    elif rid == "AWS-ECA-004" and resource.resource_type == "elasticache_cluster":
        triggered = not rc.get("multi_az", False)
    elif rid == "AWS-ECA-005" and resource.resource_type == "elasticache_cluster":
        triggered = rc.get("version_outdated", False)
    elif rid == "AWS-ECA-006" and resource.resource_type == "elasticache_cluster":
        triggered = not rc.get("in_vpc", True)

    # ── DynamoDB ──────────────────────────────────────────────────────────────
    elif rid == "AWS-DDB-001" and resource.resource_type == "dynamodb_table":
        triggered = not rc.get("uses_cmk", False)
    elif rid == "AWS-DDB-002" and resource.resource_type == "dynamodb_table":
        triggered = not rc.get("pitr_enabled", False)
    elif rid == "AWS-DDB-003" and resource.resource_type == "dynamodb_table":
        triggered = not rc.get("deletion_protection", False)
    elif rid == "AWS-DDB-004" and resource.resource_type == "dynamodb_table":
        triggered = not rc.get("auto_scaling_enabled", False)
    elif rid == "AWS-DDB-005" and resource.resource_type == "dynamodb_table":
        triggered = not rc.get("ttl_enabled", False)

    # ── Load Balancers ────────────────────────────────────────────────────────
    elif rid == "AWS-ALB-001" and resource.resource_type == "load_balancer":
        triggered = not resource.logging_enabled
    elif rid == "AWS-ALB-002" and resource.resource_type == "load_balancer":
        triggered = not rc.get("deletion_protection", False)
    elif rid == "AWS-ALB-003" and resource.resource_type == "load_balancer":
        triggered = rc.get("lb_type", "") == "application" and not rc.get("waf_enabled", False)
    elif rid == "AWS-ALB-004" and resource.resource_type == "load_balancer":
        triggered = resource.is_public and not rc.get("https_listener", False)
    elif rid == "AWS-ALB-005" and resource.resource_type == "load_balancer":
        triggered = rc.get("lb_type", "") == "application" and not rc.get("drop_invalid_headers_enabled", False)
    elif rid == "AWS-ALB-006" and resource.resource_type == "load_balancer":
        triggered = rc.get("tls_version_outdated", False)
    elif rid == "AWS-ALB-007" and resource.resource_type == "load_balancer":
        triggered = rc.get("lb_type", "") == "classic"

    # ── API Gateway ───────────────────────────────────────────────────────────
    elif rid == "AWS-AGW-001" and resource.resource_type == "api_gateway":
        triggered = not resource.logging_enabled
    elif rid == "AWS-AGW-002" and resource.resource_type == "api_gateway":
        triggered = not rc.get("waf_enabled", False)
    elif rid == "AWS-AGW-003" and resource.resource_type == "api_gateway":
        triggered = not rc.get("tracing_enabled", False)
    elif rid == "AWS-AGW-004" and resource.resource_type == "api_gateway":
        triggered = not rc.get("client_cert_required", False)
    elif rid == "AWS-AGW-005" and resource.resource_type == "api_gateway":
        triggered = not rc.get("has_usage_plan", False)

    # ── Redshift ──────────────────────────────────────────────────────────────
    elif rid == "AWS-RS-001" and resource.resource_type == "redshift_cluster":
        triggered = resource.is_public
    elif rid == "AWS-RS-002" and resource.resource_type == "redshift_cluster":
        triggered = not resource.is_encrypted
    elif rid == "AWS-RS-003" and resource.resource_type == "redshift_cluster":
        triggered = not resource.logging_enabled
    elif rid == "AWS-RS-004" and resource.resource_type == "redshift_cluster":
        triggered = not rc.get("in_vpc", True)
    elif rid == "AWS-RS-005" and resource.resource_type == "redshift_cluster":
        triggered = not rc.get("ssl_required", False)
    elif rid == "AWS-RS-006" and resource.resource_type == "redshift_cluster":
        ret = rc.get("AutomatedSnapshotRetentionPeriod", 0)
        triggered = ret == 0
    elif rid == "AWS-RS-007" and resource.resource_type == "redshift_cluster":
        triggered = not rc.get("EnhancedVpcRouting", False)
    elif rid == "AWS-RS-008" and resource.resource_type == "redshift_cluster":
        master = rc.get("MasterUsername", "")
        triggered = master.lower() in ("awsuser", "admin", "administrator", "root")

    # ── ElasticSearch/OpenSearch ──────────────────────────────────────────────
    elif rid == "AWS-ES-001" and resource.resource_type == "elasticsearch_domain":
        triggered = not resource.is_encrypted
    elif rid == "AWS-ES-002" and resource.resource_type == "elasticsearch_domain":
        triggered = not rc.get("node_to_node_encryption_enabled", False)
    elif rid == "AWS-ES-003" and resource.resource_type == "elasticsearch_domain":
        triggered = not resource.https_only
    elif rid == "AWS-ES-004" and resource.resource_type == "elasticsearch_domain":
        triggered = resource.is_public
    elif rid == "AWS-ES-005" and resource.resource_type == "elasticsearch_domain":
        triggered = not resource.logging_enabled
    elif rid == "AWS-ES-006" and resource.resource_type == "elasticsearch_domain":
        triggered = not rc.get("fine_grained_access_enabled", False)
    elif rid == "AWS-ES-007" and resource.resource_type == "elasticsearch_domain":
        triggered = not rc.get("is_vpc", False)

    # ── WAF ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-WAF-001" and resource.resource_type == "waf_web_acl":
        triggered = not resource.logging_enabled
    elif rid == "AWS-WAF-002" and resource.resource_type == "waf_web_acl":
        triggered = not rc.get("has_rate_limit_rule", False)
    elif rid == "AWS-WAF-003" and resource.resource_type == "waf_web_acl":
        triggered = rc.get("default_action", "").upper() == "ALLOW"
    elif rid == "AWS-WAF-004" and resource.resource_type == "waf_web_acl":
        triggered = not rc.get("associated_resources", True)
    elif rid == "AWS-WAF-005" and resource.resource_type == "waf_web_acl":
        triggered = not rc.get("has_managed_rules", False)

    # ── Cognito ───────────────────────────────────────────────────────────────
    elif rid == "AWS-COG-001" and resource.resource_type == "cognito_user_pool":
        triggered = not resource.mfa_enabled
    elif rid == "AWS-COG-002" and resource.resource_type == "cognito_user_pool":
        triggered = not rc.get("advanced_security_enabled", False)
    elif rid == "AWS-COG-003" and resource.resource_type == "cognito_user_pool":
        ml = rc.get("password_min_length", 12)
        triggered = ml is not None and ml < 12
    elif rid == "AWS-COG-004" and resource.resource_type == "cognito_user_pool":
        tv = rc.get("temp_password_validity_days", 7)
        triggered = tv is not None and tv > 7
    elif rid == "AWS-COG-005" and resource.resource_type == "cognito_user_pool":
        triggered = rc.get("self_registration_enabled", False)
    elif rid == "AWS-COG-006" and resource.resource_type == "cognito_user_pool":
        triggered = not rc.get("deletion_protection_enabled", False)

    # ── SSM ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-SSM-001" and resource.resource_type == "ssm_parameter":
        # Only flag if it looks like a secret (name contains password/secret/key/token)
        name = resource.name.lower()
        is_sensitive = any(k in name for k in ("password", "secret", "key", "token", "credential", "api"))
        triggered = is_sensitive and not resource.is_encrypted
    elif rid == "AWS-SSM-002" and resource.resource_type == "ssm_parameter":
        triggered = resource.name == "SSM Account Settings" and not resource.logging_enabled
    elif rid == "AWS-SSM-004" and resource.resource_type == "ssm_parameter":
        triggered = rc.get("is_public_document", False)

    # ── ACM ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-ACM-001" and resource.resource_type == "acm_certificate":
        days = rc.get("DaysUntilExpiry")
        triggered = days is not None and 7 <= days <= 30
    elif rid == "AWS-ACM-002" and resource.resource_type == "acm_certificate":
        days = rc.get("DaysUntilExpiry")
        triggered = days is not None and days < 7
    elif rid == "AWS-ACM-003" and resource.resource_type == "acm_certificate":
        algo = rc.get("KeyAlgorithm", "")
        triggered = "RSA_1024" in algo or algo == "RSA-1024"
    elif rid == "AWS-ACM-004" and resource.resource_type == "acm_certificate":
        triggered = rc.get("RenewalEligibility", "") != "ELIGIBLE"

    # ── Route53 ───────────────────────────────────────────────────────────────
    elif rid == "AWS-R53-001" and resource.resource_type == "route53_zone":
        triggered = not rc.get("dnssec_enabled", False) and not rc.get("PrivateZone", False)
    elif rid == "AWS-R53-002" and resource.resource_type == "route53_zone":
        triggered = not resource.logging_enabled
    elif rid == "AWS-R53-003" and resource.resource_type == "route53_zone":
        triggered = not rc.get("transfer_lock_enabled", True)
    elif rid == "AWS-R53-004" and resource.resource_type == "route53_zone":
        triggered = not rc.get("privacy_protection_enabled", True)

    # ── ECS ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-ECS-001" and resource.resource_type == "ecs_task_definition":
        triggered = rc.get("has_privileged_containers", False)
    elif rid == "AWS-ECS-002" and resource.resource_type == "ecs_task_definition":
        triggered = rc.get("networkMode", "") == "host"
    elif rid == "AWS-ECS-003" and resource.resource_type == "ecs_task_definition":
        triggered = not rc.get("all_readonly_root_filesystems", False)
    elif rid == "AWS-ECS-004" and resource.resource_type == "ecs_task_definition":
        triggered = rc.get("has_secrets_in_env", False)
    elif rid == "AWS-ECS-005" and resource.resource_type == "ecs_task_definition":
        triggered = not rc.get("executionRoleArn", None)
    elif rid == "AWS-ECS-006" and resource.resource_type == "ecs_task_definition":
        triggered = not rc.get("container_insights_enabled", False)

    # ── MSK ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-MSK-001" and resource.resource_type == "msk_cluster":
        triggered = rc.get("client_broker_encryption", "PLAINTEXT") != "TLS"
    elif rid == "AWS-MSK-002" and resource.resource_type == "msk_cluster":
        triggered = not rc.get("encryption_at_rest_enabled", False)
    elif rid == "AWS-MSK-003" and resource.resource_type == "msk_cluster":
        triggered = rc.get("public_access_enabled", False)
    elif rid == "AWS-MSK-004" and resource.resource_type == "msk_cluster":
        triggered = not rc.get("cloudwatch_logging_enabled", False)

    # ── Kinesis ───────────────────────────────────────────────────────────────
    elif rid == "AWS-KIN-001" and resource.resource_type == "kinesis_stream":
        triggered = not resource.is_encrypted
    elif rid == "AWS-KIN-002" and resource.resource_type == "kinesis_stream":
        hours = rc.get("RetentionPeriodHours", 24)
        triggered = hours is not None and hours < 168
    elif rid == "AWS-KIN-003" and resource.resource_type == "kinesis_stream":
        triggered = not rc.get("enhanced_monitoring_enabled", False)
    elif rid == "AWS-KIN-004" and resource.resource_type == "kinesis_stream":
        triggered = rc.get("stream_type", "") == "video" and not resource.is_encrypted

    # ── SES ───────────────────────────────────────────────────────────────────
    elif rid == "AWS-SES-001" and resource.resource_type == "ses_identity":
        triggered = not rc.get("dkim_enabled", False)
    elif rid == "AWS-SES-002" and resource.resource_type == "ses_identity":
        triggered = rc.get("verification_status", "") != "Success"
    elif rid == "AWS-SES-003" and resource.resource_type == "ses_identity":
        triggered = rc.get("in_sandbox", False)

    # ── Macie ─────────────────────────────────────────────────────────────────
    elif rid == "AWS-MAC-001" and resource.resource_type == "macie_status":
        triggered = rc.get("status", "") not in ("ENABLED",)
    elif rid == "AWS-MAC-002" and resource.resource_type == "macie_status":
        triggered = rc.get("status", "") == "ENABLED" and not rc.get("automated_discovery_enabled", False)

    # ── Inspector ─────────────────────────────────────────────────────────────
    elif rid == "AWS-INS-001" and resource.resource_type == "inspector_status":
        triggered = not rc.get("ec2_enabled", False) and not rc.get("enabled", False)
    elif rid == "AWS-INS-002" and resource.resource_type == "inspector_status":
        triggered = not rc.get("ecr_enabled", False)
    elif rid == "AWS-INS-003" and resource.resource_type == "inspector_status":
        triggered = not rc.get("lambda_enabled", False)

    # ── Backup ────────────────────────────────────────────────────────────────
    elif rid == "AWS-BCK-001" and resource.resource_type == "backup_vault":
        triggered = rc.get("no_backup_plan", False)
    elif rid == "AWS-BCK-002" and resource.resource_type == "backup_vault":
        triggered = not rc.get("kms_encrypted", False)
    elif rid == "AWS-BCK-003" and resource.resource_type == "backup_vault":
        triggered = not rc.get("cross_region_copy_enabled", False)

    if not triggered:
        return None

    return Finding(
        rule_id=rule["rule_id"],
        resource_id=resource.resource_id,
        resource_name=resource.name,
        severity=rule["severity"],
        message=rule["message"],
        remediation=rule["remediation"],
        cloud="aws",
        service=rule["service"],
        frameworks=rule["frameworks"],
        is_custom=False,
    )
