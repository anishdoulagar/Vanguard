"""
deploy_vulnerable_aws.py
========================
Deploys intentionally misconfigured AWS resources to demonstrate
Vanguard CSPM findings during a presentation.

WHAT IT CREATES (all tagged cspm-demo for easy cleanup):
  • 4 S3 buckets  — public access, no encryption, no versioning, no logging
  • 3 Security Groups — SSH/RDP/all-traffic open to 0.0.0.0/0
  • 1 VPC           — no flow logs enabled
  • 1 CloudTrail    — no log-file validation, no CloudWatch integration
  • 1 IAM user      — with active access key, no MFA
  • Weak account password policy
  • 1 Lambda function — no encryption, no dead-letter queue
  • 1 SNS topic      — no encryption
  • 1 SQS queue      — no encryption
  • 1 KMS key        — no auto-rotation
  • 1 EC2 t2.micro   — public IP, IMDSv2 disabled, no detailed monitoring

EXPECTED CSPM FINDINGS (30–40 findings):
  CRITICAL  AWS-S3-001, AWS-SG-001, AWS-SG-002, AWS-IAM-002 (if root keys exist)
  HIGH      AWS-IAM-003..010, AWS-CT-001..008, AWS-S3-002..009, AWS-SG-003..005
  MEDIUM    AWS-VPC-001..005, AWS-KMS-*, AWS-LAMBDA-*, AWS-SNS-*, AWS-SQS-*

COST: ~$0.01/hour (EC2 t2.micro only; everything else is free-tier)
      Run cleanup_vulnerable_aws.py immediately after demo to avoid charges.

USAGE:
  pip install boto3
  export AWS_ACCESS_KEY_ID=...
  export AWS_SECRET_ACCESS_KEY=...
  export AWS_DEFAULT_REGION=us-east-1
  python3 deploy_vulnerable_aws.py
"""

import boto3
import json
import pathlib
import random
import string
import sys
import time
from datetime import datetime
from botocore.exceptions import ClientError

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from load_env import load_env
load_env()

# ── Config ────────────────────────────────────────────────────────────────────
REGION  = "us-east-1"
TAG     = "cspm-demo"           # applied to everything for cleanup
SUFFIX  = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))

# Resource name constants
BUCKET_PUBLIC    = f"cspm-demo-public-{SUFFIX}"
BUCKET_NOENC     = f"cspm-demo-noenc-{SUFFIX}"
BUCKET_NOVER     = f"cspm-demo-nover-{SUFFIX}"
BUCKET_NOLOG     = f"cspm-demo-nolog-{SUFFIX}"
SG_SSH_NAME      = f"cspm-demo-open-ssh-{SUFFIX}"
SG_RDP_NAME      = f"cspm-demo-open-rdp-{SUFFIX}"
SG_ALL_NAME      = f"cspm-demo-open-all-{SUFFIX}"
TRAIL_NAME       = f"cspm-demo-trail-{SUFFIX}"
TRAIL_BUCKET     = f"cspm-demo-trail-logs-{SUFFIX}"
IAM_USER_NAME    = f"cspm-demo-user-{SUFFIX}"
LAMBDA_NAME      = f"cspm-demo-lambda-{SUFFIX}"
SNS_NAME         = f"cspm-demo-topic-{SUFFIX}"
SQS_NAME         = f"cspm-demo-queue-{SUFFIX}"
KMS_ALIAS        = f"alias/cspm-demo-key-{SUFFIX}"
VPC_NAME         = f"cspm-demo-vpc-{SUFFIX}"
LAMBDA_ROLE_NAME = f"cspm-demo-lambda-role-{SUFFIX}"

TAGS = [{"Key": "project", "Value": TAG}, {"Key": "env", "Value": "demo"}]
TAG_SPEC = lambda rtype: [{"ResourceType": rtype, "Tags": TAGS}]

created = []   # track everything for summary

def ok(msg):  print(f"  \033[32m✓\033[0m  {msg}")
def info(msg): print(f"  \033[33m→\033[0m  {msg}")
def err(msg):  print(f"  \033[31m✗\033[0m  {msg}")

def section(title):
    print(f"\n\033[1;36m{'─'*60}\033[0m")
    print(f"\033[1;36m  {title}\033[0m")
    print(f"\033[1;36m{'─'*60}\033[0m")

