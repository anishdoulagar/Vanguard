"""
cleanup_vulnerable_aws.py
=========================
Tears down all resources created by deploy_vulnerable_aws.py.
Run this immediately after your demo.

USAGE:
  python3 cleanup_vulnerable_aws.py              # reads suffix from .aws_demo_suffix
  python3 cleanup_vulnerable_aws.py --suffix abc12345
"""

import boto3, sys, time, pathlib
from botocore.exceptions import ClientError

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from load_env import load_env
load_env()

# ── Read suffix ───────────────────────────────────────────────────────────────
suffix = vpc_id = subnet_id = igw_id = account_id = region = None

if "--suffix" in sys.argv:
    suffix = sys.argv[sys.argv.index("--suffix") + 1]
    region = "us-east-1"
    account_id = boto3.client("sts").get_caller_identity()["Account"]
else:
    try:
        lines = open("demo_infra/.aws_demo_suffix").read().strip().split("\n")
        suffix, account_id, region = lines[0], lines[1], lines[2]
        vpc_id = lines[3] if len(lines) > 3 else None
        subnet_id = lines[4] if len(lines) > 4 else None
        igw_id = lines[5] if len(lines) > 5 else None
    except FileNotFoundError:
        print("ERROR: No .aws_demo_suffix file found. Use --suffix <suffix>")
        sys.exit(1)

print(f"Cleaning up cspm-demo resources with suffix: {suffix}")

session = boto3.Session(region_name=region)
s3c  = session.client("s3")
ec2c = session.client("ec2")
ec2  = session.resource("ec2")
iam  = session.client("iam")
ct   = session.client("cloudtrail")
lam  = session.client("lambda")
sns  = session.client("sns")
sqs  = session.client("sqs")
kms  = session.client("kms")

def ok(msg):  print(f"  \033[32m✓\033[0m  {msg}")
def err(msg): print(f"  \033[31m✗\033[0m  {msg}")

