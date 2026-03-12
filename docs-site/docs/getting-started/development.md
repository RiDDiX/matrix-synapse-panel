---
sidebar_position: 2
title: Development Setup
---

# Development Setup

Run RiDDiX Matrix Control locally for development.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (running locally or via Docker)
- npm

## Steps

### 1. Clone and Install

```bash
git clone https://github.com/RiDDiX/regtokendashboard-synapse.git
cd regtokendashboard-synapse
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your local settings:

```bash
APP_URL=http://localhost:3000
DATABASE_URL="postgresql://portal:portal@localhost:5432/invite_portal"
SESSION_SECRET=your-dev-secret-at-least-32-characters-long
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### 3. Set Up the Database

```bash
# Run migrations
npx prisma migrate dev

# Seed admin user
npx prisma db seed
```

### 4. Start the Dev Server

```bash
npm run dev
```

The application starts at `http://localhost:3000`.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Deploy pending migrations |
| `npm run db:migrate:dev` | Create and apply migrations (dev) |
| `npm run db:seed` | Seed admin user |
| `npm run db:push` | Push schema changes without migration |

## Running PostgreSQL with Docker

If you don't have PostgreSQL installed locally:

```bash
docker run -d \
  --name portal-db \
  -e POSTGRES_USER=portal \
  -e POSTGRES_PASSWORD=portal \
  -e POSTGRES_DB=invite_portal \
  -p 5432:5432 \
  postgres:16-alpine
```

## Prisma Studio

Inspect and edit database records:

```bash
npx prisma studio
```

Opens a web UI at `http://localhost:5555`.

## Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch
```

Tests use Vitest and cover validation schemas, rate limiting, branding defaults, integration catalog, bot templates, and cryptographic operations.