# ── Clients ───────────────────────────────────────────────────────────────────
session = boto3.Session(region_name=REGION)
s3      = session.client("s3")
ec2     = session.resource("ec2")
ec2c    = session.client("ec2")
iam     = session.client("iam")
ct      = session.client("cloudtrail")
lam     = session.client("lambda")
sns     = session.client("sns")
sqs     = session.client("sqs")
kms     = session.client("kms")
sts     = session.client("sts")

try:
    identity = sts.get_caller_identity()
    ACCOUNT_ID = identity["Account"]
    info(f"AWS account: {ACCOUNT_ID}  ({identity['Arn']})")
except Exception as e:
    err(f"Cannot authenticate: {e}")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
#  1. S3 BUCKETS — various misconfigurations
# ══════════════════════════════════════════════════════════════════════════════
section("S3 BUCKETS — misconfigurations")

def make_bucket(name):
    try:
        if REGION == "us-east-1":
            s3.create_bucket(Bucket=name)
        else:
            s3.create_bucket(Bucket=name,
                             CreateBucketConfiguration={"LocationConstraint": REGION})
        s3.put_bucket_tagging(Bucket=name, Tagging={"TagSet": TAGS})
        return True
    except ClientError as e:
        err(f"Bucket {name}: {e.response['Error']['Code']}")
        return False

# 1a. Public bucket — disables Block Public Access, adds public ACL
if make_bucket(BUCKET_PUBLIC):
    s3.put_public_access_block(
        Bucket=BUCKET_PUBLIC,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": False, "IgnorePublicAcls": False,
            "BlockPublicPolicy": False, "RestrictPublicBuckets": False,
        },
    )
    # Allow public read via bucket policy
    s3.put_bucket_policy(Bucket=BUCKET_PUBLIC, Policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": ["s3:GetObject"],
            "Resource": f"arn:aws:s3:::{BUCKET_PUBLIC}/*"
        }]
    }))
    ok(f"Public bucket: {BUCKET_PUBLIC}  → triggers AWS-S3-001 (CRITICAL)")
    created.append(("S3 Bucket (public)", BUCKET_PUBLIC, "AWS-S3-001", "CRITICAL"))

# 1b. No encryption bucket
if make_bucket(BUCKET_NOENC):
    # Explicitly delete default encryption if set
    try:
        s3.delete_bucket_encryption(Bucket=BUCKET_NOENC)
    except Exception:
        pass
    ok(f"No-encryption bucket: {BUCKET_NOENC}  → triggers AWS-S3-002 (HIGH)")
    created.append(("S3 Bucket (no SSE)", BUCKET_NOENC, "AWS-S3-002", "HIGH"))

# 1c. No versioning bucket
if make_bucket(BUCKET_NOVER):
    ok(f"No-versioning bucket: {BUCKET_NOVER}  → triggers AWS-S3-004 (MEDIUM)")
    created.append(("S3 Bucket (no versioning)", BUCKET_NOVER, "AWS-S3-004", "MEDIUM"))

# 1d. No access logging bucket
if make_bucket(BUCKET_NOLOG):
    ok(f"No-logging bucket: {BUCKET_NOLOG}  → triggers AWS-S3-005 (LOW)")
    created.append(("S3 Bucket (no logging)", BUCKET_NOLOG, "AWS-S3-005", "LOW"))


# ══════════════════════════════════════════════════════════════════════════════
#  2. VPC — no flow logs
# ══════════════════════════════════════════════════════════════════════════════
section("VPC — no flow logs")

vpc = ec2.create_vpc(CidrBlock="10.99.0.0/16")
vpc.create_tags(Tags=TAGS + [{"Key": "Name", "Value": VPC_NAME}])
vpc.wait_until_available()
# intentionally do NOT enable flow logs
ok(f"VPC {vpc.id} created without flow logs  → triggers AWS-VPC-001 (MEDIUM)")
created.append(("VPC (no flow logs)", vpc.id, "AWS-VPC-001", "MEDIUM"))

# Create a subnet for EC2 later
subnet = vpc.create_subnet(CidrBlock="10.99.1.0/24", AvailabilityZone=f"{REGION}a")
subnet.meta.client.modify_subnet_attribute(
    SubnetId=subnet.id, MapPublicIpOnLaunch={"Value": True}
)

# Attach IGW so EC2 can be public
igw = ec2.create_internet_gateway()
igw.create_tags(Tags=TAGS)
vpc.attach_internet_gateway(InternetGatewayId=igw.id)
rt = list(vpc.route_tables.all())[0]
rt.create_route(DestinationCidrBlock="0.0.0.0/0", GatewayId=igw.id)


