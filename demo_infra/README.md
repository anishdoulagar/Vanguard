# Vanguard CSPM — Demo Infrastructure

Spin up intentionally **misconfigured** cloud resources to test Vanguard's CSPM scanning end-to-end, then destroy everything with one command so you are not charged for idle resources.

---

## Quick Start

### 1. Set up credentials (one time)

```bash
cp demo_infra/.env.example demo_infra/.env
```

Open `demo_infra/.env` and fill in your credentials:

**Azure** — create a Service Principal:
```bash
az ad sp create-for-rbac --name cspm-demo --role Contributor \
  --scopes /subscriptions/<your-subscription-id>
```
Copy `appId` → `AZURE_CLIENT_ID`, `password` → `AZURE_CLIENT_SECRET`, `tenant` → `AZURE_TENANT_ID`.

**AWS** — create an IAM user with programmatic access (AdministratorAccess policy), then paste the access key and secret key.

### 2. Install dependencies

```bash
pip install azure-identity azure-mgmt-resource azure-mgmt-storage \
            azure-mgmt-network azure-mgmt-keyvault azure-mgmt-sql \
            azure-mgmt-compute boto3
```

---

## Usage

All commands run from the **repo root**:

```bash
# Deploy
python3 demo_infra/demo_manager.py deploy azure   # ~5 min
python3 demo_infra/demo_manager.py deploy aws     # ~3 min

# Check what is running
python3 demo_infra/demo_manager.py status

# Destroy (run this when done — stops billing)
python3 demo_infra/demo_manager.py destroy azure
python3 demo_infra/demo_manager.py destroy aws
```

---

## What Gets Deployed

### Azure (~$0.05/hour)
| Resource | Misconfiguration | Expected Rules |
|---|---|---|
| 3 Storage Accounts | Public blob, no HTTPS, weak TLS, no soft-delete | AZ-ST-001–009 |
| 2 NSGs | SSH + RDP open to 0.0.0.0/0 | AZ-NSG-001–006 |
| 1 Key Vault | No soft-delete, no purge protection | AZ-KV-001–009 |
| 1 SQL Server | Public access, TLS 1.0, no auditing | AZ-SQL-001–007 |
| 1 Linux VM | Password auth, no disk encryption | AZ-VM-001–007 |

### AWS (~$0.01/hour)
| Resource | Misconfiguration | Expected Rules |
|---|---|---|
| 4 S3 Buckets | Public access, no encryption, no versioning | AWS-S3-001–009 |
| 3 Security Groups | SSH/RDP/all traffic open to 0.0.0.0/0 | AWS-SG-001–005 |
| 1 EC2 Instance | Public IP, IMDSv2 disabled | AWS-EC2-001–007 |
| 1 CloudTrail | No log validation, no CloudWatch | AWS-CT-001–008 |
| IAM + Password Policy | No MFA, weak policy | AWS-IAM-001–010 |

### Expected Total Findings
| Severity | Count |
|---|---|
| CRITICAL | 5–8 |
| HIGH | 10–15 |
| MEDIUM | 8–12 |
| LOW | 4–6 |

---

## Security Notes

- `demo_infra/.env` is **gitignored** — credentials are never committed
- All resources are tagged `project: cspm-demo` for easy identification
- Run `destroy` immediately after testing — do not leave resources running overnight
- The deployed resources are intentionally insecure — do not store real data in them
