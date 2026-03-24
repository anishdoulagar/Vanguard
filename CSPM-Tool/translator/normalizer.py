"""
Cloud Resource Normalizer
The Translation Problem — unified schema for AWS and Azure resources.

Both clouds produce different raw API responses. This module defines:
  - CloudResource: canonical representation of any cloud resource
  - Finding:       a security issue found on a resource
  - normalize_all: converts raw AWS + Azure data into CloudResource objects
"""

from dataclasses import dataclass, field
from typing import Optional, List, Any


@dataclass
class Finding:
    """A security finding raised by a policy rule against a CloudResource."""
    rule_id:       str
    resource_id:   str
    resource_name: str
    severity:      str           # CRITICAL | HIGH | MEDIUM | LOW
    message:       str
    remediation:   str
    cloud:         str           # aws | azure
    service:       str           # S3, EC2, Key Vault, etc.
    frameworks:    List[str]     # ["CIS-1.5", "NIST-AC-2", ...]
    is_custom:     bool  = False # True if user-defined rule
    status:        str   = "open"  # open | acknowledged | resolved


@dataclass
class CloudResource:
    """
    Unified representation of any cloud resource across AWS and Azure.
    All provider-specific raw data is stored in raw_config for reference.
    """

    # ── Core Identity ──────────────────────────────────────────────────────
    resource_id:    str
    name:           str
    cloud:          str           # "aws" | "azure"
    resource_type:  str           # e.g. "s3_bucket", "storage_account"
    region:         str

    # ── Network Exposure ──────────────────────────────────────────────────
    is_public:      bool = False
    https_only:     bool = True
    ssh_open:       bool = False
    rdp_open:       bool = False
    all_traffic_open: bool = False

    # ── Encryption ────────────────────────────────────────────────────────
    is_encrypted:   bool = True
    tls_12_enforced: bool = True
    tde_enabled:    bool = True    # Azure SQL

    # ── Identity & Access ─────────────────────────────────────────────────
    mfa_enabled:    bool = True
    imdsv2:         bool = True    # AWS EC2

    # ── Data Protection ───────────────────────────────────────────────────
    versioning:     bool = False
    multi_region:   bool = False
    soft_delete:    bool = False   # Azure Key Vault / Storage
    purge_protection: bool = False # Azure Key Vault

    # ── Logging & Observability ───────────────────────────────────────────
    logging_enabled: bool = False
    flow_logs:       bool = False
    auditing_enabled: bool = False

    # ── IAM Password Policy (AWS) ─────────────────────────────────────────
    password_policy_exists:  bool = True
    password_min_length:     Optional[int] = None
    password_require_upper:  bool = True
    password_require_lower:  bool = True
    password_require_number: bool = True
    password_require_symbol: bool = True
    password_max_age:        Optional[int] = None
    password_reuse_count:    Optional[int] = None
    root_access_keys:        bool = False

    # ── User / IAM fields ─────────────────────────────────────────────────
    console_access:          bool = False
    access_key_age_days:     Optional[int] = None

    # ── Outputs ───────────────────────────────────────────────────────────
    findings:       List[Any] = field(default_factory=list)
    risk_score:     int       = 100
    raw_config:     dict      = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Normalization entry point
# ─────────────────────────────────────────────────────────────────────────────

def normalize_all(aws_raw: dict, azure_raw: dict) -> List[CloudResource]:
    """
    Convert raw AWS and Azure API results into a unified list of CloudResource objects.

    Args:
        aws_raw:   Output from aws_connector.collect_all()
        azure_raw: Output from azure_connector.collect_all()

    Returns:
        List of CloudResource objects ready for policy evaluation.
    """
    resources = []

    if aws_raw:
        resources.extend(_normalize_aws(aws_raw))

    if azure_raw:
        resources.extend(_normalize_azure(azure_raw))

    return resources


