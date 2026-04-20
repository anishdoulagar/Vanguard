"""
deploy_vulnerable_aws.py
========================
Deploys intentionally misconfigured (or secured) AWS resources to demonstrate
Vanguard CSPM findings during a presentation.

PROFILES:
  --profile vulnerable  All misconfigs on (CRITICAL/HIGH/MEDIUM) — ~30–40 findings
  --profile moderate    Mixed: MEDIUM/HIGH findings only — ~12–20 findings
  --profile secure      Compliant infra — minimal findings, high score

USAGE:
  python3 deploy_vulnerable_aws.py [--profile vulnerable|moderate|secure] [--team alpha|beta|gamma]

  The --team flag controls which suffix file is written:
    .aws_demo_suffix         (default, no --team)
    .aws_demo_suffix_alpha   (--team alpha)
    etc.

COST (vulnerable profile):
  ~$0.01/hour (EC2 t2.micro; everything else free-tier)
  secure/moderate: ~$0.00/hour (no EC2)
"""

import argparse
import boto3
import io
import json
import pathlib
import random
import string
import sys
import time
import zipfile
from botocore.exceptions import ClientError

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from load_env import load_env
load_env()

# ── Args ──────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("--profile", default="vulnerable",
                    choices=["secure", "moderate", "vulnerable"])
parser.add_argument("--team", default=None,
                    choices=["alpha", "beta", "gamma"])
parser.add_argument("--region", default=None)
args, _ = parser.parse_known_args()

PROFILE = args.profile
TEAM    = args.team

# Each team deploys to its own region so the CSPM scanner sees isolated resources.
_TEAM_REGIONS = {"alpha": "us-east-1", "beta": "us-west-2", "gamma": "eu-west-1"}
REGION = args.region or (
    _TEAM_REGIONS[TEAM] if TEAM and TEAM in _TEAM_REGIONS else "us-east-1"
)
TAG     = "cspm-demo"
SUFFIX  = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))

# Suffix file path (team-scoped when --team given)
SUFFIX_FILE = pathlib.Path(__file__).parent / (
    f".aws_demo_suffix_{TEAM}" if TEAM else ".aws_demo_suffix"
)

BUCKET_PUBLIC    = f"cspm-demo-public-{SUFFIX}"
BUCKET_NOENC     = f"cspm-demo-noenc-{SUFFIX}"
BUCKET_NOVER     = f"cspm-demo-nover-{SUFFIX}"
BUCKET_NOLOG     = f"cspm-demo-nolog-{SUFFIX}"
SG_NAME_1        = f"cspm-demo-sg1-{SUFFIX}"
SG_NAME_2        = f"cspm-demo-sg2-{SUFFIX}"
SG_NAME_3        = f"cspm-demo-sg3-{SUFFIX}"
TRAIL_NAME       = f"cspm-demo-trail-{SUFFIX}"
TRAIL_BUCKET     = f"cspm-demo-trail-logs-{SUFFIX}"
IAM_USER_NAME    = f"cspm-demo-user-{SUFFIX}"
LAMBDA_NAME      = f"cspm-demo-lambda-{SUFFIX}"
LAMBDA_ROLE_NAME = f"cspm-demo-lambda-role-{SUFFIX}"
SNS_NAME         = f"cspm-demo-topic-{SUFFIX}"
SQS_NAME         = f"cspm-demo-queue-{SUFFIX}"
KMS_ALIAS        = f"alias/cspm-demo-key-{SUFFIX}"
VPC_NAME         = f"cspm-demo-vpc-{SUFFIX}"

TAGS     = [{"Key": "project", "Value": TAG}, {"Key": "env", "Value": "demo"},
            {"Key": "profile", "Value": PROFILE}]
TAG_SPEC = lambda rtype: [{"ResourceType": rtype, "Tags": TAGS}]

created = []

GREEN  = "\033[32m"
YELLOW = "\033[33m"
RED    = "\033[31m"
CYAN   = "\033[36m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):   print(f"  {GREEN}✓{RESET}  {msg}")
def info(msg): print(f"  {YELLOW}→{RESET}  {msg}")
def err(msg):  print(f"  {RED}✗{RESET}  {msg}")
def section(t):
    print(f"\n{CYAN}{BOLD}{'─'*60}{RESET}")
    print(f"{CYAN}{BOLD}  {t}{RESET}")
    print(f"{CYAN}{BOLD}{'─'*60}{RESET}")