# ══════════════════════════════════════════════════════════════════════════════
#  3. SECURITY GROUPS — internet-exposed ports
# ══════════════════════════════════════════════════════════════════════════════
section("SECURITY GROUPS — open to internet")

def make_sg(name, desc, rules):
    sg = ec2.create_security_group(
        GroupName=name, Description=desc, VpcId=vpc.id
    )
    sg.create_tags(Tags=TAGS)
    sg.authorize_ingress(IpPermissions=rules)
    return sg

# SSH open to world
sg_ssh = make_sg(SG_SSH_NAME, "DEMO: SSH open to internet", [{
    "IpProtocol": "tcp", "FromPort": 22, "ToPort": 22,
    "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "DEMO: intentionally open"}],
    "Ipv6Ranges": [{"CidrIpv6": "::/0"}],
}])
ok(f"SG {sg_ssh.id}: SSH 0.0.0.0/0  → triggers AWS-SG-001 (CRITICAL)")
created.append(("Security Group (SSH open)", sg_ssh.id, "AWS-SG-001", "CRITICAL"))

# RDP open to world
sg_rdp = make_sg(SG_RDP_NAME, "DEMO: RDP open to internet", [{
    "IpProtocol": "tcp", "FromPort": 3389, "ToPort": 3389,
    "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "DEMO: intentionally open"}],
}])
ok(f"SG {sg_rdp.id}: RDP 0.0.0.0/0  → triggers AWS-SG-002 (CRITICAL)")
created.append(("Security Group (RDP open)", sg_rdp.id, "AWS-SG-002", "CRITICAL"))

# All traffic open (most dangerous)
sg_all = make_sg(SG_ALL_NAME, "DEMO: all traffic open to internet", [{
    "IpProtocol": "-1",
    "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "DEMO: intentionally open"}],
}])
ok(f"SG {sg_all.id}: ALL traffic 0.0.0.0/0  → triggers AWS-SG-003 (CRITICAL)")
created.append(("Security Group (all traffic open)", sg_all.id, "AWS-SG-003", "CRITICAL"))


# ══════════════════════════════════════════════════════════════════════════════
#  4. IAM — weak password policy + demo user with access key
# ══════════════════════════════════════════════════════════════════════════════
section("IAM — weak password policy + demo user")

# Set very weak password policy
iam.update_account_password_policy(
    MinimumPasswordLength=6,
    RequireUppercaseCharacters=False,
    RequireLowercaseCharacters=False,
    RequireNumbers=False,
    RequireSymbols=False,
    AllowUsersToChangePassword=True,
    MaxPasswordAge=365,
    PasswordReusePrevention=1,
)
ok("Weak password policy set (len=6, no complexity, 365-day expiry)  → triggers AWS-IAM-003..010 (HIGH/MEDIUM)")
created.append(("IAM Password Policy (weak)", "account-level", "AWS-IAM-003..010", "HIGH"))

# Create IAM user with access key (no MFA)
try:
    user = iam.create_user(
        UserName=IAM_USER_NAME,
        Tags=[{"Key": "project", "Value": TAG}],
    )
    key = iam.create_access_key(UserName=IAM_USER_NAME)["AccessKey"]
    ok(f"IAM user '{IAM_USER_NAME}' with access key (no MFA)  → triggers AWS-IAM-011..013 (HIGH/MEDIUM)")
    info(f"  Access key ID: {key['AccessKeyId']}  (intentionally insecure — cleanup after demo)")
    created.append(("IAM User (no MFA, active key)", IAM_USER_NAME, "AWS-IAM-011,012,013", "HIGH"))