def delete_bucket(name):
    try:
        # Delete all objects first
        paginator = s3c.get_paginator("list_object_versions")
        for page in paginator.paginate(Bucket=name):
            for v in page.get("Versions", []) + page.get("DeleteMarkers", []):
                s3c.delete_object(Bucket=name, Key=v["Key"], VersionId=v["VersionId"])
        # Delete any remaining objects (unversioned)
        paginator2 = s3c.get_paginator("list_objects_v2")
        for page in paginator2.paginate(Bucket=name):
            for obj in page.get("Contents", []):
                s3c.delete_object(Bucket=name, Key=obj["Key"])
        # Remove policy
        try:
            s3c.delete_bucket_policy(Bucket=name)
        except Exception:
            pass
        s3c.delete_bucket(Bucket=name)
        ok(f"Deleted bucket: {name}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchBucket":
            ok(f"Bucket already gone: {name}")
        else:
            err(f"Bucket {name}: {e.response['Error']['Message']}")

# S3 buckets
for prefix in ["cspm-demo-public", "cspm-demo-noenc", "cspm-demo-nover",
               "cspm-demo-nolog", "cspm-demo-trail-logs"]:
    delete_bucket(f"{prefix}-{suffix}")

# EC2 instances tagged cspm-demo
print("\nTerminating EC2 instances...")
try:
    resp = ec2c.describe_instances(Filters=[
        {"Name": "tag:project", "Values": ["cspm-demo"]},
        {"Name": "instance-state-name", "Values": ["running", "stopped", "pending"]},
    ])
    ids = [i["InstanceId"] for r in resp["Reservations"] for i in r["Instances"]]
    if ids:
        ec2c.terminate_instances(InstanceIds=ids)
        ok(f"Terminating instances: {ids}")
        # Wait for termination
        waiter = ec2c.get_waiter("instance_terminated")
        waiter.wait(InstanceIds=ids)
        ok("All instances terminated")
    else:
        ok("No instances found")
except Exception as e:
    err(f"EC2 termination: {e}")

# Security groups
print("\nDeleting security groups...")
for sg_name in [f"cspm-demo-open-ssh-{suffix}", f"cspm-demo-open-rdp-{suffix}",
                f"cspm-demo-open-all-{suffix}"]:
    try:
        sgs = ec2c.describe_security_groups(
            Filters=[{"Name": "group-name", "Values": [sg_name]}]
        )["SecurityGroups"]
        for sg in sgs:
            ec2c.delete_security_group(GroupId=sg["GroupId"])
            ok(f"Deleted SG: {sg_name} ({sg['GroupId']})")
    except Exception as e:
        err(f"SG {sg_name}: {e}")

# CloudTrail
print("\nDeleting CloudTrail...")
try:
    ct.stop_logging(Name=f"cspm-demo-trail-{suffix}")
    ct.delete_trail(Name=f"cspm-demo-trail-{suffix}")
    ok(f"Deleted trail: cspm-demo-trail-{suffix}")
except Exception as e:
    err(f"CloudTrail: {e}")

# VPC (subnet → detach+delete IGW → delete VPC)
print("\nDeleting VPC resources...")
if vpc_id:
    try:
        # Delete subnets
        subnets = ec2c.describe_subnets(Filters=[{"Name": "vpc-id", "Values": [vpc_id]}])["Subnets"]
        for sub in subnets:
            ec2c.delete_subnet(SubnetId=sub["SubnetId"])
            ok(f"Deleted subnet: {sub['SubnetId']}")

        # Detach and delete IGWs
        igws = ec2c.describe_internet_gateways(
            Filters=[{"Name": "attachment.vpc-id", "Values": [vpc_id]}]
        )["InternetGateways"]
        for igw in igws:
            ec2c.detach_internet_gateway(InternetGatewayId=igw["InternetGatewayId"], VpcId=vpc_id)
            ec2c.delete_internet_gateway(InternetGatewayId=igw["InternetGatewayId"])
            ok(f"Deleted IGW: {igw['InternetGatewayId']}")

        ec2c.delete_vpc(VpcId=vpc_id)
        ok(f"Deleted VPC: {vpc_id}")
    except Exception as e:
        err(f"VPC cleanup: {e}")

# Lambda
print("\nDeleting Lambda...")
try:
    lam.delete_function(FunctionName=f"cspm-demo-lambda-{suffix}")
    ok(f"Deleted Lambda: cspm-demo-lambda-{suffix}")
except Exception as e:
    err(f"Lambda: {e}")

# Lambda IAM role
try:
    iam.detach_role_policy(
        RoleName=f"cspm-demo-lambda-role-{suffix}",
        PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    )
    iam.delete_role(RoleName=f"cspm-demo-lambda-role-{suffix}")
    ok(f"Deleted IAM role: cspm-demo-lambda-role-{suffix}")
except Exception as e:
    err(f"Lambda role: {e}")

# IAM user
print("\nDeleting IAM user...")
try:
    uname = f"cspm-demo-user-{suffix}"
    keys = iam.list_access_keys(UserName=uname)["AccessKeyMetadata"]
    for k in keys:
        iam.delete_access_key(UserName=uname, AccessKeyId=k["AccessKeyId"])
    iam.delete_user(UserName=uname)
    ok(f"Deleted IAM user: {uname}")
except Exception as e:
    err(f"IAM user: {e}")

# SNS
print("\nDeleting SNS topic...")
try:
    topics = sns.list_topics()["Topics"]
    for t in topics:
        if f"cspm-demo-topic-{suffix}" in t["TopicArn"]:
            sns.delete_topic(TopicArn=t["TopicArn"])
            ok(f"Deleted SNS topic: {t['TopicArn']}")
except Exception as e:
    err(f"SNS: {e}")

# SQS
print("\nDeleting SQS queue...")
try:
    qs = sqs.list_queues(QueueNamePrefix=f"cspm-demo-queue-{suffix}")
    for url in qs.get("QueueUrls", []):
        sqs.delete_queue(QueueUrl=url)
        ok(f"Deleted SQS queue: {url}")
except Exception as e:
    err(f"SQS: {e}")

# KMS (schedule deletion — minimum 7 days)
print("\nScheduling KMS key deletion...")
try:
    aliases = kms.list_aliases()["Aliases"]
    for a in aliases:
        if f"cspm-demo-key-{suffix}" in a.get("AliasName", ""):
            kid = a["TargetKeyId"]
            kms.delete_alias(AliasName=a["AliasName"])
            kms.schedule_key_deletion(KeyId=kid, PendingWindowInDays=7)
            ok(f"KMS key {kid} scheduled for deletion in 7 days")
except Exception as e:
    err(f"KMS: {e}")

# Reset password policy to sane defaults
print("\nResetting IAM password policy...")
try:
    iam.update_account_password_policy(
        MinimumPasswordLength=14,
        RequireUppercaseCharacters=True,
        RequireLowercaseCharacters=True,
        RequireNumbers=True,
        RequireSymbols=True,
        MaxPasswordAge=90,
        PasswordReusePrevention=24,
        HardExpiry=False,
    )
    ok("Password policy reset to secure defaults")
except Exception as e:
    err(f"Password policy reset: {e}")

print("\n\033[32mCleanup complete.\033[0m\n")