# ── Clients ───────────────────────────────────────────────────────────────────
session = boto3.Session(region_name=REGION)
s3   = session.client("s3")
ec2  = session.resource("ec2")
ec2c = session.client("ec2")
iam  = session.client("iam")
ct   = session.client("cloudtrail")
lam  = session.client("lambda")
sns  = session.client("sns")
sqs  = session.client("sqs")
kms  = session.client("kms")
sts  = session.client("sts")

try:
    identity   = sts.get_caller_identity()
    ACCOUNT_ID = identity["Account"]
    info(f"AWS account: {ACCOUNT_ID}  ({identity['Arn']})")
    info(f"Profile: {BOLD}{PROFILE}{RESET}  |  Team: {TEAM or 'default'}")
except Exception as e:
    err(f"Cannot authenticate: {e}")
    sys.exit(1)


# ══════════════════════════════════════════════════════════════════════════════
#  1. S3 BUCKETS
# ══════════════════════════════════════════════════════════════════════════════
section("S3 BUCKETS")

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

def secure_bucket(name):
    """Apply secure config to a bucket."""
    try:
        s3.put_public_access_block(Bucket=name, PublicAccessBlockConfiguration={
            "BlockPublicAcls": True, "IgnorePublicAcls": True,
            "BlockPublicPolicy": True, "RestrictPublicBuckets": True,
        })
        s3.put_bucket_versioning(Bucket=name,
                                  VersioningConfiguration={"Status": "Enabled"})
        s3.put_bucket_encryption(Bucket=name, ServerSideEncryptionConfiguration={
            "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
        })
    except Exception:
        pass

if PROFILE == "vulnerable":
    # 1a. Public bucket
    if make_bucket(BUCKET_PUBLIC):
        s3.put_public_access_block(Bucket=BUCKET_PUBLIC, PublicAccessBlockConfiguration={
            "BlockPublicAcls": False, "IgnorePublicAcls": False,
            "BlockPublicPolicy": False, "RestrictPublicBuckets": False,
        })
        s3.put_bucket_policy(Bucket=BUCKET_PUBLIC, Policy=json.dumps({
            "Version": "2012-10-17",
            "Statement": [{"Sid": "PublicRead", "Effect": "Allow", "Principal": "*",
                           "Action": ["s3:GetObject"],
                           "Resource": f"arn:aws:s3:::{BUCKET_PUBLIC}/*"}]
        }))
        ok(f"Public bucket: {BUCKET_PUBLIC}  → AWS-S3-001 (CRITICAL)")
        created.append(("S3 Bucket (public)", BUCKET_PUBLIC, "AWS-S3-001", "CRITICAL"))

    # 1b. No encryption
    if make_bucket(BUCKET_NOENC):
        try:
            s3.delete_bucket_encryption(Bucket=BUCKET_NOENC)
        except Exception:
            pass
        ok(f"No-encryption bucket: {BUCKET_NOENC}  → AWS-S3-002 (HIGH)")
        created.append(("S3 Bucket (no SSE)", BUCKET_NOENC, "AWS-S3-002", "HIGH"))

    # 1c. No versioning
    if make_bucket(BUCKET_NOVER):
        ok(f"No-versioning bucket: {BUCKET_NOVER}  → AWS-S3-004 (MEDIUM)")
        created.append(("S3 Bucket (no versioning)", BUCKET_NOVER, "AWS-S3-004", "MEDIUM"))

    # 1d. No logging
    if make_bucket(BUCKET_NOLOG):
        ok(f"No-logging bucket: {BUCKET_NOLOG}  → AWS-S3-005 (LOW)")
        created.append(("S3 Bucket (no logging)", BUCKET_NOLOG, "AWS-S3-005", "LOW"))

