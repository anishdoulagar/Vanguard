"""
AWS Connector
Collects raw configuration data from AWS services using boto3.
Credentials are passed in at runtime — never stored to disk.
"""

import json
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, EndpointConnectionError
from datetime import datetime, timezone


class AWSConnector:
    def __init__(self, aws_access_key_id: str, aws_secret_access_key: str,
                 region_name: str = "us-east-1"):
        self.access_key    = aws_access_key_id
        self.secret_key    = aws_secret_access_key
        self.region        = region_name
        self._session      = None

    def _get_session(self):
        if not self._session:
            self._session = boto3.Session(
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
            )
        return self._session

    def _client(self, service: str):
        return self._get_session().client(service, region_name=self.region)

    def test_connection(self):
        """Verify credentials by calling STS GetCallerIdentity."""
        try:
            sts = self._client("sts")
            identity = sts.get_caller_identity()
            return identity.get("Account")
        except (NoCredentialsError, ClientError, EndpointConnectionError) as e:
            raise ConnectionError(f"AWS authentication failed: {e}")

    def collect_all(self) -> dict:
        """Collect all resource data. Returns raw dict of lists."""
        return {
            "region":                self.region,
            "iam_summary":           self._collect_iam_summary(),
            "iam_users":             self._collect_iam_users(),
            "iam_roles":             self._collect_iam_roles(),
            "s3_buckets":            self._collect_s3_buckets(),
            "ec2_instances":         self._collect_ec2_instances(),
            "security_groups":       self._collect_security_groups(),
            "ebs_volumes":           self._collect_ebs_volumes(),
            "vpcs":                  self._collect_vpcs(),
            "cloudtrails":           self._collect_cloudtrails(),
            "rds_instances":         self._collect_rds_instances(),
            "lambda_functions":      self._collect_lambda_functions(),
            "cloudfront_dists":      self._collect_cloudfront(),
            "kms_keys":              self._collect_kms_keys(),
            "sns_topics":            self._collect_sns_topics(),
            "sqs_queues":            self._collect_sqs_queues(),
            "eks_clusters":          self._collect_eks_clusters(),
            "ecr_repositories":      self._collect_ecr_repositories(),
            "secrets":               self._collect_secrets_manager(),
            "config_recorders":      self._collect_config(),
            "guardduty_detectors":   self._collect_guardduty(),
            "elasticache_clusters":  self._collect_elasticache(),
            "dynamodb_tables":       self._collect_dynamodb(),
            "load_balancers":        self._collect_load_balancers(),
            "api_gateways":          self._collect_api_gateways(),
            # New services
            "redshift_clusters":       self._collect_redshift(),
            "elasticsearch_domains":   self._collect_elasticsearch(),
            "waf_web_acls":            self._collect_waf(),
            "cognito_user_pools":      self._collect_cognito(),
            "ssm_parameters":          self._collect_ssm_parameters(),
            "acm_certificates":        self._collect_acm_certificates(),
            "route53_zones":           self._collect_route53(),
            "ecs_task_definitions":    self._collect_ecs(),
            "kinesis_streams":         self._collect_kinesis(),
            "ses_identities":          self._collect_ses(),
            "macie_status":            self._collect_macie(),
            "inspector_status":        self._collect_inspector(),
        }

    # ── IAM ──────────────────────────────────────────────────────────────────

    def _collect_iam_summary(self) -> dict:
        try:
            iam = self._client("iam")
            summary = iam.get_account_summary()["SummaryMap"]

            # Password policy
            try:
                pp = iam.get_account_password_policy()["PasswordPolicy"]
                summary["password_policy_exists"]  = True
                summary["MinimumPasswordLength"]    = pp.get("MinimumPasswordLength")
                summary["RequireUppercaseCharacters"] = pp.get("RequireUppercaseCharacters", False)
                summary["RequireLowercaseCharacters"] = pp.get("RequireLowercaseCharacters", False)
                summary["RequireNumbers"]            = pp.get("RequireNumbers", False)
                summary["RequireSymbols"]            = pp.get("RequireSymbols", False)
                summary["MaxPasswordAge"]            = pp.get("MaxPasswordAge")
                summary["PasswordReusePrevention"]   = pp.get("PasswordReusePrevention")
            except (ClientError, EndpointConnectionError) as e:
                if "NoSuchEntity" in str(e):
                    summary["password_policy_exists"] = False

            return summary
        except (ClientError, EndpointConnectionError):
            return {}

    def _collect_iam_users(self) -> list:
        try:
            iam   = self._client("iam")
            users = []
            paginator = iam.get_paginator("list_users")
            for page in paginator.paginate():
                for user in page["Users"]:
                    username = user["UserName"]
                    # Check MFA
                    mfa_devices = iam.list_mfa_devices(UserName=username)["MFADevices"]
                    user["mfa_enabled"] = len(mfa_devices) > 0

                    # Check console access
                    try:
                        iam.get_login_profile(UserName=username)
                        user["console_access"] = True
                    except (ClientError, EndpointConnectionError):
                        user["console_access"] = False

                    # Check access keys (age and count)
                    keys = iam.list_access_keys(UserName=username)["AccessKeyMetadata"]
                    active_keys = [k for k in keys if k["Status"] == "Active"]
                    max_age = 0
                    for key in active_keys:
                        created = key["CreateDate"]
                        age = (datetime.now(timezone.utc) - created).days
                        max_age = max(max_age, age)
                    user["access_key_age_days"]    = max_age if keys else None
                    user["active_access_key_count"] = len(active_keys)

                    # Last activity
                    try:
                        last_used_info = iam.get_user(UserName=username)["User"]
                        last_used = last_used_info.get("PasswordLastUsed")
                        if last_used:
                            user["days_since_last_activity"] = (datetime.now(timezone.utc) - last_used).days
                        else:
                            user["days_since_last_activity"] = None
                    except (ClientError, EndpointConnectionError):
                        user["days_since_last_activity"] = None

                    # Inline policies
                    try:
                        inline = iam.list_user_policies(UserName=username)
                        user["inline_policy_names"] = inline.get("PolicyNames", [])
                    except (ClientError, EndpointConnectionError):
                        user["inline_policy_names"] = []

                    # Attached policies
                    try:
                        attached = iam.list_attached_user_policies(UserName=username)
                        user["attached_policies"] = attached.get("AttachedPolicies", [])
                        user["has_admin_policy"] = any(
                            p["PolicyArn"] == "arn:aws:iam::aws:policy/AdministratorAccess"
                            for p in user["attached_policies"]
                        )
                    except (ClientError, EndpointConnectionError):
                        user["attached_policies"] = []
                        user["has_admin_policy"] = False

                    users.append(user)
            return users
        except (ClientError, EndpointConnectionError):
            return []

    # ── S3 ───────────────────────────────────────────────────────────────────

    def _collect_s3_buckets(self) -> list:
        try:
            s3      = self._client("s3")
            buckets = s3.list_buckets().get("Buckets", [])
            result  = []

            for bucket in buckets:
                name = bucket["Name"]
                data = {"Name": name}

                # Region
                try:
                    loc = s3.get_bucket_location(Bucket=name)
                    data["region"] = loc.get("LocationConstraint") or "us-east-1"
                except (ClientError, EndpointConnectionError):
                    data["region"] = "us-east-1"

                # Public access block
                try:
                    pab = s3.get_public_access_block(Bucket=name)["PublicAccessBlockConfiguration"]
                    data["is_public"] = not all([
                        pab.get("BlockPublicAcls", False),
                        pab.get("IgnorePublicAcls", False),
                        pab.get("BlockPublicPolicy", False),
                        pab.get("RestrictPublicBuckets", False),
                    ])
                    data["public_access_block"] = pab
                except (ClientError, EndpointConnectionError):
                    data["is_public"] = True
                    data["public_access_block"] = {}

                # Encryption
                try:
                    enc = s3.get_bucket_encryption(Bucket=name)
                    rules = enc.get("ServerSideEncryptionConfiguration", {}).get("Rules", [])
                    data["is_encrypted"] = bool(rules)
                    data["encryption_rules"] = rules
                except (ClientError, EndpointConnectionError):
                    data["is_encrypted"] = False
                    data["encryption_rules"] = []

                # Versioning
                try:
                    ver = s3.get_bucket_versioning(Bucket=name)
                    data["versioning"] = ver.get("Status") == "Enabled"
                    data["mfa_delete"] = ver.get("MFADelete") == "Enabled"
                except (ClientError, EndpointConnectionError):
                    data["versioning"] = False
                    data["mfa_delete"] = False

                # Logging
                try:
                    log = s3.get_bucket_logging(Bucket=name)
                    data["logging_enabled"] = "LoggingEnabled" in log
                except (ClientError, EndpointConnectionError):
                    data["logging_enabled"] = False

                # HTTPS-only policy
                try:
                    policy_str = s3.get_bucket_policy(Bucket=name).get("Policy", "")
                    policy = json.loads(policy_str)
                    https_only = False
                    for stmt in policy.get("Statement", []):
                        cond = stmt.get("Condition", {})
                        if cond.get("Bool", {}).get("aws:SecureTransport") == "false":
                            if stmt.get("Effect") == "Deny":
                                https_only = True
                    data["https_only"] = https_only
                    data["bucket_policy"] = policy
                except (ClientError, EndpointConnectionError):
                    data["https_only"] = False
                    data["bucket_policy"] = {}

                # Object Lock
                try:
                    ol = s3.get_object_lock_configuration(Bucket=name)
                    data["object_lock_enabled"] = ol.get("ObjectLockConfiguration", {}).get("ObjectLockEnabled") == "Enabled"
                except (ClientError, EndpointConnectionError):
                    data["object_lock_enabled"] = False

                # Lifecycle
                try:
                    lc = s3.get_bucket_lifecycle_configuration(Bucket=name)
                    data["lifecycle_rules"] = lc.get("Rules", [])
                    data["has_lifecycle"] = len(data["lifecycle_rules"]) > 0
                except (ClientError, EndpointConnectionError):
                    data["lifecycle_rules"] = []
                    data["has_lifecycle"] = False

                # Cross-account access check
                try:
                    policy_obj = data.get("bucket_policy", {})
                    cross_account = False
                    sts = self._client("sts")
                    account_id = sts.get_caller_identity().get("Account", "")
                    for stmt in policy_obj.get("Statement", []):
                        principal = stmt.get("Principal", {})
                        if isinstance(principal, dict):
                            aws_p = principal.get("AWS", "")
                            if isinstance(aws_p, list):
                                for p in aws_p:
                                    if account_id and account_id not in str(p) and "*" not in str(p):
                                        cross_account = True
                            elif isinstance(aws_p, str):
                                if account_id and account_id not in aws_p and "*" not in aws_p:
                                    cross_account = True
                    data["cross_account_access"] = cross_account
                except Exception:
                    data["cross_account_access"] = False

                result.append(data)
            return result
        except (ClientError, EndpointConnectionError):
            return []

    # ── EC2 ──────────────────────────────────────────────────────────────────

    def _collect_ec2_instances(self) -> list:
        try:
            ec2       = self._client("ec2")
            instances = []
            paginator = ec2.get_paginator("describe_instances")
            for page in paginator.paginate():
                for reservation in page["Reservations"]:
                    for instance in reservation["Instances"]:
                        if instance.get("State", {}).get("Name") == "terminated":
                            continue
                        # Check IMDSv2
                        meta_opts = instance.get("MetadataOptions", {})
                        instance["imdsv2"] = meta_opts.get("HttpTokens") == "required"
                        instances.append(instance)
            return instances
        except (ClientError, EndpointConnectionError):
            return []

    # ── Security Groups ───────────────────────────────────────────────────────

    def _collect_security_groups(self) -> list:
        try:
            ec2       = self._client("ec2")
            sgs       = ec2.describe_security_groups()["SecurityGroups"]
            result    = []
            for sg in sgs:
                sg["ssh_open"]          = False
                sg["rdp_open"]          = False
                sg["all_traffic_open"]  = False
                for rule in sg.get("IpPermissions", []):
                    for ip_range in rule.get("IpRanges", []):
                        if ip_range.get("CidrIp") == "0.0.0.0/0":
                            from_port = rule.get("FromPort", -1)
                            to_port   = rule.get("ToPort", -1)
                            proto     = rule.get("IpProtocol", "")
                            if proto == "-1":
                                sg["all_traffic_open"] = True
                            if from_port <= 22 <= to_port:
                                sg["ssh_open"] = True
                            if from_port <= 3389 <= to_port:
                                sg["rdp_open"] = True
                    for ip_range in rule.get("Ipv6Ranges", []):
                        if ip_range.get("CidrIpv6") in ("::/0", "::0/0"):
                            from_port = rule.get("FromPort", -1)
                            to_port   = rule.get("ToPort", -1)
                            proto     = rule.get("IpProtocol", "")
                            if proto == "-1":
                                sg["all_traffic_open"] = True
                            if from_port <= 22 <= to_port:
                                sg["ssh_open"] = True
                            if from_port <= 3389 <= to_port:
                                sg["rdp_open"] = True
                result.append(sg)
            return result
        except (ClientError, EndpointConnectionError):
            return []

    # ── EBS ───────────────────────────────────────────────────────────────────

    def _collect_ebs_volumes(self) -> list:
        try:
            ec2       = self._client("ec2")
            paginator = ec2.get_paginator("describe_volumes")
            volumes   = []
            for page in paginator.paginate():
                volumes.extend(page["Volumes"])
            return volumes
        except (ClientError, EndpointConnectionError):
            return []

    # ── VPC ───────────────────────────────────────────────────────────────────

    def _collect_vpcs(self) -> list:
        try:
            ec2  = self._client("ec2")
            vpcs = ec2.describe_vpcs()["Vpcs"]
            # Check flow logs per VPC
            fl   = ec2.describe_flow_logs()["FlowLogs"]
            fl_vpc_ids = {f.get("ResourceId") for f in fl}

            # Get NACLs for later rule analysis
            try:
                nacls = ec2.describe_network_acls()["NetworkAcls"]
            except (ClientError, EndpointConnectionError):
                nacls = []

            nacl_map = {}
            for nacl in nacls:
                for assoc in nacl.get("Associations", []):
                    vpc_id = assoc.get("SubnetId", "")  # by subnet, not vpc directly
                nacl_map[nacl.get("VpcId", "")] = nacl_map.get(nacl.get("VpcId", ""), [])
                nacl_map[nacl.get("VpcId", "")].append(nacl)

            # VPC peering
            try:
                peering = ec2.describe_vpc_peering_connections()["VpcPeeringConnections"]
            except (ClientError, EndpointConnectionError):
                peering = []

            for vpc in vpcs:
                vpc_id = vpc["VpcId"]
                vpc["flow_logs"] = vpc_id in fl_vpc_ids
                vpc["is_default"] = vpc.get("IsDefault", False)
                vpc["nacls"] = nacl_map.get(vpc_id, [])
                vpc["peering_connections"] = [
                    p for p in peering
                    if p.get("RequesterVpcInfo", {}).get("VpcId") == vpc_id
                    or p.get("AccepterVpcInfo", {}).get("VpcId") == vpc_id
                ]
            return vpcs
        except (ClientError, EndpointConnectionError):
            return []

    # ── CloudTrail ────────────────────────────────────────────────────────────

    def _collect_cloudtrails(self) -> list:
        try:
            ct     = self._client("cloudtrail")
            trails = ct.describe_trails()["trailList"]
            result = []
            for trail in trails:
                try:
                    status = ct.get_trail_status(Name=trail["TrailARN"])
                    trail["IsLogging"] = status.get("IsLogging", False)
                except (ClientError, EndpointConnectionError):
                    trail["IsLogging"] = False
                result.append(trail)
            return result
        except (ClientError, EndpointConnectionError):
            return []

    # ── RDS ───────────────────────────────────────────────────────────────────

    def _collect_rds_instances(self) -> list:
        try:
            rds       = self._client("rds")
            paginator = rds.get_paginator("describe_db_instances")
            instances = []
            for page in paginator.paginate():
                instances.extend(page["DBInstances"])
            return instances
        except (ClientError, EndpointConnectionError):
            return []

    # ── IAM Roles ─────────────────────────────────────────────────────────────

    def _collect_iam_roles(self) -> list:
        try:
            iam = self._client("iam")
            roles = []
            paginator = iam.get_paginator("list_roles")
            for page in paginator.paginate():
                for role in page["Roles"]:
                    name = role["RoleName"]
                    # Check attached policies
                    attached = iam.list_attached_role_policies(RoleName=name)
                    role["attached_policies"] = attached.get("AttachedPolicies", [])
                    # Check inline policies
                    inline = iam.list_role_policies(RoleName=name)
                    role["inline_policy_names"] = inline.get("PolicyNames", [])
                    # Check if admin policy attached
                    role["has_admin_policy"] = any(
                        p["PolicyArn"] == "arn:aws:iam::aws:policy/AdministratorAccess"
                        for p in role["attached_policies"]
                    )
                    # Permission boundary
                    role["has_permission_boundary"] = bool(role.get("PermissionsBoundary"))
                    roles.append(role)
            return roles
        except (ClientError, EndpointConnectionError):
            return []

    # ── Lambda ────────────────────────────────────────────────────────────────

    def _collect_lambda_functions(self) -> list:
        try:
            lam = self._client("lambda")
            functions = []
            paginator = lam.get_paginator("list_functions")
            for page in paginator.paginate():
                for fn in page["Functions"]:
                    name = fn["FunctionName"]
                    # Check tracing
                    fn["tracing_enabled"] = fn.get("TracingConfig", {}).get("Mode") == "Active"
                    # Check VPC config
                    vpc = fn.get("VpcConfig", {})
                    fn["in_vpc"] = bool(vpc.get("VpcId"))
                    # Check env vars for secrets
                    env_vars = fn.get("Environment", {}).get("Variables", {})
                    suspicious_keys = ["password", "secret", "key", "token", "api_key", "passwd"]
                    fn["env_has_secrets"] = any(
                        any(s in k.lower() for s in suspicious_keys)
                        for k in env_vars.keys()
                    )
                    # Check dead letter config
                    fn["dead_letter_configured"] = bool(fn.get("DeadLetterConfig", {}).get("TargetArn"))
                    # Check reserved concurrency
                    try:
                        rc = lam.get_function_concurrency(FunctionName=name)
                        fn["reserved_concurrency"] = rc.get("ReservedConcurrentExecutions")
                    except (ClientError, EndpointConnectionError):
                        fn["reserved_concurrency"] = None
                    # Check if using deprecated runtime
                    deprecated = ["nodejs12.x", "nodejs10.x", "python2.7", "python3.6",
                                  "ruby2.5", "dotnetcore2.1", "dotnetcore3.1"]
                    fn["deprecated_runtime"] = fn.get("Runtime", "") in deprecated
                    # Check URL config (public function URL)
                    try:
                        url_cfg = lam.get_function_url_config(FunctionName=name)
                        fn["public_url"] = url_cfg.get("AuthType") == "NONE"
                    except (ClientError, EndpointConnectionError):
                        fn["public_url"] = False
                    functions.append(fn)
            return functions
        except (ClientError, EndpointConnectionError):
            return []

    # ── CloudFront ────────────────────────────────────────────────────────────

    def _collect_cloudfront(self) -> list:
        try:
            cf = self._client("cloudfront")
            dists = []
            paginator = cf.get_paginator("list_distributions")
            for page in paginator.paginate():
                items = page.get("DistributionList", {}).get("Items", [])
                for dist in items:
                    did = dist["Id"]
                    # Get full config
                    try:
                        full = cf.get_distribution(Id=did)["Distribution"]
                        config = full.get("DistributionConfig", {})
                        dist["https_only"] = config.get("DefaultCacheBehavior", {}).get("ViewerProtocolPolicy") in ("https-only", "redirect-to-https")
                        dist["min_tls"] = config.get("ViewerCertificate", {}).get("MinimumProtocolVersion", "")
                        dist["waf_enabled"] = bool(config.get("WebACLId"))
                        dist["logging_enabled"] = bool(config.get("Logging", {}).get("Enabled"))
                        dist["geo_restriction"] = config.get("Restrictions", {}).get("GeoRestriction", {}).get("RestrictionType") != "none"
                        dist["field_level_encryption"] = bool(config.get("DefaultCacheBehavior", {}).get("FieldLevelEncryptionId"))
                    except (ClientError, EndpointConnectionError):
                        pass
                    dists.append(dist)
            return dists
        except (ClientError, EndpointConnectionError):
            return []

    # ── KMS ───────────────────────────────────────────────────────────────────

    def _collect_kms_keys(self) -> list:
        try:
            kms = self._client("kms")
            keys = []
            paginator = kms.get_paginator("list_keys")
            for page in paginator.paginate():
                for k in page["Keys"]:
                    kid = k["KeyId"]
                    try:
                        meta = kms.describe_key(KeyId=kid)["KeyMetadata"]
                        if meta.get("KeyManager") == "AWS":
                            continue  # skip AWS-managed keys
                        if meta.get("KeyState") == "PendingDeletion":
                            continue
                        meta["rotation_enabled"] = False
                        try:
                            rot = kms.get_key_rotation_status(KeyId=kid)
                            meta["rotation_enabled"] = rot.get("KeyRotationEnabled", False)
                        except (ClientError, EndpointConnectionError):
                            pass
                        keys.append(meta)
                    except (ClientError, EndpointConnectionError):
                        continue
            return keys
        except (ClientError, EndpointConnectionError):
            return []

    # ── SNS Topics ────────────────────────────────────────────────────────────

    def _collect_sns_topics(self) -> list:
        try:
            sns = self._client("sns")
            topics = []
            paginator = sns.get_paginator("list_topics")
            for page in paginator.paginate():
                for t in page["Topics"]:
                    arn = t["TopicArn"]
                    try:
                        attrs = sns.get_topic_attributes(TopicArn=arn)["Attributes"]
                        attrs["TopicArn"] = arn
                        attrs["name"] = arn.split(":")[-1]
                        attrs["is_encrypted"] = bool(attrs.get("KmsMasterKeyId"))
                        attrs["subscription_count"] = int(attrs.get("SubscriptionsConfirmed", 0))
                        # Check access policy for public access
                        policy_str = attrs.get("Policy", "{}")
                        try:
                            policy = json.loads(policy_str)
                            attrs["is_public"] = any(
                                stmt.get("Principal") in ("*", {"AWS": "*"})
                                for stmt in policy.get("Statement", [])
                                if stmt.get("Effect") == "Allow"
                            )
                        except Exception:
                            attrs["is_public"] = False
                        topics.append(attrs)
                    except (ClientError, EndpointConnectionError):
                        continue
            return topics
        except (ClientError, EndpointConnectionError):
            return []

    # ── SQS Queues ────────────────────────────────────────────────────────────

    def _collect_sqs_queues(self) -> list:
        try:
            sqs = self._client("sqs")
            queues = []
            urls = sqs.list_queues().get("QueueUrls", [])
            for url in urls:
                try:
                    attrs = sqs.get_queue_attributes(
                        QueueUrl=url,
                        AttributeNames=["All"]
                    )["Attributes"]
                    attrs["QueueUrl"] = url
                    attrs["name"] = url.split("/")[-1]
                    attrs["is_encrypted"] = bool(attrs.get("KmsMasterKeyId") or attrs.get("SqsManagedSseEnabled") == "true")
                    # Check public policy
                    policy_str = attrs.get("Policy", "{}")
                    try:
                        policy = json.loads(policy_str)
                        attrs["is_public"] = any(
                            stmt.get("Principal") in ("*", {"AWS": "*"})
                            for stmt in policy.get("Statement", [])
                            if stmt.get("Effect") == "Allow"
                        )
                    except Exception:
                        attrs["is_public"] = False
                    attrs["dlq_configured"] = bool(attrs.get("RedrivePolicy"))
                    queues.append(attrs)
                except (ClientError, EndpointConnectionError):
                    continue
            return queues
        except (ClientError, EndpointConnectionError):
            return []

    # ── EKS Clusters ─────────────────────────────────────────────────────────

    def _collect_eks_clusters(self) -> list:
        try:
            eks = self._client("eks")
            clusters = []
            names = eks.list_clusters().get("clusters", [])
            for name in names:
                try:
                    c = eks.describe_cluster(name=name)["cluster"]
                    # Public endpoint access
                    c["public_endpoint"] = c.get("resourcesVpcConfig", {}).get("endpointPublicAccess", True)
                    c["private_endpoint"] = c.get("resourcesVpcConfig", {}).get("endpointPrivateAccess", False)
                    # Logging
                    log_config = c.get("logging", {}).get("clusterLogging", [])
                    enabled_types = []
                    for lc in log_config:
                        if lc.get("enabled"):
                            enabled_types.extend(lc.get("types", []))
                    c["logging_enabled"] = len(enabled_types) > 0
                    c["all_logging_enabled"] = all(
                        t in enabled_types for t in ["api", "audit", "authenticator", "controllerManager", "scheduler"]
                    )
                    # Secrets encryption
                    enc_config = c.get("encryptionConfig", [])
                    c["secrets_encrypted"] = any(
                        "secrets" in r.get("resources", [])
                        for r in enc_config
                    )
                    # RBAC / auth mode
                    c["rbac_enabled"] = True  # EKS always uses RBAC
                    clusters.append(c)
                except (ClientError, EndpointConnectionError):
                    continue
            return clusters
        except (ClientError, EndpointConnectionError):
            return []

    # ── ECR Repositories ─────────────────────────────────────────────────────

    def _collect_ecr_repositories(self) -> list:
        try:
            ecr = self._client("ecr")
            repos = []
            paginator = ecr.get_paginator("describe_repositories")
            for page in paginator.paginate():
                for repo in page["repositories"]:
                    name = repo["repositoryName"]
                    # Image scan on push
                    scan_cfg = repo.get("imageScanningConfiguration", {})
                    repo["scan_on_push"] = scan_cfg.get("scanOnPush", False)
                    # Image tag mutability
                    repo["image_immutable"] = repo.get("imageTagMutability") == "IMMUTABLE"
                    # Encryption
                    enc = repo.get("encryptionConfiguration", {})
                    repo["is_encrypted"] = enc.get("encryptionType") in ("AES256", "KMS")
                    repo["cmk_encrypted"] = enc.get("encryptionType") == "KMS"
                    # Lifecycle policy
                    try:
                        ecr.get_lifecycle_policy(repositoryName=name)
                        repo["lifecycle_policy"] = True
                    except (ClientError, EndpointConnectionError):
                        repo["lifecycle_policy"] = False
                    # Repository policy (check public access)
                    try:
                        pol = ecr.get_repository_policy(repositoryName=name)
                        policy = json.loads(pol.get("policyText", "{}"))
                        repo["is_public"] = any(
                            stmt.get("Principal") in ("*", {"AWS": "*"})
                            for stmt in policy.get("Statement", [])
                        )
                    except (ClientError, EndpointConnectionError):
                        repo["is_public"] = False
                    repos.append(repo)
            return repos
        except (ClientError, EndpointConnectionError):
            return []

    # ── Secrets Manager ───────────────────────────────────────────────────────

    def _collect_secrets_manager(self) -> list:
        try:
            sm = self._client("secretsmanager")
            secrets = []
            paginator = sm.get_paginator("list_secrets")
            for page in paginator.paginate():
                for secret in page["SecretList"]:
                    secret["rotation_enabled"] = secret.get("RotationEnabled", False)
                    # Days since last rotation
                    last_changed = secret.get("LastChangedDate")
                    if last_changed:
                        age = (datetime.now(timezone.utc) - last_changed).days
                        secret["days_since_rotation"] = age
                    else:
                        secret["days_since_rotation"] = None
                    # Days since last accessed
                    last_accessed = secret.get("LastAccessedDate")
                    if last_accessed:
                        secret["days_since_access"] = (datetime.now(timezone.utc) - last_accessed).days
                    else:
                        secret["days_since_access"] = None
                    secrets.append(secret)
            return secrets
        except (ClientError, EndpointConnectionError):
            return []

    # ── AWS Config ────────────────────────────────────────────────────────────

    def _collect_config(self) -> list:
        try:
            cfg = self._client("config")
            recorders = cfg.describe_configuration_recorders().get("ConfigurationRecorders", [])
            statuses  = cfg.describe_configuration_recorder_status().get("ConfigurationRecordersStatus", [])
            status_map = {s["name"]: s for s in statuses}
            result = []
            for r in recorders:
                name = r["name"]
                s    = status_map.get(name, {})
                r["is_recording"]     = s.get("recording", False)
                r["last_status"]      = s.get("lastStatus", "")
                r["records_all"]      = r.get("recordingGroup", {}).get("allSupported", False)
                r["records_globals"]  = r.get("recordingGroup", {}).get("includeGlobalResourceTypes", False)
                result.append(r)
            # Check delivery channel
            channels = cfg.describe_delivery_channels().get("DeliveryChannels", [])
            for r in result:
                r["delivery_channel"] = len(channels) > 0
            if not result:
                result.append({
                    "name": "no-config-recorder",
                    "is_recording": False,
                    "records_all": False,
                    "records_globals": False,
                    "delivery_channel": False,
                })
            return result
        except (ClientError, EndpointConnectionError):
            return [{"name": "no-config-recorder", "is_recording": False,
                     "records_all": False, "records_globals": False, "delivery_channel": False}]

    # ── GuardDuty ─────────────────────────────────────────────────────────────

    def _collect_guardduty(self) -> list:
        try:
            gd = self._client("guardduty")
            detector_ids = gd.list_detectors().get("DetectorIds", [])
            detectors = []
            for did in detector_ids:
                try:
                    d = gd.get_detector(DetectorId=did)
                    d["DetectorId"]  = did
                    d["is_enabled"]  = d.get("Status") == "ENABLED"
                    d["s3_logs"]     = d.get("DataSources", {}).get("S3Logs", {}).get("Status") == "ENABLED"
                    d["k8s_logs"]    = d.get("DataSources", {}).get("Kubernetes", {}).get("AuditLogs", {}).get("Status") == "ENABLED"
                    detectors.append(d)
                except (ClientError, EndpointConnectionError):
                    continue
            if not detector_ids:
                detectors.append({"DetectorId": "none", "is_enabled": False,
                                   "s3_logs": False, "k8s_logs": False})
            return detectors
        except (ClientError, EndpointConnectionError):
            return [{"DetectorId": "none", "is_enabled": False, "s3_logs": False, "k8s_logs": False}]

    # ── ElastiCache ───────────────────────────────────────────────────────────

    def _collect_elasticache(self) -> list:
        try:
            ec = self._client("elasticache")
            clusters = []
            paginator = ec.get_paginator("describe_cache_clusters")
            for page in paginator.paginate(ShowCacheNodeInfo=True):
                for cluster in page["CacheClusters"]:
                    cluster["at_rest_encrypted"]    = cluster.get("AtRestEncryptionEnabled", False)
                    cluster["in_transit_encrypted"] = cluster.get("TransitEncryptionEnabled", False)
                    cluster["auth_token_enabled"]   = cluster.get("AuthTokenEnabled", False)
                    cluster["multi_az"]             = cluster.get("PreferredAvailabilityZone") == "Multiple"
                    # Check if in VPC
                    cluster["in_vpc"] = bool(cluster.get("CacheSubnetGroupName"))
                    # Version outdated check
                    engine = cluster.get("Engine", "")
                    version = cluster.get("EngineVersion", "0")
                    try:
                        major = int(version.split(".")[0])
                        cluster["version_outdated"] = (engine == "redis" and major < 6) or \
                                                       (engine == "memcached" and major < 1)
                    except ValueError:
                        cluster["version_outdated"] = False
                    clusters.append(cluster)
            return clusters
        except (ClientError, EndpointConnectionError):
            return []

    # ── DynamoDB ──────────────────────────────────────────────────────────────

    def _collect_dynamodb(self) -> list:
        try:
            ddb = self._client("dynamodb")
            tables = []
            paginator = ddb.get_paginator("list_tables")
            for page in paginator.paginate():
                for name in page["TableNames"]:
                    try:
                        desc = ddb.describe_table(TableName=name)["Table"]
                        # Encryption
                        sse = desc.get("SSEDescription", {})
                        desc["is_encrypted"] = sse.get("Status") == "ENABLED"
                        desc["cmk_encrypted"] = sse.get("SSEType") == "KMS"
                        # PITR
                        try:
                            pitr = ddb.describe_continuous_backups(TableName=name)
                            pitr_desc = pitr.get("ContinuousBackupsDescription", {})
                            desc["pitr_enabled"] = pitr_desc.get("PointInTimeRecoveryDescription", {}).get("PointInTimeRecoveryStatus") == "ENABLED"
                        except (ClientError, EndpointConnectionError):
                            desc["pitr_enabled"] = False
                        # Deletion protection
                        desc["deletion_protection"] = desc.get("DeletionProtectionEnabled", False)
                        tables.append(desc)
                    except (ClientError, EndpointConnectionError):
                        continue
            return tables
        except (ClientError, EndpointConnectionError):
            return []

    # ── Load Balancers (ALB/NLB/CLB) ─────────────────────────────────────────

    def _collect_load_balancers(self) -> list:
        try:
            elb = self._client("elbv2")
            lbs = []
            paginator = elb.get_paginator("describe_load_balancers")
            for page in paginator.paginate():
                for lb in page["LoadBalancers"]:
                    arn = lb["LoadBalancerArn"]
                    # Get attributes
                    try:
                        attrs = elb.describe_load_balancer_attributes(LoadBalancerArn=arn)
                        attr_map = {a["Key"]: a["Value"] for a in attrs.get("Attributes", [])}
                        lb["access_logs_enabled"]   = attr_map.get("access_logs.s3.enabled") == "true"
                        lb["deletion_protection"]   = attr_map.get("deletion_protection.enabled") == "true"
                        lb["drop_invalid_headers"]  = attr_map.get("routing.http.drop_invalid_header_fields.enabled") == "true"
                        lb["waf_fail_open"]         = attr_map.get("waf.fail_open.enabled") == "true"
                    except (ClientError, EndpointConnectionError):
                        lb["access_logs_enabled"]  = False
                        lb["deletion_protection"]  = False
                        lb["drop_invalid_headers"] = False
                    # Get listeners to check SSL/TLS
                    try:
                        listeners = elb.describe_listeners(LoadBalancerArn=arn).get("Listeners", [])
                        lb["has_https_listener"] = any(l.get("Protocol") in ("HTTPS", "TLS") for l in listeners)
                        lb["http_redirect"]      = any(
                            any(a.get("Type") == "redirect" for a in l.get("DefaultActions", []))
                            for l in listeners if l.get("Protocol") == "HTTP"
                        )
                        # Check TLS policy
                        ssl_policies = [l.get("SslPolicy", "") for l in listeners if l.get("SslPolicy")]
                        lb["outdated_tls"] = any(
                            p in ("ELBSecurityPolicy-2016-08", "ELBSecurityPolicy-TLS-1-0-2015-04")
                            for p in ssl_policies
                        )
                    except (ClientError, EndpointConnectionError):
                        lb["has_https_listener"] = False
                        lb["http_redirect"] = False
                        lb["outdated_tls"] = False
                    lb["is_internet_facing"] = lb.get("Scheme") == "internet-facing"
                    lbs.append(lb)
            return lbs
        except (ClientError, EndpointConnectionError):
            return []

    # ── API Gateway ───────────────────────────────────────────────────────────

    def _collect_api_gateways(self) -> list:
        try:
            apigw = self._client("apigateway")
            apis = []
            result = apigw.get_rest_apis().get("items", [])
            for api in result:
                api_id = api["id"]
                # Get stages
                try:
                    stages = apigw.get_stages(restApiId=api_id).get("item", [])
                    api["stages"] = stages
                    # Check logging / tracing per stage
                    api["logging_enabled"] = any(
                        s.get("methodSettings", {}).get("*/*", {}).get("loggingLevel") in ("INFO", "ERROR")
                        for s in stages
                    )
                    api["tracing_enabled"] = any(s.get("tracingEnabled", False) for s in stages)
                    api["client_cert"]     = any(bool(s.get("clientCertificateId")) for s in stages)
                    # Check WAF
                    api["waf_enabled"] = any(bool(s.get("webAclArn")) for s in stages)
                    # Check usage plan
                    try:
                        plans = apigw.get_usage_plans().get("items", [])
                        api["usage_plan_configured"] = len(plans) > 0
                    except (ClientError, EndpointConnectionError):
                        api["usage_plan_configured"] = False
                except (ClientError, EndpointConnectionError):
                    api["logging_enabled"] = False
                    api["tracing_enabled"] = False
                    api["waf_enabled"]     = False
                apis.append(api)
            return apis
        except (ClientError, EndpointConnectionError):
            return []

    # ── Redshift ──────────────────────────────────────────────────────────────

    def _collect_redshift(self) -> list:
        try:
            rs = self._client("redshift")
            clusters = []
            paginator = rs.get_paginator("describe_clusters")
            for page in paginator.paginate():
                for cluster in page["Clusters"]:
                    cid = cluster["ClusterIdentifier"]
                    # Audit logging status
                    try:
                        logging_status = rs.describe_logging_status(ClusterIdentifier=cid)
                        cluster["audit_logging_enabled"] = logging_status.get("LoggingEnabled", False)
                        cluster["audit_log_bucket"]      = logging_status.get("BucketName", "")
                    except (ClientError, EndpointConnectionError):
                        cluster["audit_logging_enabled"] = False
                        cluster["audit_log_bucket"]      = ""

                    # Derived convenience flags
                    cluster["is_encrypted"]              = cluster.get("Encrypted", False)
                    cluster["publicly_accessible"]       = cluster.get("PubliclyAccessible", False)
                    cluster["enhanced_vpc_routing"]      = cluster.get("EnhancedVpcRouting", False)
                    cluster["automated_snapshot_retention"] = cluster.get("AutomatedSnapshotRetentionPeriod", 0)
                    cluster["in_vpc"]                    = bool(cluster.get("VpcId"))

                    # Require SSL — check parameter groups
                    cluster["require_ssl"] = False
                    try:
                        for pg_ref in cluster.get("ClusterParameterGroups", []):
                            pg_name = pg_ref.get("ParameterGroupName", "")
                            params = rs.describe_cluster_parameters(
                                ParameterGroupName=pg_name
                            ).get("Parameters", [])
                            for param in params:
                                if param.get("ParameterName") == "require_ssl" and param.get("ParameterValue") == "true":
                                    cluster["require_ssl"] = True
                    except (ClientError, EndpointConnectionError):
                        pass

                    clusters.append(cluster)
            return clusters
        except (ClientError, EndpointConnectionError):
            return []

    # ── ElasticSearch / OpenSearch ────────────────────────────────────────────

    def _collect_elasticsearch(self) -> list:
        try:
            es = self._client("es")
            domain_names = [d["DomainName"] for d in es.list_domain_names().get("DomainNames", [])]
            domains = []
            for name in domain_names:
                try:
                    d = es.describe_elasticsearch_domain(DomainName=name)["DomainStatus"]
                    # Flatten nested fields for easier rule evaluation
                    d["encryption_at_rest_enabled"]    = d.get("EncryptionAtRestOptions", {}).get("Enabled", False)
                    d["node_to_node_encryption"]       = d.get("NodeToNodeEncryptionOptions", {}).get("Enabled", False)
                    d["enforce_https"]                 = d.get("DomainEndpointOptions", {}).get("EnforceHTTPS", False)
                    d["is_vpc"]                        = bool(d.get("VPCOptions"))
                    d["fine_grained_access"]           = d.get("AdvancedSecurityOptions", {}).get("Enabled", False)
                    # Check access policy for public
                    access_policy_str = d.get("AccessPolicies", "{}")
                    try:
                        access_policy = json.loads(access_policy_str)
                        d["is_public"] = any(
                            stmt.get("Principal") in ("*", {"AWS": "*"})
                            for stmt in access_policy.get("Statement", [])
                            if stmt.get("Effect") == "Allow"
                        )
                    except Exception:
                        d["is_public"] = False
                    # Audit log publishing
                    log_opts = d.get("LogPublishingOptions", {})
                    d["audit_logs_enabled"] = bool(log_opts.get("AUDIT_LOGS", {}).get("CloudWatchLogsLogGroupArn"))
                    domains.append(d)
                except (ClientError, EndpointConnectionError):
                    continue
            return domains
        except (ClientError, EndpointConnectionError):
            return []

    # ── WAF ───────────────────────────────────────────────────────────────────

    def _collect_waf(self) -> list:
        """Collect WAFv2 web ACLs for both REGIONAL and CLOUDFRONT scopes."""
        result = []
        for scope in ("REGIONAL", "CLOUDFRONT"):
            try:
                wafv2 = self._client("wafv2")
                paginator_kwargs = {"Scope": scope}
                # WAFv2 list_web_acls does not support standard paginators; use NextMarker manually
                marker = None
                while True:
                    kwargs = {"Scope": scope, "Limit": 100}
                    if marker:
                        kwargs["NextMarker"] = marker
                    resp = wafv2.list_web_acls(**kwargs)
                    for acl_summary in resp.get("WebACLs", []):
                        arn  = acl_summary["ARN"]
                        name = acl_summary["Name"]
                        acl_id = acl_summary["Id"]
                        try:
                            full = wafv2.get_web_acl(Name=name, Scope=scope, Id=acl_id)["WebACL"]
                        except (ClientError, EndpointConnectionError):
                            full = acl_summary

                        # Logging configuration
                        try:
                            log_cfg = wafv2.get_logging_configuration(ResourceArn=arn)
                            full["logging_enabled"] = True
                            full["logging_destination"] = log_cfg.get("LoggingConfiguration", {}).get("LogDestinationConfigs", [])
                        except (ClientError, EndpointConnectionError):
                            full["logging_enabled"] = False
                            full["logging_destination"] = []

                        # Check for rate-based rules
                        rules = full.get("Rules", [])
                        full["has_rate_limit_rule"] = any(
                            r.get("Statement", {}).get("RateBasedStatement") is not None
                            for r in rules
                        )
                        # Check for geo-match rules
                        full["has_geo_match_rule"] = any(
                            r.get("Statement", {}).get("GeoMatchStatement") is not None
                            for r in rules
                        )
                        # Default action
                        default_action = full.get("DefaultAction", {})
                        full["default_action"] = "Allow" if "Allow" in default_action else "Block"
                        full["scope"] = scope
                        result.append(full)

                    marker = resp.get("NextMarker")
                    if not marker:
                        break
            except (ClientError, EndpointConnectionError):
                continue
        return result

    # ── Cognito ───────────────────────────────────────────────────────────────

    def _collect_cognito(self) -> list:
        try:
            cognito = self._client("cognito-idp")
            pools = []
            paginator = cognito.get_paginator("list_user_pools")
            for page in paginator.paginate(MaxResults=60):
                for pool_summary in page["UserPools"]:
                    pool_id = pool_summary["Id"]
                    try:
                        pool = cognito.describe_user_pool(UserPoolId=pool_id)["UserPool"]
                        # Flatten key fields
                        password_policy = pool.get("Policies", {}).get("PasswordPolicy", {})
                        pool["password_min_length"]       = password_policy.get("MinimumLength", 0)
                        pool["password_require_upper"]    = password_policy.get("RequireUppercase", False)
                        pool["password_require_lower"]    = password_policy.get("RequireLowercase", False)
                        pool["password_require_numbers"]  = password_policy.get("RequireNumbers", False)
                        pool["password_require_symbols"]  = password_policy.get("RequireSymbols", False)
                        pool["temp_password_validity"]    = password_policy.get("TemporaryPasswordValidityDays", 7)

                        pool["mfa_configuration"]         = pool.get("MfaConfiguration", "OFF")
                        pool["mfa_enabled"]               = pool["mfa_configuration"] != "OFF"
                        pool["advanced_security_mode"]    = pool.get("UserPoolAddOns", {}).get("AdvancedSecurityMode", "OFF")

                        # Lambda triggers (indicates custom flows)
                        pool["has_lambda_triggers"] = bool(pool.get("LambdaConfig"))
                        pools.append(pool)
                    except (ClientError, EndpointConnectionError):
                        continue
            return pools
        except (ClientError, EndpointConnectionError):
            return []

    # ── SSM Parameters ────────────────────────────────────────────────────────

    def _collect_ssm_parameters(self) -> list:
        try:
            ssm = self._client("ssm")
            parameters = []
            paginator = ssm.get_paginator("describe_parameters")
            for page in paginator.paginate():
                for param in page["Parameters"]:
                    param["is_secure"] = param.get("Type") == "SecureString"
                    param["has_kms_key"] = bool(param.get("KeyId"))
                    parameters.append(param)
            # Check Session Manager preferences
            try:
                pref_doc = ssm.get_document(Name="SSM-SessionManagerRunShell")
                content = json.loads(pref_doc.get("Content", "{}"))
                s3_bucket = content.get("inputs", {}).get("s3BucketName", "")
                cw_log = content.get("inputs", {}).get("cloudWatchLogGroupName", "")
                ssm_logging = bool(s3_bucket or cw_log)
            except (ClientError, EndpointConnectionError):
                ssm_logging = False

            # Check for public documents
            try:
                pub_docs = ssm.list_documents(
                    Filters=[{"Key": "Owner", "Values": ["Self"]}]
                ).get("DocumentIdentifiers", [])
                for doc in pub_docs:
                    doc_name = doc.get("Name", "")
                    try:
                        perms = ssm.describe_document_permission(Name=doc_name, PermissionType="Share")
                        doc["is_public"] = "all" in perms.get("AccountIds", [])
                    except (ClientError, EndpointConnectionError):
                        doc["is_public"] = False
            except (ClientError, EndpointConnectionError):
                pub_docs = []

            # Store account-level metadata alongside parameters
            result_meta = {
                "_session_manager_logging": ssm_logging,
                "_public_documents": pub_docs,
            }
            if parameters:
                parameters[0]["_account_meta"] = result_meta
            else:
                parameters.append({"_account_meta": result_meta, "Name": "__meta__", "Type": "__meta__"})

            return parameters
        except (ClientError, EndpointConnectionError):
            return []

    # ── ACM Certificates ──────────────────────────────────────────────────────

    def _collect_acm_certificates(self) -> list:
        try:
            acm = self._client("acm")
            certs = []
            paginator = acm.get_paginator("list_certificates")
            for page in paginator.paginate():
                for cert_summary in page["CertificateSummaryList"]:
                    arn = cert_summary["CertificateArn"]
                    try:
                        cert = acm.describe_certificate(CertificateArn=arn)["Certificate"]
                        # Days until expiry
                        not_after = cert.get("NotAfter")
                        if not_after:
                            days_remaining = (not_after - datetime.now(timezone.utc)).days
                            cert["days_until_expiry"] = days_remaining
                        else:
                            cert["days_until_expiry"] = None
                        # Weak key algorithm
                        cert["is_weak_key"] = cert.get("KeyAlgorithm", "") == "RSA_1024"
                        # Auto-renewal
                        renewal_summary = cert.get("RenewalSummary", {})
                        cert["auto_renewal_eligible"] = cert.get("RenewalEligibility") == "ELIGIBLE"
                        certs.append(cert)
                    except (ClientError, EndpointConnectionError):
                        continue
            return certs
        except (ClientError, EndpointConnectionError):
            return []

    # ── Route 53 ─────────────────────────────────────────────────────────────

    def _collect_route53(self) -> list:
        try:
            r53 = self._client("route53")
            zones = []
            paginator = r53.get_paginator("list_hosted_zones")
            for page in paginator.paginate():
                for zone in page["HostedZones"]:
                    zone_id_raw = zone["Id"]
                    zone_id = zone_id_raw.split("/")[-1]
                    zone["ZoneId"] = zone_id
                    zone["is_private"] = zone.get("Config", {}).get("PrivateZone", False)

                    # DNSSEC status
                    try:
                        dnssec = r53.get_dnssec(HostedZoneId=zone_id)
                        status = dnssec.get("Status", {}).get("ServeSignature", "NOT_SIGNING")
                        zone["dnssec_enabled"] = status == "SIGNING"
                        zone["dnssec_status"]  = status
                    except (ClientError, EndpointConnectionError):
                        zone["dnssec_enabled"] = False
                        zone["dnssec_status"]  = "UNKNOWN"

                    # Query logging
                    try:
                        qlc = r53.list_query_logging_configs(HostedZoneId=zone_id)
                        zone["query_logging_enabled"] = len(qlc.get("QueryLoggingConfigs", [])) > 0
                    except (ClientError, EndpointConnectionError):
                        zone["query_logging_enabled"] = False

                    zones.append(zone)

            # Domain-level checks via Route53Domains (global, us-east-1 only)
            try:
                domains_client = self._get_session().client("route53domains", region_name="us-east-1")
                domain_list = domains_client.list_domains().get("Domains", [])
                for domain in domain_list:
                    domain_name = domain.get("DomainName", "")
                    try:
                        detail = domains_client.get_domain_detail(DomainName=domain_name)
                        domain["transfer_lock"] = detail.get("StatusList", []) and "TRANSFER_LOCK" in detail.get("StatusList", [])
                        domain["privacy_protection"] = detail.get("AdminPrivacy", False)
                    except (ClientError, EndpointConnectionError):
                        domain["transfer_lock"] = False
                        domain["privacy_protection"] = False
                    # Attach to a synthetic zone entry
                    zones.append({
                        "ZoneId": f"domain::{domain_name}",
                        "Name": domain_name,
                        "is_private": False,
                        "dnssec_enabled": False,
                        "query_logging_enabled": False,
                        "is_domain_record": True,
                        "transfer_lock": domain.get("transfer_lock", False),
                        "privacy_protection": domain.get("privacy_protection", False),
                    })
            except Exception:
                pass

            return zones
        except (ClientError, EndpointConnectionError):
            return []

    # ── ECS ───────────────────────────────────────────────────────────────────

    def _collect_ecs(self) -> list:
        try:
            ecs = self._client("ecs")
            task_defs = []

            # Collect unique family:revision task definitions (latest active per family)
            families = set()
            paginator = ecs.get_paginator("list_task_definitions")
            for page in paginator.paginate(status="ACTIVE"):
                for arn in page["taskDefinitionArns"]:
                    family = arn.split("/")[-1].rsplit(":", 1)[0]
                    families.add(family)

            # Get latest revision per family
            for family in families:
                try:
                    td_list = ecs.list_task_definitions(
                        familyPrefix=family, status="ACTIVE", sort="DESC", maxResults=1
                    ).get("taskDefinitionArns", [])
                    if not td_list:
                        continue
                    td = ecs.describe_task_definition(taskDefinition=td_list[0])["taskDefinition"]

                    # Analyze container definitions
                    containers = td.get("containerDefinitions", [])
                    td["has_privileged_container"]  = any(c.get("privileged", False) for c in containers)
                    td["has_host_network_mode"]     = td.get("networkMode") == "host"
                    td["all_readonly_root_fs"]      = all(c.get("readonlyRootFilesystem", False) for c in containers)
                    td["has_execution_role"]        = bool(td.get("executionRoleArn"))

                    # Secrets in environment variables (plaintext)
                    suspicious = ["password", "secret", "key", "token", "api_key", "passwd", "credential"]
                    env_secret_found = False
                    for c in containers:
                        for env_var in c.get("environment", []):
                            name_lc = env_var.get("name", "").lower()
                            if any(s in name_lc for s in suspicious):
                                env_secret_found = True
                    td["env_secrets_found"] = env_secret_found

                    task_defs.append(td)
                except (ClientError, EndpointConnectionError):
                    continue

            # Collect ECS services for container insights
            try:
                cluster_arns = ecs.list_clusters().get("clusterArns", [])
                for cluster_arn in cluster_arns:
                    try:
                        cluster_detail = ecs.describe_clusters(
                            clusters=[cluster_arn],
                            include=["SETTINGS"]
                        ).get("clusters", [{}])[0]
                        settings = cluster_detail.get("settings", [])
                        container_insights = any(
                            s.get("name") == "containerInsights" and s.get("value") == "enabled"
                            for s in settings
                        )
                        # Attach cluster insights flag to each task def from that cluster
                        cluster_name = cluster_detail.get("clusterName", cluster_arn)
                        for td in task_defs:
                            td.setdefault("cluster_container_insights", {})[cluster_name] = container_insights
                    except (ClientError, EndpointConnectionError):
                        continue
            except (ClientError, EndpointConnectionError):
                pass

            return task_defs
        except (ClientError, EndpointConnectionError):
            return []

    # ── Kinesis ───────────────────────────────────────────────────────────────

    def _collect_kinesis(self) -> list:
        try:
            kinesis = self._client("kinesis")
            streams = []
            stream_names = kinesis.list_streams().get("StreamNames", [])
            for name in stream_names:
                try:
                    summary = kinesis.describe_stream_summary(StreamName=name)
                    desc = summary.get("StreamDescriptionSummary", {})
                    desc["StreamName"]        = name
                    desc["is_encrypted"]      = desc.get("EncryptionType", "NONE") != "NONE"
                    desc["encryption_type"]   = desc.get("EncryptionType", "NONE")
                    desc["retention_hours"]   = desc.get("RetentionPeriodHours", 24)
                    desc["stream_status"]     = desc.get("StreamStatus", "UNKNOWN")
                    # Enhanced monitoring
                    try:
                        mon = kinesis.describe_stream(StreamName=name)
                        shard_level = mon.get("StreamDescription", {}).get("EnhancedMonitoring", [])
                        shard_metrics = shard_level[0].get("ShardLevelMetrics", []) if shard_level else []
                        desc["enhanced_monitoring_enabled"] = len(shard_metrics) > 0
                    except (ClientError, EndpointConnectionError):
                        desc["enhanced_monitoring_enabled"] = False
                    streams.append(desc)
                except (ClientError, EndpointConnectionError):
                    continue
            return streams
        except (ClientError, EndpointConnectionError):
            return []

    # ── SES Identities ────────────────────────────────────────────────────────

    def _collect_ses(self) -> list:
        try:
            ses = self._client("ses")
            identities_response = ses.list_identities(IdentityType="Domain")
            identities = identities_response.get("Identities", [])
            # Also collect email identities
            email_identities = ses.list_identities(IdentityType="EmailAddress").get("Identities", [])
            identities.extend(email_identities)

            result = []
            # DKIM attributes
            if identities:
                try:
                    dkim_attrs = ses.get_identity_dkim_attributes(Identities=identities).get("DkimAttributes", {})
                except (ClientError, EndpointConnectionError):
                    dkim_attrs = {}
                # Verification attributes
                try:
                    verif_attrs = ses.get_identity_verification_attributes(Identities=identities).get("VerificationAttributes", {})
                except (ClientError, EndpointConnectionError):
                    verif_attrs = {}

                for identity in identities:
                    dkim = dkim_attrs.get(identity, {})
                    verif = verif_attrs.get(identity, {})
                    record = {
                        "Identity":              identity,
                        "DkimEnabled":           dkim.get("DkimEnabled", False),
                        "DkimVerificationStatus": dkim.get("DkimVerificationStatus", "NotStarted"),
                        "VerificationStatus":    verif.get("VerificationStatus", "Pending"),
                    }
                    # Sending authorization policies
                    try:
                        policies = ses.list_identity_policies(Identity=identity).get("PolicyNames", [])
                        record["has_sending_policy"] = len(policies) > 0
                        # Check for overly permissive policies (allow * principal)
                        is_permissive = False
                        for pol_name in policies:
                            try:
                                pol_doc = ses.get_identity_policies(
                                    Identity=identity, PolicyNames=[pol_name]
                                ).get("Policies", {}).get(pol_name, "{}")
                                pol = json.loads(pol_doc)
                                for stmt in pol.get("Statement", []):
                                    if stmt.get("Principal") in ("*", {"AWS": "*"}):
                                        is_permissive = True
                            except Exception:
                                pass
                        record["policy_too_permissive"] = is_permissive
                    except (ClientError, EndpointConnectionError):
                        record["has_sending_policy"] = False
                        record["policy_too_permissive"] = False
                    result.append(record)
            return result
        except (ClientError, EndpointConnectionError):
            return []

    # ── Macie ─────────────────────────────────────────────────────────────────

    def _collect_macie(self) -> dict:
        try:
            macie = self._client("macie2")
            session = macie.get_macie_session()
            return {
                "status":                       session.get("status", "PAUSED"),
                "enabled":                      session.get("status") == "ENABLED",
                "finding_publishing_frequency": session.get("findingPublishingFrequency", "SIX_HOURS"),
                "automated_discovery":          False,  # requires separate call
            }
        except (ClientError, EndpointConnectionError):
            return {"status": "DISABLED", "enabled": False, "finding_publishing_frequency": None}

    # ── Inspector ─────────────────────────────────────────────────────────────

    def _collect_inspector(self) -> dict:
        try:
            inspector = self._client("inspector2")
            resp = inspector.batch_get_account_status(accountIds=[])
            accounts = resp.get("accounts", [])
            if not accounts:
                return {"enabled": False, "ec2_scanning": False, "ecr_scanning": False, "lambda_scanning": False}
            account = accounts[0]
            resource_state = account.get("resourceState", {})
            ec2_status     = resource_state.get("ec2", {}).get("status", "DISABLED")
            ecr_status     = resource_state.get("ecr", {}).get("status", "DISABLED")
            lambda_status  = resource_state.get("lambda", {}).get("status", "DISABLED")
            return {
                "enabled":         account.get("state", {}).get("status") == "ENABLED",
                "ec2_scanning":    ec2_status == "ENABLED",
                "ecr_scanning":    ecr_status == "ENABLED",
                "lambda_scanning": lambda_status == "ENABLED",
            }
        except (ClientError, EndpointConnectionError):
            return {"enabled": False, "ec2_scanning": False, "ecr_scanning": False, "lambda_scanning": False}
