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
  Any region                Custom rules support       Email alerts
```

---

## Features

| | Feature | Description |
|---|---|---|
| 🔍 | **Multi-Cloud Scanning** | AWS and Azure with 345+ built-in security rules |
| 📊 | **Security Scoring** | Per-service and overall posture score (0–100) |
| 📈 | **Scan History** | Track posture over time, compare changes between scans |
| 📤 | **Export Reports** | Download findings as CSV or JSON per scan |
| ⚙️ | **Custom Rules** | Write your own compliance checks |
| ⏱️ | **Scheduled Scanning** | Automatic background scans — set it and forget it |
| 🔔 | **Smart Alerting** | System-wide alerts (superadmin) + per-user per-account alerts |
| 🔐 | **Role-Based Access** | Four roles with fine-grained permissions |
| 📋 | **Audit Log** | Every action logged with user, timestamp, and IP |

---

## Roles

```
SUPERADMIN  ──────────────────────────────────────────────────────  Full access
   │         User management · System alerts · All accounts · All data
   │
ADMIN  ────────────────────────────────────────────────────────────  Team lead
   │         All scans · All accounts · Configure per-account alerts
   │
ANALYST  ──────────────────────────────────────────────────────────  Operator
   │         Run scans · Manage accounts · Configure own alerts
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
./setup.sh
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
python3 generate_keys.py
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
./setup.sh
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
python3 generate_keys.py
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
python generate_keys.py
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
python generate_keys.py
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

## Configuration

### Cloud Credentials

Add credentials in the dashboard under **Accounts → Add Account**:

| Cloud | What you need |
|-------|--------------|
| **AWS** | Access Key ID + Secret Access Key |
| **Azure** | Tenant ID + Client ID + Client Secret (Service Principal) |

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
│  Auth          JWT (HS256) · bcrypt · Role middleware   │
│  Infra         Docker · Docker Compose · Nginx (prod)  │
│  Cloud SDKs    boto3 (AWS) · azure-sdk (Azure)         │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Vanguard/
├── CSPM-Tool/                  # Backend
│   ├── api/server.py           # All REST endpoints
│   ├── auth/                   # JWT · bcrypt · role guards
│   ├── connectors/             # AWS + Azure SDK collectors
│   ├── database/               # Schema · models · migrations
│   ├── policies/               # 345+ built-in rules + custom rules
│   ├── scheduler/              # Background scan engine
│   └── scoring/                # Posture score algorithm
│
├── CSPM-Dashboard/             # Frontend
│   └── src/pages/              # Dashboard · History · Alerts · Policies · Admin
│
├── docker-compose.yml          # Orchestration
├── .env.example                # Environment template
├── generate_keys.py            # Secret key generator
└── setup.sh                    # One-command setup (Mac/Linux)
```

---

<div align="center">

Built for teams who take cloud security seriously.

</div>
