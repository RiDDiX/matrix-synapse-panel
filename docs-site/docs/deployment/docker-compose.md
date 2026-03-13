---
sidebar_position: 1
title: Docker Compose
---

# Docker Compose Deployment

This guide covers production deployment with Docker Compose.

## Prerequisites

- Docker Engine 20+
- Docker Compose v2
- A domain name with DNS pointing to your server
- TLS certificate (via reverse proxy)

## Production Setup

### 1. Prepare the Environment

```bash
git clone https://github.com/RiDDiX/matrix-synapse-panel.git
cd matrix-synapse-panel
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Session secret (min 32 chars)
openssl rand -hex 32

# Database password
openssl rand -base64 24
```

### 3. Configure `.env`

```bash
# Application
APP_URL=https://portal.example.com
SESSION_SECRET=<your-generated-secret>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong-password>

# Database
DATABASE_URL=postgresql://portal:<db-password>@db:5432/invite_portal
POSTGRES_USER=portal
POSTGRES_PASSWORD=<db-password>
POSTGRES_DB=invite_portal
```

:::caution
Replace **every** `CHANGE_ME` placeholder. Use unique, strong values for all secrets.
:::

### 4. Build and Start

```bash
docker compose up -d --build
```

### 5. Verify

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs -f app

# Test health endpoint
curl http://localhost:3000/api/health
```

## Docker Compose File

The default `docker-compose.yml` defines two services:

### App Service

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
```

Key points:
- Binds to `127.0.0.1` only — use a reverse proxy for external access
- `env_file` loads secrets (not inline in YAML)
- `uploads` volume persists branding assets and integration data
- Waits for database health check before starting

### Database Service

```yaml
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
```

Key points:
- No published ports — only accessible within the Docker network
- Health check ensures the database is ready before the app starts
- `pgdata` volume persists database data

## Dockerfile

The multi-stage Dockerfile:

1. **base** — Node.js 20 Alpine
2. **deps** — Installs npm dependencies + Prisma generate
3. **builder** — Copies source, regenerates Prisma client, builds Next.js
4. **runner** — Minimal production image with standalone output

The runner stage:
- Runs as non-root user `nextjs:nodejs` (UID 1001)
- Copies only the standalone build output
- Includes Prisma client and CLI for runtime migrations
- Creates `data/uploads/branding` and `data/integrations` directories
- Uses `docker-entrypoint.sh` to run migrations before starting

## Entrypoint

The `docker-entrypoint.sh` runs on every container start:

```bash
#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Seeding database..."
npx prisma db seed || true
echo "Starting application..."
exec "$@"
```

This ensures:
- New migrations are applied automatically on updates
- The admin user is seeded on first run
- Seed failures (e.g., user already exists) don't prevent startup

## Volumes

| Volume | Purpose |
|---|---|
| `pgdata` | PostgreSQL data directory |
| `uploads` | Branding assets + integration data (`/app/data`) |

## Networking

The `portal` network isolates the app and database. To connect Synapse on the same Docker host:

```yaml
# In your Synapse docker-compose.yml
services:
  synapse:
    networks:
      - portal
      - default

networks:
  portal:
    external: true
    name: matrix-synapse-panel_portal
```

Then use `http://synapse:8008` as the Internal URL when adding the server.

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run automatically on startup. Zero-downtime updates are possible with `docker compose up -d --build` (new container starts before old one stops).

## Backups

### Database

```bash
docker compose exec db pg_dump -U portal invite_portal > backup.sql
```

### Restore

```bash
docker compose exec -T db psql -U portal invite_portal < backup.sql
```

### Uploads

The `uploads` volume contains branding assets. Back it up with:

```bash
docker run --rm -v matrix-synapse-panel_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads.tar.gz /data
```