except ClientError as e:
    err(f"IAM user: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  5. CLOUDTRAIL — no log file validation, no CloudWatch
# ══════════════════════════════════════════════════════════════════════════════
section("CLOUDTRAIL — misconfigured trail")

# Create S3 bucket for trail logs first
if make_bucket(TRAIL_BUCKET):
    s3.put_bucket_policy(Bucket=TRAIL_BUCKET, Policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AWSCloudTrailAclCheck",
                "Effect": "Allow",
                "Principal": {"Service": "cloudtrail.amazonaws.com"},
                "Action": "s3:GetBucketAcl",
                "Resource": f"arn:aws:s3:::{TRAIL_BUCKET}"
            },
            {
                "Sid": "AWSCloudTrailWrite",
                "Effect": "Allow",
                "Principal": {"Service": "cloudtrail.amazonaws.com"},
                "Action": "s3:PutObject",
                "Resource": f"arn:aws:s3:::{TRAIL_BUCKET}/AWSLogs/{ACCOUNT_ID}/*",
                "Condition": {"StringEquals": {"s3:x-amz-acl": "bucket-owner-full-control"}}
            }
        ]
    }))

    try:
        trail = ct.create_trail(
            Name=TRAIL_NAME,
            S3BucketName=TRAIL_BUCKET,
            IncludeGlobalServiceEvents=False,   # missing global events → finding
            IsMultiRegionTrail=False,            # single-region only → finding
            EnableLogFileValidation=False,       # no integrity validation → finding
        )
        ct.start_logging(Name=TRAIL_NAME)
        ok(f"CloudTrail '{TRAIL_NAME}': no validation, single-region, no global events  → triggers AWS-CT-001..008 (HIGH/MEDIUM)")
        created.append(("CloudTrail (no validation)", TRAIL_NAME, "AWS-CT-001,002,003,004", "HIGH"))
    except ClientError as e:
        err(f"CloudTrail: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  6. KMS KEY — no rotation
# ══════════════════════════════════════════════════════════════════════════════
section("KMS KEY — no automatic rotation")

try:
    kms_key = kms.create_key(
        Description="CSPM demo key — rotation disabled intentionally",
        Tags=[{"TagKey": "project", "TagValue": TAG}],
    )
    key_id = kms_key["KeyMetadata"]["KeyId"]
    # rotation is OFF by default — explicitly confirm
    kms.disable_key_rotation(KeyId=key_id)
    kms.create_alias(AliasName=KMS_ALIAS, TargetKeyId=key_id)
    ok(f"KMS key {key_id}: rotation disabled  → triggers AWS-KMS-001 (MEDIUM)")
    created.append(("KMS Key (no rotation)", key_id, "AWS-KMS-001", "MEDIUM"))
except ClientError as e:
    err(f"KMS: {e.response['Error']['Message']}")
    key_id = None


# ══════════════════════════════════════════════════════════════════════════════
#  7. SNS TOPIC — no encryption
# ══════════════════════════════════════════════════════════════════════════════
section("SNS TOPIC — no encryption")

try:
    topic = sns.create_topic(
        Name=SNS_NAME,
        Tags=[{"Key": "project", "Value": TAG}],
    )
    ok(f"SNS topic '{SNS_NAME}': no KMS encryption  → triggers AWS-SNS-001 (MEDIUM)")
    created.append(("SNS Topic (no encryption)", topic["TopicArn"], "AWS-SNS-001", "MEDIUM"))
except ClientError as e:
    err(f"SNS: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  8. SQS QUEUE — no encryption
# ══════════════════════════════════════════════════════════════════════════════
section("SQS QUEUE — no encryption, no dead-letter")

try:
    queue = sqs.create_queue(
        QueueName=SQS_NAME,
        Attributes={},          # no encryption, no DLQ, no visibility config
        tags={"project": TAG},
    )
    ok(f"SQS queue '{SQS_NAME}': no KMS, no DLQ  → triggers AWS-SQS-001,002 (MEDIUM)")
    created.append(("SQS Queue (no encryption)", queue["QueueUrl"], "AWS-SQS-001,002", "MEDIUM"))
except ClientError as e:
    err(f"SQS: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  9. LAMBDA FUNCTION — no encryption, no DLQ
# ══════════════════════════════════════════════════════════════════════════════
section("LAMBDA FUNCTION — no encryption or dead-letter")

# Create minimal execution role
try:
    trust = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "lambda.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    }
    role = iam.create_role(
        RoleName=LAMBDA_ROLE_NAME,
        AssumeRolePolicyDocument=json.dumps(trust),
        Tags=[{"Key": "project", "Value": TAG}],
    )
    role_arn = role["Role"]["Arn"]
    iam.attach_role_policy(
        RoleName=LAMBDA_ROLE_NAME,
        PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    )
    time.sleep(10)  # IAM propagation

    # Inline zip with dummy handler
    import io, zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("handler.py", "def handler(event, context): return 'cspm-demo'")
    buf.seek(0)

    lam.create_function(
        FunctionName=LAMBDA_NAME,
        Runtime="python3.11",
        Role=role_arn,
        Handler="handler.handler",
        Code={"ZipFile": buf.read()},
        Description="CSPM demo — intentionally insecure",
        # No KmsKeyArn, no DeadLetterConfig, no VpcConfig, no Tracing
        Environment={"Variables": {"SECRET_KEY": "hardcoded-insecure-value"}},
        Tags={"project": TAG},
    )
    ok(f"Lambda '{LAMBDA_NAME}': no KMS, no DLQ, hardcoded env var  → triggers AWS-LAMBDA-001..005 (MEDIUM/HIGH)")
    created.append(("Lambda (no encryption)", LAMBDA_NAME, "AWS-LAMBDA-001,002,005", "MEDIUM"))
except ClientError as e:
    err(f"Lambda: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  10. EC2 INSTANCE — public IP, IMDSv2 disabled, no monitoring (t2.micro)
# ══════════════════════════════════════════════════════════════════════════════
section("EC2 INSTANCE — t2.micro, public IP, IMDSv2 disabled")

# Find latest Amazon Linux 2 AMI
amis = ec2c.describe_images(
    Filters=[
        {"Name": "name",                 "Values": ["amzn2-ami-hvm-*-x86_64-gp2"]},
        {"Name": "state",                "Values": ["available"]},
        {"Name": "owner-alias",          "Values": ["amazon"]},
    ],
    Owners=["amazon"],
)
amis_sorted = sorted(amis["Images"], key=lambda x: x["CreationDate"], reverse=True)

if amis_sorted:
    ami_id = amis_sorted[0]["ImageId"]
    try:
        instances = ec2c.run_instances(
            ImageId=ami_id,
            InstanceType="t2.micro",
            MinCount=1, MaxCount=1,
            SubnetId=subnet.id,
            SecurityGroupIds=[sg_ssh.id, sg_all.id],
            MetadataOptions={
                "HttpTokens": "optional",        # IMDSv2 NOT enforced (insecure)
                "HttpEndpoint": "enabled",
            },
            Monitoring={"Enabled": False},       # no detailed monitoring
            TagSpecifications=[
                {
                    "ResourceType": "instance",
                    "Tags": TAGS + [{"Key": "Name", "Value": "cspm-demo-instance"}]
                }
            ],
        )
        iid = instances["Instances"][0]["InstanceId"]
        ok(f"EC2 {iid} (t2.micro): public IP, IMDSv2 optional, no monitoring, open SGs  → AWS-EC2-001..007 (HIGH/MEDIUM)")
        created.append(("EC2 Instance (public, IMDSv2 off)", iid, "AWS-EC2-001..007", "HIGH"))
        info("  ⚠  Remember to terminate this instance after the demo to avoid charges")
    except ClientError as e:
        err(f"EC2: {e.response['Error']['Message']}")
else:
    err("Could not find Amazon Linux 2 AMI — skipping EC2 instance")


# ══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
section("DEPLOYMENT COMPLETE — SUMMARY")

print(f"\n  Suffix used for all resources: \033[1m{SUFFIX}\033[0m")
print(f"  AWS Account: {ACCOUNT_ID}  |  Region: {REGION}\n")

print(f"  {'RESOURCE':<35} {'NAME/ID':<42} {'RULE':<25} {'SEVERITY'}")
print(f"  {'─'*35} {'─'*42} {'─'*25} {'─'*8}")
for (rtype, name, rule, sev) in created:
    col = {"CRITICAL": "\033[31m", "HIGH": "\033[33m", "MEDIUM": "\033[34m", "LOW": "\033[37m"}.get(sev, "")
    print(f"  {rtype:<35} {name[:42]:<42} {rule:<25} {col}{sev}\033[0m")

print(f"""
  ──────────────────────────────────────────────────────────────
  NEXT STEPS:
  1. Add this AWS account to Vanguard (Accounts → Add Account)
  2. Click SCAN — expect 25–40 findings
  3. Show findings grouped by severity on the Results page
  4. Filter by CIS / HIPAA / PCI framework

  CLEANUP (run after demo):
  python3 cleanup_vulnerable_aws.py --suffix {SUFFIX}
  ──────────────────────────────────────────────────────────────
""")

# Save suffix to file for cleanup script
with open("demo_infra/.aws_demo_suffix", "w") as f:
    f.write(f"{SUFFIX}\n{ACCOUNT_ID}\n{REGION}\n{vpc.id}\n{subnet.id}\n{igw.id}")
print(f"  Suffix saved to demo_infra/.aws_demo_suffix for cleanup script.")
