---
sidebar_position: 1
title: Docker Setup
---

# Quick Start with Docker

The recommended way to deploy RiDDiX - Matrix Synapse Panel is with Docker Compose.

## Prerequisites

- Docker Engine 20+
- Docker Compose v2
- A running Matrix Synapse homeserver with admin API access

## Steps

### 1. Clone the Repository

```bash
git clone https://github.com/RiDDiX/matrix-synapse-panel.git
cd matrix-synapse-panel
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Generate a session secret (min 32 characters):

```bash
openssl rand -hex 32
```

Edit `.env` and replace **all** `CHANGE_ME` placeholders:

```bash
# Required
DATABASE_URL="postgresql://portal:YOUR_PASSWORD@db:5432/invite_portal"
SESSION_SECRET=YOUR_GENERATED_SECRET_HERE
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YOUR_SECURE_PASSWORD

# PostgreSQL (used by docker-compose)
POSTGRES_USER=portal
POSTGRES_PASSWORD=YOUR_PASSWORD
POSTGRES_DB=invite_portal
```

:::caution
The `SESSION_SECRET` is used for both session cookies **and** AES-256-GCM encryption of server admin tokens and integration secrets. Keep it safe and do not change it after deployment, or all encrypted data will become unreadable.
:::

### 3. Start the Services

```bash
docker compose up -d
```

This starts:
- **app** — the Next.js application on `127.0.0.1:3000`
- **db** — PostgreSQL 16 with health checks

On first start, the entrypoint script automatically:
1. Runs Prisma migrations (`prisma migrate deploy`)
2. Seeds the admin user (`prisma db seed`)

### 4. Access the Dashboard

Open `http://localhost:3000/admin` and log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you configured.

### 5. Add a Synapse Homeserver

Navigate to **Admin → Servers** and add your first homeserver:

1. Give it a **name** and **slug** (e.g., `main-server`)
2. Set the **Internal URL** (e.g., `http://synapse:8008` if on the same Docker network)
3. Set the **Public URL** (e.g., `https://matrix.example.com`)
4. Set the **Server Name** (e.g., `example.com`)
5. Paste the **Admin Access Token**
6. Click **Create**, then **Enable** the server

## Docker Compose Configuration

The default `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    container_name: matrix-synapse-panel
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    env_file:
      - .env
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-portal}:${POSTGRES_PASSWORD:-portal}@db:5432/${POSTGRES_DB:-invite_portal}
    volumes:
      - uploads:/app/data
    depends_on:
      db:
        condition: service_healthy
    networks:
      - portal

  db:
    image: postgres:16-alpine
    container_name: matrix-synapse-panel-db
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-portal}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-portal}
      - POSTGRES_DB=${POSTGRES_DB:-invite_portal}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U portal -d invite_portal"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - portal

volumes:
  pgdata:
  uploads:

networks:
  portal:
```

Key points:
- The app binds to `127.0.0.1:3000` — **not** exposed to the internet directly
- PostgreSQL is not exposed externally (no published ports)
- The `uploads` volume persists branding assets and integration data
- Secrets are loaded via `env_file` (not inline in the YAML)

:::warning
Always use a reverse proxy with TLS termination in production. See [Reverse Proxy Configuration](../deployment/reverse-proxy).
:::

## Connecting to Synapse on the Same Docker Network

If your Synapse homeserver runs on the same Docker network, add the portal network to your Synapse Compose file:

```yaml
services:
  synapse:
    # ... existing config
    networks:
      - portal
      - default

networks:
  portal:
    external: true
    name: matrix-synapse-panel_portal
```

Then use `http://synapse:8008` as the Internal URL when adding the server in the dashboard.

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run automatically on container startup.
