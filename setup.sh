#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CSPM — One-command setup
# Usage: ./setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${CYAN}  →${RESET} $*"; }
success() { echo -e "${GREEN}  ✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}  ⚠${RESET} $*"; }
fatal()   { echo -e "${RED}  ✗ $*${RESET}"; exit 1; }

echo ""
echo -e "${YELLOW}  ╔══════════════════════════════════════╗"
echo    "  ║     Multi-Cloud CSPM — Setup         ║"
echo -e "  ╚══════════════════════════════════════╝${RESET}"
echo ""

# ── Prerequisites ─────────────────────────────────────────────────────────────
command -v docker  >/dev/null 2>&1 || fatal "Docker not found. Install from https://docs.docker.com/get-docker/"
command -v python3 >/dev/null 2>&1 || fatal "Python 3 not found."

if ! docker info >/dev/null 2>&1; then
  fatal "Docker daemon is not running. Start Docker Desktop first."
fi

# ── .env setup ────────────────────────────────────────────────────────────────
if [ -f ".env" ]; then
  warn ".env already exists — skipping copy."
else
  info "Copying .env.example → .env"
  cp .env.example .env
  success ".env created"
fi

# Auto-generate secret keys
if grep -q "REPLACE_" .env 2>/dev/null; then
  info "Generating secret keys..."
  python3 generate_keys.py
  success "Keys generated"
fi

# ── Build & start ─────────────────────────────────────────────────────────────
echo ""
info "Building and starting containers (first run may take 2–3 min)..."
# Support both 'docker compose' (v2 plugin) and 'docker-compose' (standalone/Kali)
if docker compose version >/dev/null 2>&1; then
  docker compose up --build -d
else
  docker-compose up --build -d
fi

echo ""
# Wait for backend health
info "Waiting for backend to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
echo -e "${GREEN}  ┌─────────────────────────────────────────────────┐"
echo    "  │                                                   │"
echo    "  │   CSPM is running!                                │"
echo    "  │                                                   │"
echo    "  │   Dashboard  →  http://localhost:5173             │"
echo    "  │   API docs   →  http://localhost:8000/docs        │"
echo    "  │                                                   │"
echo    "  │   First account you register becomes superadmin.  │"
echo -e "  └─────────────────────────────────────────────────┘${RESET}"
echo ""

# Open browser on mac/linux
if command -v open    >/dev/null 2>&1; then open    http://localhost:5173; fi
if command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:5173; fi