elif PROFILE == "moderate":
    # Secure public access, but no versioning on 2 buckets, no logging on 2
    for name in [BUCKET_PUBLIC, BUCKET_NOENC]:
        if make_bucket(name):
            s3.put_public_access_block(Bucket=name, PublicAccessBlockConfiguration={
                "BlockPublicAcls": True, "IgnorePublicAcls": True,
                "BlockPublicPolicy": True, "RestrictPublicBuckets": True,
            })
            s3.put_bucket_encryption(Bucket=name, ServerSideEncryptionConfiguration={
                "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
            })
            ok(f"Bucket (no versioning): {name}  → AWS-S3-004 (MEDIUM)")
            created.append(("S3 Bucket (no versioning)", name, "AWS-S3-004", "MEDIUM"))

    for name in [BUCKET_NOVER, BUCKET_NOLOG]:
        if make_bucket(name):
            secure_bucket(name)
            ok(f"Bucket (secure): {name}")
            created.append(("S3 Bucket (secure)", name, "-", "PASS"))

else:  # secure
    for name in [BUCKET_PUBLIC, BUCKET_NOENC, BUCKET_NOVER, BUCKET_NOLOG]:
        if make_bucket(name):
            secure_bucket(name)
            ok(f"Bucket (compliant): {name}")
            created.append(("S3 Bucket (compliant)", name, "-", "PASS"))


# ══════════════════════════════════════════════════════════════════════════════
#  2. VPC
# ══════════════════════════════════════════════════════════════════════════════
section("VPC")

vpc = ec2.create_vpc(CidrBlock="10.99.0.0/16")
vpc.create_tags(Tags=TAGS + [{"Key": "Name", "Value": VPC_NAME}])
vpc.wait_until_available()

if PROFILE in ("moderate", "vulnerable"):
    ok(f"VPC {vpc.id} — no flow logs  → AWS-VPC-001 (MEDIUM)")
    created.append(("VPC (no flow logs)", vpc.id, "AWS-VPC-001", "MEDIUM"))
else:
    # Enable flow logs (requires IAM role — skipping for simplicity, just create VPC)
    ok(f"VPC {vpc.id} — created (flow logs would require extra IAM role; skip)")
    created.append(("VPC (compliant)", vpc.id, "-", "PASS"))

subnet = vpc.create_subnet(CidrBlock="10.99.1.0/24", AvailabilityZone=f"{REGION}a")
subnet.meta.client.modify_subnet_attribute(
    SubnetId=subnet.id, MapPublicIpOnLaunch={"Value": True}
)
igw = ec2.create_internet_gateway()
igw.create_tags(Tags=TAGS)
vpc.attach_internet_gateway(InternetGatewayId=igw.id)
rt = list(vpc.route_tables.all())[0]
rt.create_route(DestinationCidrBlock="0.0.0.0/0", GatewayId=igw.id)


# ══════════════════════════════════════════════════════════════════════════════
#  3. SECURITY GROUPS
# ══════════════════════════════════════════════════════════════════════════════
section("SECURITY GROUPS")

def make_sg(name, desc, rules):
    sg = ec2.create_security_group(GroupName=name, Description=desc, VpcId=vpc.id)
    sg.create_tags(Tags=TAGS)
    if rules:
        sg.authorize_ingress(IpPermissions=rules)
    return sg

if PROFILE == "vulnerable":
    sg1 = make_sg(SG_NAME_1, "DEMO: SSH open to internet", [{
        "IpProtocol": "tcp", "FromPort": 22, "ToPort": 22,
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}], "Ipv6Ranges": [{"CidrIpv6": "::/0"}],
    }])
    ok(f"SG {sg1.id}: SSH 0.0.0.0/0  → AWS-SG-001 (CRITICAL)")
    created.append(("SG (SSH open)", sg1.id, "AWS-SG-001", "CRITICAL"))

    sg2 = make_sg(SG_NAME_2, "DEMO: RDP open to internet", [{
        "IpProtocol": "tcp", "FromPort": 3389, "ToPort": 3389,
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
    }])
    ok(f"SG {sg2.id}: RDP 0.0.0.0/0  → AWS-SG-002 (CRITICAL)")
    created.append(("SG (RDP open)", sg2.id, "AWS-SG-002", "CRITICAL"))

    sg3 = make_sg(SG_NAME_3, "DEMO: all traffic open", [{
        "IpProtocol": "-1", "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
    }])
    ok(f"SG {sg3.id}: ALL traffic  → AWS-SG-003 (CRITICAL)")
    created.append(("SG (all open)", sg3.id, "AWS-SG-003", "CRITICAL"))

