<div align="center">

```
██╗   ██╗ █████╗ ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗
██║   ██║██╔══██╗████╗  ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
██║   ██║███████║██╔██╗ ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║
╚██╗ ██╔╝██╔══██║██║╚██╗██║██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║
 ╚████╔╝ ██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
```

### Multi-Cloud Security Posture Management

**Scan · Score · Alert · Remediate**

[![AWS](https://img.shields.io/badge/AWS-Supported-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com)
[![Azure](https://img.shields.io/badge/Azure-Supported-0089D6?style=flat-square&logo=microsoftazure&logoColor=white)](https://azure.microsoft.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)

</div>

---

## What is Vanguard?

Vanguard continuously scans your AWS and Azure environments for security misconfigurations, scores your posture on a 0–100 scale, and fires alerts the moment something falls below your threshold — before attackers find it first.

```
  Your Cloud Accounts          Vanguard Engine            You
  ─────────────────    →    ──────────────────    →    ──────
  AWS · Azure               Scan → Score → Alert       Dashboard
  Hundreds of resources     345+ built-in rules        Real-time findings
  Multiple teams            Multi-team RBAC            Email alerts
```

---

## Features

| | Feature | Description |
|---|---|---|
| 🔍 | **Multi-Cloud Scanning** | AWS and Azure with 345+ built-in security rules across CIS, NIST, PCI-DSS, SOC 2, ISO 27001, GDPR, HIPAA |
| 📊 | **Security Scoring** | Per-account posture score (0–100) weighted by finding severity |
| 📈 | **Scan History** | Track posture over time, compare changes between scans |
| 👥 | **Multi-Team RBAC** | Teams with four roles — superadmin, admin, analyst, viewer. Each team sees only their own accounts |
| 🔐 | **MFA Support** | TOTP-based two-factor authentication for all user accounts |
| ⏱️ | **Scheduled Scanning** | Automatic background scans at configurable intervals |
| 🔔 | **Smart Alerting** | Per-account alert thresholds with email notifications |
| 📋 | **Audit Log** | Every action logged with user, timestamp, and IP |
| ⚙️ | **Custom Rules** | Write your own compliance checks on top of the built-in library |
| 📤 | **Export Reports** | Download findings as CSV or JSON per scan |
| 🧪 | **Demo Automation** | One-command deploy/destroy of multi-team demo environments across 3 security profiles |

---

## Roles

```
SUPERADMIN  ──────────────────────────────────────────────────────  Full access
   │         User management · System alerts · All teams · All accounts
   │
ADMIN  ────────────────────────────────────────────────────────────  Team lead
   │         All scans · All accounts within team · Configure alerts
   │
ANALYST  ──────────────────────────────────────────────────────────  Operator
   │         Run scans · Manage accounts · View findings
   │
VIEWER  ───────────────────────────────────────────────────────────  Read-only
             View results · See alert status · No edits
```

---

## Installation

### Mac — with Docker

> **Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) · Python 3

```bash
git clone https://github.com/anishdoulagar/Vanguard.git
cd Vanguard
bash scripts/setup.sh
```

Dashboard is live at `http://localhost:5173`. The first account you create becomes superadmin.

**Day-to-day commands:**
```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f backend

# Full reset (wipes all data)
docker compose down -v
```

---

### Mac — without Docker

**1. Install dependencies**
```bash
brew install postgresql@16 node python3 git
brew services start postgresql@16
```

**2. Set up PostgreSQL**
```bash
psql postgres -c "CREATE USER cspm_user WITH PASSWORD 'changeme_strong_password';"
psql postgres -c "CREATE DATABASE cspm OWNER cspm_user;"
```

**3. Clone the repo**
```bash
git clone https://github.com/anishdoulagar/Vanguard.git
cd Vanguard
```

**4. Configure environment**
```bash
cp .env.example .env
python3 scripts/generate_keys.py
```
Open `.env` and add:
```env
DATABASE_URL=postgresql://cspm_user:changeme_strong_password@localhost:5432/cspm
```

**5. Start the backend** _(terminal 1)_
```bash
cd CSPM-Tool
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload
```

**6. Start the frontend** _(terminal 2)_
```bash
cd CSPM-Dashboard
npm install
npm run dev -- --host
```

Dashboard is live at `http://localhost:5173`.

> **Every reboot:** run `brew services start postgresql@16` before starting the project.

---

### Linux / Kali — with Docker

**1. Install Docker and Docker Compose**
```bash
sudo apt update
sudo apt install -y docker.io docker-compose python3 git
```

**2. Start Docker and add your user**
```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $(whoami)
newgrp docker
```

**3. Clone and run**
```bash
git clone https://github.com/anishdoulagar/Vanguard.git
cd Vanguard
bash scripts/setup.sh
```

Dashboard is live at `http://localhost:5173`.

> **Every reboot:** run `sudo systemctl start docker` before starting the project.

**Day-to-day commands:**
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f backend

# Full reset (wipes all data)
docker-compose down -v
```

---

### Linux / Kali — without Docker

**1. Install dependencies**
```bash
sudo apt update && sudo apt install -y postgresql python3 python3-pip python3-venv nodejs npm git
```
> Node 18+ required. If `node -v` is below 18: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt install -y nodejs`

**2. Clone the repo**
```bash
git clone https://github.com/anishdoulagar/Vanguard.git
cd Vanguard
```

**3. Set up PostgreSQL**
```bash
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER cspm_user WITH PASSWORD 'changeme_strong_password';"
sudo -u postgres psql -c "CREATE DATABASE cspm OWNER cspm_user;"
```

**4. Configure environment**
```bash
cp .env.example .env
python3 scripts/generate_keys.py
```
Open `.env` and add:
```env
DATABASE_URL=postgresql://cspm_user:changeme_strong_password@localhost:5432/cspm
```

**5. Start the backend** _(terminal 1)_
```bash
cd CSPM-Tool
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload
```

**6. Start the frontend** _(terminal 2)_
```bash
cd CSPM-Dashboard
npm install
npm run dev -- --host
```

Dashboard is live at `http://localhost:5173`.

> **Every reboot:** start PostgreSQL (`sudo systemctl start postgresql`), then re-run the backend and frontend commands.

---

### Windows — with Docker

**1. Install prerequisites**
- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) — enable WSL 2 backend during install
- [Python 3](https://www.python.org/downloads/) — check "Add to PATH" during install
- [Git for Windows](https://git-scm.com/download/win)

**2. Open PowerShell and run**
```powershell
git clone https://github.com/anishdoulagar/Vanguard.git
cd Vanguard
python scripts\generate_keys.py
copy .env.example .env
docker compose up --build -d
```

Dashboard is live at `http://localhost:5173`.

**Day-to-day commands (PowerShell):**
```powershell
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f backend

# Full reset (wipes all data)
docker compose down -v
```

> Docker Desktop must be running before you use any `docker compose` command on Windows.

---

### Windows — without Docker

**1. Install prerequisites**
- [PostgreSQL](https://www.postgresql.org/download/windows/) — remember the password you set for the `postgres` user
- [Node.js 20+](https://nodejs.org/en/download)
- [Python 3](https://www.python.org/downloads/) — check "Add to PATH" during install
- [Git for Windows](https://git-scm.com/download/win)

**2. Set up PostgreSQL** _(in PowerShell)_
```powershell
psql -U postgres -c "CREATE USER cspm_user WITH PASSWORD 'changeme_strong_password';"
psql -U postgres -c "CREATE DATABASE cspm OWNER cspm_user;"
```

**3. Clone the repo**
```powershell
git clone https://github.com/anishdoulagar/Vanguard.git
cd Vanguard
```

**4. Configure environment**
```powershell
copy .env.example .env
python scripts\generate_keys.py
```
Open `.env` in Notepad and add:
```env
DATABASE_URL=postgresql://cspm_user:changeme_strong_password@localhost:5432/cspm
```

**5. Start the backend** _(terminal 1)_
```powershell
cd CSPM-Tool
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload
```

**6. Start the frontend** _(terminal 2)_
```powershell
cd CSPM-Dashboard
npm install
npm run dev -- --host
```

Dashboard is live at `http://localhost:5173`.

> **Every reboot:** PostgreSQL runs as a Windows service automatically. Just re-run the backend and frontend commands.

---

## Demo Infrastructure

The `demo_infra/` directory provides a complete one-command system to deploy intentionally misconfigured cloud environments for testing and presentations. It creates three teams with different security profiles across both AWS and Azure, provisions Vanguard with users and accounts automatically, and tears everything down cleanly when you're done.

### Full Multi-Team Demo (recommended for presentations)

Deploys 6 cloud environments (3 AWS + 3 Azure) across three teams with different security postures, then provisions Vanguard with teams, users, and accounts automatically.

```bash
# 1. Copy and fill in your credentials
cp demo_infra/.env.example demo_infra/.env

# 2. Deploy everything (~15–25 min)
python3 demo_infra/demo_manager.py demo

# 3. Tear everything down when done
python3 demo_infra/demo_destroy_all.py --yes
```

**What gets deployed:**

| Team | AWS Region | Azure Resource Group | Profile | Expected Score |
|---|---|---|---|---|
| Demo Alpha — Financial | us-east-1 | cspm-demo-alpha | Secure | 85–95 |
| Demo Beta — Operations | us-west-2 | cspm-demo-beta | Moderate | 60–72 |
| Demo Gamma — Legacy | eu-west-1 | cspm-demo-gamma | Vulnerable | 25–40 |

**Demo users created automatically** (password: `VanguardDemo2024!`):

| Username | Role | Team Access |
|---|---|---|
| alice_demo | Superadmin | All teams |
| bob_demo | Admin | Team Alpha only |
| carol_demo | Analyst | Team Alpha only |
| dave_demo | Admin | Team Beta only |
| eve_demo | Analyst | Team Beta only |
| frank_demo | Admin | Team Gamma only |

### Single Environment Deploy

```bash
# Deploy one environment at a time
python3 demo_infra/demo_manager.py deploy azure   # ~5 min · ~$0.05/hr
python3 demo_infra/demo_manager.py deploy aws     # ~3 min · ~$0.01/hr

# Check what's running
python3 demo_infra/demo_manager.py status

# Destroy when done (stops billing)
python3 demo_infra/demo_manager.py destroy azure
python3 demo_infra/demo_manager.py destroy aws
```

See [`demo_infra/README.md`](demo_infra/README.md) for credential setup instructions and the full list of expected findings per profile.

---

## Configuration

### Cloud Credentials

Add credentials in the dashboard under **Accounts → Add Account**:

| Cloud | What you need |
|-------|--------------|
| **AWS** | Access Key ID + Secret Access Key + Region |
| **Azure** | Tenant ID + Client ID + Client Secret (Service Principal) + Subscription ID |

### Email Alerts _(optional)_

Edit `.env` with your SMTP provider. [Brevo](https://www.brevo.com) is recommended — free, 300 emails/day, no credit card:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=your-brevo-smtp-key
SMTP_FROM=you@example.com
```

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│  Frontend      React 18 · Vite · Recharts               │
│  Backend       FastAPI · Python · asyncio               │
│  Database      PostgreSQL 16                            │
│  Auth          JWT (HS256) · bcrypt · TOTP MFA          │
│  Infra         Docker · Docker Compose · Nginx (prod)  │
│  Cloud SDKs    boto3 (AWS) · azure-sdk (Azure)         │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Vanguard/
├── CSPM-Tool/                    # Backend
│   ├── api/server.py             # All REST endpoints
│   ├── auth/                     # JWT · bcrypt · TOTP MFA · role guards
│   ├── connectors/
│   │   ├── aws_connector.py      # Scans 30+ AWS services via boto3
│   │   └── azure_connector.py    # Scans 25+ Azure services via azure-sdk
│   ├── database/                 # Schema · models · connection pooling
│   ├── policies/
│   │   ├── aws_rules.py          # 200+ AWS security rules
│   │   ├── azure_rules.py        # 137+ Azure security rules
│   │   └── custom_rules.py       # User-defined rules
│   ├── notifications/
│   │   ├── email_engine.py       # SMTP email alerts
│   │   └── slack_engine.py       # Slack webhook notifications
│   ├── scheduler/engine.py       # Background scan scheduler
│   └── scoring/risk_scorer.py    # 0–100 posture score algorithm
│
├── CSPM-Dashboard/               # Frontend (React + Vite)
│   └── src/pages/
│       ├── DashboardPage.jsx     # Overview · scores · findings summary
│       ├── AccountsPage.jsx      # Manage cloud account connections
│       ├── PoliciesPage.jsx      # Browse all 345+ rules by framework
│       ├── HistoryPage.jsx       # Scan history · score trends
│       ├── AlertsPage.jsx        # Alert thresholds · notification config
│       ├── AuditPage.jsx         # Full user action audit log
│       ├── UsersPage.jsx         # User management (superadmin)
│       ├── TeamsPage.jsx         # Team management (superadmin)
│       └── AuthPage.jsx          # Login · MFA · registration
│
├── demo_infra/                   # Demo environment automation
│   ├── demo_manager.py           # Main CLI: deploy / destroy / status / demo
│   ├── demo_full.py              # Full 3-team × 2-cloud orchestrator
│   ├── demo_destroy_all.py       # Full teardown (cloud + Vanguard data)
│   ├── vanguard_api.py           # REST client for Vanguard provisioning
│   ├── deploy_vulnerable_aws.py  # AWS deploy (secure / moderate / vulnerable)
│   ├── deploy_vulnerable_azure.py# Azure deploy (secure / moderate / vulnerable)
│   ├── deploy_azure_missing.py   # Azure extras: Key Vault, SQL, VM
│   ├── cleanup_vulnerable_aws.py # AWS teardown
│   ├── cleanup_vulnerable_azure.py# Azure teardown
│   ├── load_env.py               # .env loader for demo scripts
│   ├── .env.example              # Credential template (copy → .env)
│   └── README.md                 # Demo infra setup guide
│
├── scripts/
│   ├── setup.sh                  # One-command setup (Mac/Linux + Docker)
│   └── generate_keys.py          # Secret key generator
│
├── docker-compose.yml            # Container orchestration
└── .env.example                  # Root environment template
```

---

<div align="center">

Built for teams who take cloud security seriously.

</div>
