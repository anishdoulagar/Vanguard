# Multi-Cloud CSPM

A cloud-native **Cloud Security Posture Management** platform for AWS and Azure. Continuously scans your cloud accounts for misconfigurations, scores your security posture, and sends alerts when thresholds are breached.

---

## Quick Start

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) · Python 3 (for key generation)

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
./setup.sh
```

That's it. The dashboard opens at **http://localhost:5173**. The first account you register automatically becomes the superadmin.

> **Windows:** run `python3 generate_keys.py` and then `docker compose up --build -d` manually instead of `./setup.sh`.

---

## Configuration

### Cloud Credentials

Add your cloud credentials in the dashboard under **Settings → Cloud Accounts**. The scanner supports:

| Cloud | Auth method |
|-------|-------------|
| AWS | Access Key ID + Secret Access Key (+ optional Session Token) |
| Azure | Tenant ID + Client ID + Client Secret (Service Principal) |

### Email Alerts (optional)

Edit `.env` and fill in the SMTP section. [Brevo](https://www.brevo.com) is recommended (free, 300 emails/day, no credit card):

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=your-brevo-smtp-key
SMTP_FROM=you@example.com
```

---

## Roles

| Role | Access |
|------|--------|
| **Superadmin** | Everything — user management, system-wide alert settings, all data |
| **Admin** | All scans, all accounts, configure per-account alerts |
| **Analyst** | Run scans, manage cloud accounts, configure own alerts |
| **Viewer** | Read-only — view results, see alert status, no edits |

---

## Features

- **Multi-cloud scanning** — AWS and Azure with hundreds of built-in rules
- **Security scoring** — per-service and overall posture score (0–100)
- **Scan history** — view findings over time, compare changes between scans, export CSV/JSON
- **Custom rules** — add your own compliance checks
- **Scheduled scanning** — automatic background scans per account
- **Alerting** — system-wide alerts (superadmin) and per-user per-account alerts (admin/analyst)
- **Audit log** — every action is logged with user and timestamp
- **Role-based access** — four roles with fine-grained permissions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Recharts |
| Backend | FastAPI (Python), asyncio |
| Database | PostgreSQL 16 |
| Auth | JWT (HS256), bcrypt |
| Infra | Docker Compose |
| Cloud SDKs | boto3 (AWS), azure-sdk (Azure) |

---

## Day-to-Day Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker logs cspm_backend -f
docker logs cspm_frontend -f

# Update after pulling new code
docker compose up --build -d

# Reset everything (WARNING: deletes all scan data)
docker compose down -v
```

---

## Project Structure

```
CSPM/
├── CSPM-Tool/          # FastAPI backend + scanner engine
│   ├── api/            # REST endpoints
│   ├── auth/           # JWT, bcrypt, role middleware
│   ├── connectors/     # AWS and Azure SDK collectors
│   ├── database/       # PostgreSQL schema and models
│   ├── policies/       # Built-in and custom rules
│   ├── scheduler/      # Background scan engine
│   └── scoring/        # Posture score calculator
├── CSPM-Dashboard/     # React frontend
│   └── src/
│       ├── pages/      # Dashboard, History, Alerts, Policies, Admin
│       └── components/ # Shared UI
├── docker-compose.yml
├── .env.example        # Copy to .env and fill in values
├── generate_keys.py    # Auto-generates JWT_SECRET and CSPM_ENCRYPT_KEY
└── setup.sh            # One-command setup
```