# ─────────────────────────────────────────────────────────────────────────────
# AWS Normalizers
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_aws(raw: dict) -> List[CloudResource]:
    resources = []
    region = raw.get("region", "us-east-1")

    # IAM Summary
    iam = raw.get("iam_summary", {})
    if iam:
        resources.append(CloudResource(
            resource_id=   "iam::root",
            name=          "IAM Account Summary",
            cloud=         "aws",
            resource_type= "iam_summary",
            region=        "global",
            mfa_enabled=   iam.get("AccountMFAEnabled", False),
            root_access_keys= iam.get("AccountAccessKeysPresent", 0) > 0,
            password_policy_exists=  iam.get("password_policy_exists", True),
            password_min_length=     iam.get("MinimumPasswordLength"),
            password_require_upper=  iam.get("RequireUppercaseCharacters", True),
            password_require_lower=  iam.get("RequireLowercaseCharacters", True),
            password_require_number= iam.get("RequireNumbers", True),
            password_require_symbol= iam.get("RequireSymbols", True),
            password_max_age=        iam.get("MaxPasswordAge"),
            password_reuse_count=    iam.get("PasswordReusePrevention"),
            raw_config=    iam,
        ))

    # IAM Users
    for user in raw.get("iam_users", []):
        resources.append(CloudResource(
            resource_id=       f"iam::user::{user.get('UserName')}",
            name=              user.get("UserName", "unknown"),
            cloud=             "aws",
            resource_type=     "iam_user",
            region=            "global",
            mfa_enabled=       user.get("mfa_enabled", True),
            console_access=    user.get("console_access", False),
            access_key_age_days= user.get("access_key_age_days"),
            raw_config=        user,
        ))

    # S3 Buckets
    for bucket in raw.get("s3_buckets", []):
        resources.append(CloudResource(
            resource_id=    f"s3:::{bucket.get('Name')}",
            name=           bucket.get("Name", "unknown"),
            cloud=          "aws",
            resource_type=  "s3_bucket",
            region=         bucket.get("region", "us-east-1"),
            is_public=      bucket.get("is_public", False),
            is_encrypted=   bucket.get("is_encrypted", True),
            versioning=     bucket.get("versioning", False),
            logging_enabled= bucket.get("logging_enabled", False),
            https_only=     bucket.get("https_only", True),
            raw_config=     bucket,
        ))

    # EC2 Instances
    for instance in raw.get("ec2_instances", []):
        resources.append(CloudResource(
            resource_id=    instance.get("InstanceId", "unknown"),
            name=           _get_tag(instance, "Name") or instance.get("InstanceId", "unknown"),
            cloud=          "aws",
            resource_type=  "ec2_instance",
            region=         region,
            is_public=      instance.get("PublicIpAddress") is not None,
            imdsv2=         instance.get("imdsv2", False),
            raw_config=     instance,
        ))

    # Security Groups
    for sg in raw.get("security_groups", []):
        resources.append(CloudResource(
            resource_id=    sg.get("GroupId", "unknown"),
            name=           sg.get("GroupName", "unknown"),
            cloud=          "aws",
            resource_type=  "security_group",
            region=         region,
            ssh_open=       sg.get("ssh_open", False),
            rdp_open=       sg.get("rdp_open", False),
            all_traffic_open= sg.get("all_traffic_open", False),
            raw_config=     sg,
        ))

    # EBS Volumes
    for vol in raw.get("ebs_volumes", []):
        resources.append(CloudResource(
            resource_id=    vol.get("VolumeId", "unknown"),
            name=           _get_tag(vol, "Name") or vol.get("VolumeId", "unknown"),
            cloud=          "aws",
            resource_type=  "ebs_volume",
            region=         region,
            is_encrypted=   vol.get("Encrypted", False),
            raw_config=     vol,
        ))

    # VPCs
    for vpc in raw.get("vpcs", []):
        resources.append(CloudResource(
            resource_id=    vpc.get("VpcId", "unknown"),
            name=           _get_tag(vpc, "Name") or vpc.get("VpcId", "unknown"),
            cloud=          "aws",
            resource_type=  "vpc",
            region=         region,
            flow_logs=      vpc.get("flow_logs", False),
            raw_config=     vpc,
        ))

    # CloudTrail
    for trail in raw.get("cloudtrails", []):
        resources.append(CloudResource(
            resource_id=    trail.get("TrailARN", "unknown"),
            name=           trail.get("Name", "unknown"),
            cloud=          "aws",
            resource_type=  "cloudtrail",
            region=         region,
            logging_enabled= trail.get("IsLogging", False),
            multi_region=   trail.get("IsMultiRegionTrail", False),
            raw_config=     trail,
        ))

    # RDS Instances
    for db in raw.get("rds_instances", []):
        resources.append(CloudResource(
            resource_id=    db.get("DBInstanceArn", db.get("DBInstanceIdentifier", "unknown")),
            name=           db.get("DBInstanceIdentifier", "unknown"),
            cloud=          "aws",
            resource_type=  "rds_instance",
            region=         region,
            is_public=      db.get("PubliclyAccessible", False),
            is_encrypted=   db.get("StorageEncrypted", False),
            raw_config=     db,
        ))

    # IAM Roles
    for role in raw.get("iam_roles", []):
        resources.append(CloudResource(
            resource_id=    role.get("RoleId", role.get("RoleName", "unknown")),
            name=           role.get("RoleName", "unknown"),
            cloud=          "aws",
            resource_type=  "iam_role",
            region=         "global",
            raw_config=     role,
        ))

    # Lambda Functions
    for fn in raw.get("lambda_functions", []):
        resources.append(CloudResource(
            resource_id=    fn.get("FunctionArn", fn.get("FunctionName", "unknown")),
            name=           fn.get("FunctionName", "unknown"),
            cloud=          "aws",
            resource_type=  "lambda_function",
            region=         region,
            raw_config=     fn,
        ))

    # CloudFront Distributions
    for dist in raw.get("cloudfront_dists", []):
        resources.append(CloudResource(
            resource_id=    dist.get("Id", "unknown"),
            name=           dist.get("DomainName", dist.get("Id", "unknown")),
            cloud=          "aws",
            resource_type=  "cloudfront_distribution",
            region=         "global",
            https_only=     dist.get("https_only", True),
            logging_enabled= dist.get("logging_enabled", False),
            raw_config=     dist,
        ))

    # KMS Keys
    for key in raw.get("kms_keys", []):
        resources.append(CloudResource(
            resource_id=    key.get("KeyId", "unknown"),
            name=           key.get("KeyId", "unknown"),
            cloud=          "aws",
            resource_type=  "kms_key",
            region=         region,
            raw_config=     key,
        ))

    # SNS Topics
    for topic in raw.get("sns_topics", []):
        resources.append(CloudResource(
            resource_id=    topic.get("TopicArn", "unknown"),
            name=           topic.get("name", topic.get("TopicArn", "unknown").split(":")[-1]),
            cloud=          "aws",
            resource_type=  "sns_topic",
            region=         region,
            is_encrypted=   topic.get("is_encrypted", False),
            is_public=      topic.get("is_public", False),
            raw_config=     topic,
        ))

    # SQS Queues
    for queue in raw.get("sqs_queues", []):
        resources.append(CloudResource(
            resource_id=    queue.get("QueueArn", queue.get("QueueUrl", "unknown")),
            name=           queue.get("name", queue.get("QueueUrl", "unknown").split("/")[-1]),
            cloud=          "aws",
            resource_type=  "sqs_queue",
            region=         region,
            is_encrypted=   queue.get("is_encrypted", False),
            is_public=      queue.get("is_public", False),
            raw_config=     queue,
        ))

    # EKS Clusters
    for cluster in raw.get("eks_clusters", []):
        resources.append(CloudResource(
            resource_id=    cluster.get("arn", cluster.get("name", "unknown")),
            name=           cluster.get("name", "unknown"),
            cloud=          "aws",
            resource_type=  "eks_cluster",
            region=         region,
            logging_enabled= cluster.get("logging_enabled", False),
            raw_config=     cluster,
        ))

    # ECR Repositories
    for repo in raw.get("ecr_repositories", []):
        resources.append(CloudResource(
            resource_id=    repo.get("repositoryArn", repo.get("repositoryName", "unknown")),
            name=           repo.get("repositoryName", "unknown"),
            cloud=          "aws",
            resource_type=  "ecr_repository",
            region=         region,
            is_encrypted=   repo.get("is_encrypted", False),
            is_public=      repo.get("is_public", False),
            raw_config=     repo,
        ))

    # Secrets Manager
    for secret in raw.get("secrets", []):
        resources.append(CloudResource(
            resource_id=    secret.get("ARN", secret.get("Name", "unknown")),
            name=           secret.get("Name", "unknown"),
            cloud=          "aws",
            resource_type=  "secret",
            region=         region,
            raw_config=     secret,
        ))

    # AWS Config
    for recorder in raw.get("config_recorders", []):
        resources.append(CloudResource(
            resource_id=    f"config::{recorder.get('name', 'default')}",
            name=           recorder.get("name", "Config Recorder"),
            cloud=          "aws",
            resource_type=  "config_recorder",
            region=         region,
            raw_config=     recorder,
        ))

    # GuardDuty
    for det in raw.get("guardduty_detectors", []):
        resources.append(CloudResource(
            resource_id=    f"guardduty::{det.get('DetectorId', 'none')}",
            name=           "GuardDuty Detector",
            cloud=          "aws",
            resource_type=  "guardduty_detector",
            region=         region,
            raw_config=     det,
        ))

    # ElastiCache
    for cluster in raw.get("elasticache_clusters", []):
        resources.append(CloudResource(
            resource_id=    cluster.get("CacheClusterArn", cluster.get("CacheClusterId", "unknown")),
            name=           cluster.get("CacheClusterId", "unknown"),
            cloud=          "aws",
            resource_type=  "elasticache_cluster",
            region=         region,
            is_encrypted=   cluster.get("at_rest_encrypted", False),
            raw_config=     cluster,
        ))

    # DynamoDB
    for table in raw.get("dynamodb_tables", []):
        resources.append(CloudResource(
            resource_id=    table.get("TableArn", table.get("TableName", "unknown")),
            name=           table.get("TableName", "unknown"),
            cloud=          "aws",
            resource_type=  "dynamodb_table",
            region=         region,
            is_encrypted=   table.get("is_encrypted", False),
            raw_config=     table,
        ))

    # Load Balancers
    for lb in raw.get("load_balancers", []):
        resources.append(CloudResource(
            resource_id=    lb.get("LoadBalancerArn", "unknown"),
            name=           lb.get("LoadBalancerName", "unknown"),
            cloud=          "aws",
            resource_type=  "load_balancer",
            region=         region,
            is_public=      lb.get("is_internet_facing", False),
            logging_enabled= lb.get("access_logs_enabled", False),
            raw_config=     lb,
        ))

    # API Gateways
    for api in raw.get("api_gateways", []):
        resources.append(CloudResource(
            resource_id=    f"apigateway::{api.get('id', 'unknown')}",
            name=           api.get("name", "unknown"),
            cloud=          "aws",
            resource_type=  "api_gateway",
            region=         region,
            logging_enabled= api.get("logging_enabled", False),
            raw_config=     api,
        ))

    # ── New Services ──────────────────────────────────────────────────────────

    # Redshift Clusters
    for cluster in raw.get("redshift_clusters", []):
        resources.append(CloudResource(
            resource_id=    cluster.get("ClusterNamespaceArn",
                            f"redshift::{cluster.get('ClusterIdentifier', 'unknown')}"),
            name=           cluster.get("ClusterIdentifier", "unknown"),
            cloud=          "aws",
            resource_type=  "redshift_cluster",
            region=         region,
            is_public=      cluster.get("publicly_accessible", False),
            is_encrypted=   cluster.get("is_encrypted", False),
            logging_enabled= cluster.get("audit_logging_enabled", False),
            raw_config=     cluster,
        ))

    # ElasticSearch / OpenSearch Domains
    for domain in raw.get("elasticsearch_domains", []):
        resources.append(CloudResource(
            resource_id=    domain.get("ARN", f"es::{domain.get('DomainName', 'unknown')}"),
            name=           domain.get("DomainName", "unknown"),
            cloud=          "aws",
            resource_type=  "elasticsearch_domain",
            region=         region,
            is_public=      domain.get("is_public", False),
            is_encrypted=   domain.get("encryption_at_rest_enabled", False),
            https_only=     domain.get("enforce_https", False),
            logging_enabled= domain.get("audit_logs_enabled", False),
            raw_config=     domain,
        ))

    # WAF Web ACLs
    for acl in raw.get("waf_web_acls", []):
        resources.append(CloudResource(
            resource_id=    acl.get("ARN", f"waf::{acl.get('Name', 'unknown')}"),
            name=           acl.get("Name", "unknown"),
            cloud=          "aws",
            resource_type=  "waf_web_acl",
            region=         region if acl.get("scope") == "REGIONAL" else "global",
            logging_enabled= acl.get("logging_enabled", False),
            raw_config=     acl,
        ))

    # Cognito User Pools
    for pool in raw.get("cognito_user_pools", []):
        resources.append(CloudResource(
            resource_id=    pool.get("Arn", f"cognito::{pool.get('Id', 'unknown')}"),
            name=           pool.get("Name", "unknown"),
            cloud=          "aws",
            resource_type=  "cognito_user_pool",
            region=         region,
            mfa_enabled=    pool.get("mfa_enabled", False),
            raw_config=     pool,
        ))

    # SSM Parameters
    for param in raw.get("ssm_parameters", []):
        # Skip the synthetic metadata entry
        if param.get("Name") == "__meta__":
            # Still emit a synthetic resource for account-level SSM checks
            meta = param.get("_account_meta", {})
            resources.append(CloudResource(
                resource_id=    "ssm::account-settings",
                name=           "SSM Account Settings",
                cloud=          "aws",
                resource_type=  "ssm_parameter",
                region=         region,
                logging_enabled= meta.get("_session_manager_logging", False),
                raw_config=     param,
            ))
            continue
        resources.append(CloudResource(
            resource_id=    f"ssm::parameter::{param.get('Name', 'unknown')}",
            name=           param.get("Name", "unknown"),
            cloud=          "aws",
            resource_type=  "ssm_parameter",
            region=         region,
            is_encrypted=   param.get("is_secure", False),
            raw_config=     param,
        ))

    # ACM Certificates
    for cert in raw.get("acm_certificates", []):
        resources.append(CloudResource(
            resource_id=    cert.get("CertificateArn", "unknown"),
            name=           cert.get("DomainName", cert.get("CertificateArn", "unknown")),
            cloud=          "aws",
            resource_type=  "acm_certificate",
            region=         region,
            raw_config=     cert,
        ))

    # Route53 Hosted Zones
    for zone in raw.get("route53_zones", []):
        resources.append(CloudResource(
            resource_id=    f"route53::{zone.get('ZoneId', 'unknown')}",
            name=           zone.get("Name", zone.get("ZoneId", "unknown")),
            cloud=          "aws",
            resource_type=  "route53_zone",
            region=         "global",
            logging_enabled= zone.get("query_logging_enabled", False),
            raw_config=     zone,
        ))

    # ECS Task Definitions
    for td in raw.get("ecs_task_definitions", []):
        resources.append(CloudResource(
            resource_id=    td.get("taskDefinitionArn", f"ecs::task-def::{td.get('family', 'unknown')}"),
            name=           td.get("family", "unknown"),
            cloud=          "aws",
            resource_type=  "ecs_task_definition",
            region=         region,
            raw_config=     td,
        ))

    # Kinesis Streams
    for stream in raw.get("kinesis_streams", []):
        resources.append(CloudResource(
            resource_id=    stream.get("StreamARN", f"kinesis::{stream.get('StreamName', 'unknown')}"),
            name=           stream.get("StreamName", "unknown"),
            cloud=          "aws",
            resource_type=  "kinesis_stream",
            region=         region,
            is_encrypted=   stream.get("is_encrypted", False),
            raw_config=     stream,
        ))

    # SES Identities
    for identity in raw.get("ses_identities", []):
        resources.append(CloudResource(
            resource_id=    f"ses::identity::{identity.get('Identity', 'unknown')}",
            name=           identity.get("Identity", "unknown"),
            cloud=          "aws",
            resource_type=  "ses_identity",
            region=         region,
            raw_config=     identity,
        ))

    # Macie — single account-level resource
    macie = raw.get("macie_status", {})
    if macie:
        resources.append(CloudResource(
            resource_id=    "macie::account",
            name=           "Amazon Macie",
            cloud=          "aws",
            resource_type=  "macie_status",
            region=         region,
            raw_config=     macie,
        ))

    # Inspector — single account-level resource
    inspector = raw.get("inspector_status", {})
    if inspector:
        resources.append(CloudResource(
            resource_id=    "inspector2::account",
            name=           "Amazon Inspector v2",
            cloud=          "aws",
            resource_type=  "inspector_status",
            region=         region,
            raw_config=     inspector,
        ))

    return resources