elif PROFILE == "moderate":
    sg1 = make_sg(SG_NAME_1, "DEMO: HTTP open", [{
        "IpProtocol": "tcp", "FromPort": 80, "ToPort": 80,
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
    }])
    ok(f"SG {sg1.id}: HTTP(80) 0.0.0.0/0  → AWS-SG-004 (MEDIUM)")
    created.append(("SG (HTTP open)", sg1.id, "AWS-SG-004", "MEDIUM"))

    sg2 = make_sg(SG_NAME_2, "DEMO: HTTPS only", [{
        "IpProtocol": "tcp", "FromPort": 443, "ToPort": 443,
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
    }])
    ok(f"SG {sg2.id}: HTTPS only — compliant")
    created.append(("SG (HTTPS only)", sg2.id, "-", "PASS"))
    sg3 = sg2  # reuse for EC2

else:  # secure
    sg1 = make_sg(SG_NAME_1, "DEMO: HTTPS only", [{
        "IpProtocol": "tcp", "FromPort": 443, "ToPort": 443,
        "IpRanges": [{"CidrIp": "0.0.0.0/0"}],
    }])
    ok(f"SG {sg1.id}: HTTPS only — compliant")
    created.append(("SG (HTTPS only)", sg1.id, "-", "PASS"))
    sg2 = sg1
    sg3 = sg1


# ══════════════════════════════════════════════════════════════════════════════
#  4. IAM
# ══════════════════════════════════════════════════════════════════════════════
section("IAM")

if PROFILE == "vulnerable":
    iam.update_account_password_policy(
        MinimumPasswordLength=6, RequireUppercaseCharacters=False,
        RequireLowercaseCharacters=False, RequireNumbers=False,
        RequireSymbols=False, AllowUsersToChangePassword=True,
        MaxPasswordAge=365, PasswordReusePrevention=1,
    )
    ok("Weak password policy (len=6, no complexity, 365-day expiry)  → AWS-IAM-003..010 (HIGH)")
    created.append(("IAM Password Policy (weak)", "account-level", "AWS-IAM-003..010", "HIGH"))

    try:
        iam.create_user(UserName=IAM_USER_NAME, Tags=[{"Key": "project", "Value": TAG}])
        key = iam.create_access_key(UserName=IAM_USER_NAME)["AccessKey"]
        ok(f"IAM user '{IAM_USER_NAME}' with access key, no MFA  → AWS-IAM-011..013 (HIGH)")
        created.append(("IAM User (no MFA)", IAM_USER_NAME, "AWS-IAM-011,012,013", "HIGH"))
    except ClientError as e:
        err(f"IAM user: {e.response['Error']['Message']}")

elif PROFILE == "moderate":
    iam.update_account_password_policy(
        MinimumPasswordLength=10, RequireUppercaseCharacters=True,
        RequireLowercaseCharacters=True, RequireNumbers=True,
        RequireSymbols=False, AllowUsersToChangePassword=True,
        MaxPasswordAge=180, PasswordReusePrevention=5,
    )
    ok("Medium password policy (len=10, no symbols, 180-day expiry)  → AWS-IAM-006,009 (MEDIUM)")
    created.append(("IAM Password Policy (medium)", "account-level", "AWS-IAM-006,009", "MEDIUM"))

    try:
        iam.create_user(UserName=IAM_USER_NAME, Tags=[{"Key": "project", "Value": TAG}])
        ok(f"IAM user '{IAM_USER_NAME}' (no MFA, no key)  → AWS-IAM-011 (MEDIUM)")
        created.append(("IAM User (no MFA)", IAM_USER_NAME, "AWS-IAM-011", "MEDIUM"))
    except ClientError as e:
        err(f"IAM user: {e.response['Error']['Message']}")

