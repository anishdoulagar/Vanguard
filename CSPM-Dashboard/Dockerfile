# ── React Frontend Dockerfile ─────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install

# Copy source (overridden by volume mount in dev)
COPY . .

EXPOSE 5173

# Vite must bind to 0.0.0.0 to be reachable outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