# ─────────────────────────────────────────────────────────────────────────────
# Azure Normalizers
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_azure(raw: dict) -> List[CloudResource]:
    resources = []

    # Storage Accounts
    for sa in raw.get("storage_accounts", []):
        resources.append(CloudResource(
            resource_id=     sa.get("id", "unknown"),
            name=            sa.get("name", "unknown"),
            cloud=           "azure",
            resource_type=   "storage_account",
            region=          sa.get("location", "unknown"),
            is_public=       sa.get("allow_blob_public_access", False),
            https_only=      sa.get("enable_https_traffic_only", True),
            is_encrypted=    sa.get("is_encrypted", True),
            tls_12_enforced= sa.get("minimum_tls_version") == "TLS1_2",
            logging_enabled= sa.get("logging_enabled", False),
            soft_delete=     sa.get("blob_soft_delete_enabled", False),
            raw_config=      sa,
        ))

    # Virtual Machines
    for vm in raw.get("virtual_machines", []):
        resources.append(CloudResource(
            resource_id=    vm.get("id", "unknown"),
            name=           vm.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "virtual_machine",
            region=         vm.get("location", "unknown"),
            is_encrypted=   vm.get("disk_encryption_enabled", False),
            raw_config=     vm,
        ))

    # Network Security Groups
    for nsg in raw.get("network_security_groups", []):
        resources.append(CloudResource(
            resource_id=    nsg.get("id", "unknown"),
            name=           nsg.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "network_security_group",
            region=         nsg.get("location", "unknown"),
            rdp_open=       nsg.get("rdp_open", False),
            ssh_open=       nsg.get("ssh_open", False),
            flow_logs=      nsg.get("flow_logs_enabled", False),
            raw_config=     nsg,
        ))

    # Key Vaults
    for kv in raw.get("key_vaults", []):
        resources.append(CloudResource(
            resource_id=     kv.get("id", "unknown"),
            name=            kv.get("name", "unknown"),
            cloud=           "azure",
            resource_type=   "key_vault",
            region=          kv.get("location", "unknown"),
            soft_delete=     kv.get("soft_delete_enabled", False),
            purge_protection= kv.get("purge_protection_enabled", False),
            is_public=       not kv.get("network_acls_default_deny", False),
            raw_config=      kv,
        ))

    # SQL Servers
    for sql in raw.get("sql_servers", []):
        resources.append(CloudResource(
            resource_id=     sql.get("id", "unknown"),
            name=            sql.get("name", "unknown"),
            cloud=           "azure",
            resource_type=   "sql_server",
            region=          sql.get("location", "unknown"),
            tde_enabled=     sql.get("tde_enabled", False),
            auditing_enabled= sql.get("auditing_enabled", False),
            is_public=       sql.get("public_network_access", "Enabled") == "Enabled",
            raw_config=      sql,
        ))

    # App Services
    for app in raw.get("app_services", []):
        resources.append(CloudResource(
            resource_id=    app.get("id", "unknown"),
            name=           app.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "app_service",
            region=         app.get("location", "unknown"),
            https_only=     app.get("https_only", False),
            raw_config=     app,
        ))

    # AKS Clusters
    for cluster in raw.get("aks_clusters", []):
        resources.append(CloudResource(
            resource_id=    cluster.get("id", "unknown"),
            name=           cluster.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "aks_cluster",
            region=         cluster.get("location", "unknown"),
            raw_config=     cluster,
        ))

    # Container Registries
    for reg in raw.get("container_registries", []):
        resources.append(CloudResource(
            resource_id=    reg.get("id", "unknown"),
            name=           reg.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "container_registry",
            region=         reg.get("location", "unknown"),
            raw_config=     reg,
        ))

    # Cosmos DB
    for acc in raw.get("cosmos_accounts", []):
        resources.append(CloudResource(
            resource_id=    acc.get("id", "unknown"),
            name=           acc.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "cosmos_account",
            region=         acc.get("location", "unknown"),
            is_public=      acc.get("public_network_access", "Enabled") == "Enabled",
            raw_config=     acc,
        ))

    # Redis Cache
    for cache in raw.get("redis_caches", []):
        resources.append(CloudResource(
            resource_id=    cache.get("id", "unknown"),
            name=           cache.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "redis_cache",
            region=         cache.get("location", "unknown"),
            raw_config=     cache,
        ))

    # PostgreSQL
    for sv in raw.get("postgresql_servers", []):
        resources.append(CloudResource(
            resource_id=    sv.get("id", "unknown"),
            name=           sv.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "postgresql_server",
            region=         sv.get("location", "unknown"),
            raw_config=     sv,
        ))

    # MySQL
    for sv in raw.get("mysql_servers", []):
        resources.append(CloudResource(
            resource_id=    sv.get("id", "unknown"),
            name=           sv.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "mysql_server",
            region=         sv.get("location", "unknown"),
            raw_config=     sv,
        ))

    # Event Hub Namespaces
    for ns in raw.get("event_hub_namespaces", []):
        resources.append(CloudResource(
            resource_id=    ns.get("id", "unknown"),
            name=           ns.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "event_hub_namespace",
            region=         ns.get("location", "unknown"),
            is_public=      str(ns.get("public_network_access", "Enabled")) == "Enabled",
            raw_config=     ns,
        ))

    # Service Bus Namespaces
    for ns in raw.get("service_bus_namespaces", []):
        resources.append(CloudResource(
            resource_id=    ns.get("id", "unknown"),
            name=           ns.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "service_bus_namespace",
            region=         ns.get("location", "unknown"),
            is_public=      str(ns.get("public_network_access", "Enabled")) == "Enabled",
            raw_config=     ns,
        ))

    # Network Watchers
    for watcher in raw.get("network_watchers", []):
        resources.append(CloudResource(
            resource_id=    watcher.get("id", "unknown"),
            name=           watcher.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "network_watcher",
            region=         watcher.get("location", "unknown"),
            flow_logs=      watcher.get("flow_logs_enabled", False),
            raw_config=     watcher,
        ))

    # Application Gateways
    for gw in raw.get("application_gateways", []):
        resources.append(CloudResource(
            resource_id=    gw.get("id", "unknown"),
            name=           gw.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "application_gateway",
            region=         gw.get("location", "unknown"),
            raw_config=     gw,
        ))

    # Log Analytics Workspaces
    for ws in raw.get("log_analytics_workspaces", []):
        resources.append(CloudResource(
            resource_id=    ws.get("id", "unknown"),
            name=           ws.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "log_analytics_workspace",
            region=         ws.get("location", "unknown"),
            raw_config=     ws,
        ))

    # Logic Apps
    for wf in raw.get("logic_apps", []):
        resources.append(CloudResource(
            resource_id=    wf.get("id", "unknown"),
            name=           wf.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "logic_app",
            region=         wf.get("location", "unknown"),
            raw_config=     wf,
        ))

    # Defender Plans — individual plan entries as separate resources
    for plan in raw.get("defender_plans", []):
        resources.append(CloudResource(
            resource_id=    plan.get("id", "unknown"),
            name=           plan.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "defender_plan",
            region=         "global",
            raw_config=     plan,
        ))

    # Activity Log Alerts — consolidated into single resource
    alerts = raw.get("activity_log_alerts", [])
    resources.append(CloudResource(
        resource_id=    "azure::activity-log-alerts",
        name=           "Activity Log Alerts",
        cloud=          "azure",
        resource_type=  "activity_log_alerts",
        region=         "global",
        raw_config=     {"alerts": alerts, "count": len(alerts)},
    ))

    # Security Center
    sc_resources = raw.get("security_center", [])
    if sc_resources:
        resources.append(CloudResource(
            resource_id=    "azure::security-center",
            name=           "Microsoft Defender for Cloud",
            cloud=          "azure",
            resource_type=  "security_center",
            region=         "global",
            raw_config=     {"pricings": sc_resources},
        ))

    # Public IPs
    for ip in raw.get("public_ips", []):
        resources.append(CloudResource(
            resource_id=    ip.get("id", "unknown"),
            name=           ip.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "public_ip",
            region=         ip.get("location", "unknown"),
            raw_config=     ip,
        ))

    # Load Balancers
    for lb in raw.get("load_balancers", []):
        resources.append(CloudResource(
            resource_id=    lb.get("id", "unknown"),
            name=           lb.get("name", "unknown"),
            cloud=          "azure",
            resource_type=  "azure_load_balancer",
            region=         lb.get("location", "unknown"),
            raw_config=     lb,
        ))

    return resources


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_tag(resource: dict, key: str) -> Optional[str]:
    """Extract a tag value from an AWS resource's Tags list."""
    tags = resource.get("Tags", [])
    for tag in tags:
        if tag.get("Key") == key:
            return tag.get("Value")
    return None