else:  # secure
    iam.update_account_password_policy(
        MinimumPasswordLength=14, RequireUppercaseCharacters=True,
        RequireLowercaseCharacters=True, RequireNumbers=True,
        RequireSymbols=True, AllowUsersToChangePassword=True,
        MaxPasswordAge=90, PasswordReusePrevention=24, HardExpiry=False,
    )
    ok("Strong password policy — compliant")
    created.append(("IAM Password Policy (secure)", "account-level", "-", "PASS"))


# ══════════════════════════════════════════════════════════════════════════════
#  5. CLOUDTRAIL
# ══════════════════════════════════════════════════════════════════════════════
section("CLOUDTRAIL")

if make_bucket(TRAIL_BUCKET):
    s3.put_bucket_policy(Bucket=TRAIL_BUCKET, Policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {"Sid": "AWSCloudTrailAclCheck", "Effect": "Allow",
             "Principal": {"Service": "cloudtrail.amazonaws.com"},
             "Action": "s3:GetBucketAcl",
             "Resource": f"arn:aws:s3:::{TRAIL_BUCKET}"},
            {"Sid": "AWSCloudTrailWrite", "Effect": "Allow",
             "Principal": {"Service": "cloudtrail.amazonaws.com"},
             "Action": "s3:PutObject",
             "Resource": f"arn:aws:s3:::{TRAIL_BUCKET}/AWSLogs/{ACCOUNT_ID}/*",
             "Condition": {"StringEquals": {"s3:x-amz-acl": "bucket-owner-full-control"}}},
        ]
    }))
    try:
        if PROFILE == "vulnerable":
            trail = ct.create_trail(
                Name=TRAIL_NAME, S3BucketName=TRAIL_BUCKET,
                IncludeGlobalServiceEvents=False, IsMultiRegionTrail=False,
                EnableLogFileValidation=False,
            )
            ct.start_logging(Name=TRAIL_NAME)
            ok(f"CloudTrail '{TRAIL_NAME}': no validation, single-region  → AWS-CT-001..008 (HIGH)")
            created.append(("CloudTrail (no validation)", TRAIL_NAME, "AWS-CT-001,002,003,004", "HIGH"))
        elif PROFILE == "moderate":
            trail = ct.create_trail(
                Name=TRAIL_NAME, S3BucketName=TRAIL_BUCKET,
                IncludeGlobalServiceEvents=False, IsMultiRegionTrail=False,
                EnableLogFileValidation=True,
            )
            ct.start_logging(Name=TRAIL_NAME)
            ok(f"CloudTrail '{TRAIL_NAME}': single-region, no global events  → AWS-CT-003,004 (MEDIUM)")
            created.append(("CloudTrail (single-region)", TRAIL_NAME, "AWS-CT-003,004", "MEDIUM"))
        else:  # secure
            trail = ct.create_trail(
                Name=TRAIL_NAME, S3BucketName=TRAIL_BUCKET,
                IncludeGlobalServiceEvents=True, IsMultiRegionTrail=True,
                EnableLogFileValidation=True,
            )
            ct.start_logging(Name=TRAIL_NAME)
            ok(f"CloudTrail '{TRAIL_NAME}': fully compliant")
            created.append(("CloudTrail (compliant)", TRAIL_NAME, "-", "PASS"))
    except ClientError as e:
        err(f"CloudTrail: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  6. KMS
# ══════════════════════════════════════════════════════════════════════════════
section("KMS KEY")

key_id = None
try:
    kms_key = kms.create_key(
        Description=f"CSPM demo key — profile={PROFILE}",
        Tags=[{"TagKey": "project", "TagValue": TAG}],
    )
    key_id = kms_key["KeyMetadata"]["KeyId"]
    if PROFILE in ("moderate", "vulnerable"):
        kms.disable_key_rotation(KeyId=key_id)
        ok(f"KMS key {key_id}: rotation disabled  → AWS-KMS-001 (MEDIUM)")
        created.append(("KMS Key (no rotation)", key_id, "AWS-KMS-001", "MEDIUM"))
    else:
        kms.enable_key_rotation(KeyId=key_id)
        ok(f"KMS key {key_id}: rotation enabled — compliant")
        created.append(("KMS Key (compliant)", key_id, "-", "PASS"))
    kms.create_alias(AliasName=KMS_ALIAS, TargetKeyId=key_id)
except ClientError as e:
    err(f"KMS: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  7. SNS
# ══════════════════════════════════════════════════════════════════════════════
section("SNS TOPIC")

try:
    sns_attrs = {}
    if PROFILE == "secure" and key_id:
        sns_attrs = {"KmsMasterKeyId": key_id}
    topic = sns.create_topic(Name=SNS_NAME,
                             Attributes=sns_attrs,
                             Tags=[{"Key": "project", "Value": TAG}])
    if PROFILE in ("moderate", "vulnerable"):
        ok(f"SNS topic '{SNS_NAME}': no encryption  → AWS-SNS-001 (MEDIUM)")
        created.append(("SNS Topic (no encryption)", topic["TopicArn"], "AWS-SNS-001", "MEDIUM"))
    else:
        ok(f"SNS topic '{SNS_NAME}': KMS encrypted — compliant")
        created.append(("SNS Topic (compliant)", topic["TopicArn"], "-", "PASS"))
except ClientError as e:
    err(f"SNS: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  8. SQS
# ══════════════════════════════════════════════════════════════════════════════
section("SQS QUEUE")

try:
    sqs_attrs = {}
    if PROFILE == "secure" and key_id:
        sqs_attrs = {"KmsMasterKeyId": key_id}
    queue = sqs.create_queue(QueueName=SQS_NAME,
                              Attributes=sqs_attrs,
                              tags={"project": TAG})
    if PROFILE in ("moderate", "vulnerable"):
        ok(f"SQS queue '{SQS_NAME}': no encryption  → AWS-SQS-001 (MEDIUM)")
        created.append(("SQS Queue (no encryption)", queue["QueueUrl"], "AWS-SQS-001", "MEDIUM"))
    else:
        ok(f"SQS queue '{SQS_NAME}': KMS encrypted — compliant")
        created.append(("SQS Queue (compliant)", queue["QueueUrl"], "-", "PASS"))
except ClientError as e:
    err(f"SQS: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  9. LAMBDA
# ══════════════════════════════════════════════════════════════════════════════
section("LAMBDA FUNCTION")

try:
    trust = {"Version": "2012-10-17", "Statement": [{
        "Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]}
    role = iam.create_role(
        RoleName=LAMBDA_ROLE_NAME,
        AssumeRolePolicyDocument=json.dumps(trust),
        Tags=[{"Key": "project", "Value": TAG}],
    )
    role_arn = role["Role"]["Arn"]
    iam.attach_role_policy(RoleName=LAMBDA_ROLE_NAME,
                            PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole")
    time.sleep(10)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("handler.py", "def handler(event, context): return 'cspm-demo'")
    buf.seek(0)

    fn_kwargs = dict(
        FunctionName=LAMBDA_NAME,
        Runtime="python3.11",
        Role=role_arn,
        Handler="handler.handler",
        Code={"ZipFile": buf.read()},
        Description=f"CSPM demo — profile={PROFILE}",
        Tags={"project": TAG},
    )
    if PROFILE == "vulnerable":
        fn_kwargs["Environment"] = {"Variables": {"SECRET_KEY": "hardcoded-insecure-value"}}
    elif PROFILE == "secure" and key_id:
        fn_kwargs["KMSKeyArn"] = f"arn:aws:kms:{REGION}:{ACCOUNT_ID}:key/{key_id}"

    lam.create_function(**fn_kwargs)
    if PROFILE == "vulnerable":
        ok(f"Lambda '{LAMBDA_NAME}': no KMS, no DLQ, hardcoded env var  → AWS-LAMBDA-001..005 (MEDIUM/HIGH)")
        created.append(("Lambda (insecure)", LAMBDA_NAME, "AWS-LAMBDA-001,002,005", "MEDIUM"))
    elif PROFILE == "moderate":
        ok(f"Lambda '{LAMBDA_NAME}': no KMS, no DLQ  → AWS-LAMBDA-001,002 (MEDIUM)")
        created.append(("Lambda (no encryption)", LAMBDA_NAME, "AWS-LAMBDA-001,002", "MEDIUM"))
    else:
        ok(f"Lambda '{LAMBDA_NAME}': KMS encrypted — compliant")
        created.append(("Lambda (compliant)", LAMBDA_NAME, "-", "PASS"))
except ClientError as e:
    err(f"Lambda: {e.response['Error']['Message']}")


# ══════════════════════════════════════════════════════════════════════════════
#  10. EC2 (vulnerable only — most expensive resource)
# ══════════════════════════════════════════════════════════════════════════════
if PROFILE == "vulnerable":
    section("EC2 INSTANCE — t2.micro, public IP, IMDSv2 disabled")
    amis = ec2c.describe_images(
        Filters=[
            {"Name": "name",       "Values": ["amzn2-ami-hvm-*-x86_64-gp2"]},
            {"Name": "state",      "Values": ["available"]},
            {"Name": "owner-alias","Values": ["amazon"]},
        ],
        Owners=["amazon"],
    )
    amis_sorted = sorted(amis["Images"], key=lambda x: x["CreationDate"], reverse=True)
    if amis_sorted:
        ami_id = amis_sorted[0]["ImageId"]
        try:
            instances = ec2c.run_instances(
                ImageId=ami_id, InstanceType="t2.micro", MinCount=1, MaxCount=1,
                SubnetId=subnet.id, SecurityGroupIds=[sg1.id, sg3.id],
                MetadataOptions={"HttpTokens": "optional", "HttpEndpoint": "enabled"},
                Monitoring={"Enabled": False},
                TagSpecifications=[{"ResourceType": "instance",
                                    "Tags": TAGS + [{"Key": "Name", "Value": "cspm-demo-instance"}]}],
            )
            iid = instances["Instances"][0]["InstanceId"]
            ok(f"EC2 {iid}: public IP, IMDSv2 optional, open SGs  → AWS-EC2-001..007 (HIGH)")
            created.append(("EC2 Instance (public)", iid, "AWS-EC2-001..007", "HIGH"))
            info("  ⚠  Terminate this instance after the demo to avoid charges")
        except ClientError as e:
            err(f"EC2: {e.response['Error']['Message']}")
    else:
        err("Could not find Amazon Linux 2 AMI — skipping EC2")


# ══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
section(f"DEPLOYMENT COMPLETE — profile={PROFILE}  team={TEAM or 'default'}")

print(f"\n  Suffix: {BOLD}{SUFFIX}{RESET}  |  AWS Account: {ACCOUNT_ID}  |  Region: {REGION}\n")
print(f"  {'RESOURCE':<35} {'NAME/ID':<42} {'RULE':<25} {'SEVERITY'}")
print(f"  {'─'*35} {'─'*42} {'─'*25} {'─'*8}")
for (rtype, name, rule, sev) in created:
    col = {"CRITICAL": "\033[31m", "HIGH": "\033[33m", "MEDIUM": "\033[34m",
           "LOW": "\033[37m", "PASS": "\033[32m"}.get(sev, "")
    print(f"  {rtype:<35} {str(name)[:42]:<42} {rule:<25} {col}{sev}{RESET}")

print(f"""
  ──────────────────────────────────────────────────────────
  NEXT STEPS:
  1. Add this AWS account to Vanguard (use credentials from .env)
  2. Click SCAN — expected findings depend on profile:
     secure={GREEN}~3–8 (LOW){RESET}  moderate={YELLOW}~12–20 (MEDIUM/HIGH){RESET}  vulnerable={RED}~30–40 (CRITICAL+){RESET}
  CLEANUP:
  python3 demo_infra/cleanup_vulnerable_aws.py --team {TEAM or 'default'}
  ──────────────────────────────────────────────────────────
""")

# Save suffix for cleanup
with open(SUFFIX_FILE, "w") as f:
    f.write(f"{SUFFIX}\n{ACCOUNT_ID}\n{REGION}\n{vpc.id}\n{subnet.id}\n{igw.id}")
print(f"  Suffix saved to {SUFFIX_FILE}")
