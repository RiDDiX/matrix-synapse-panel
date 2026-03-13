---
sidebar_position: 1
title: Architecture Overview
---

# Architecture Overview

RiDDiX - Matrix Synapse Panel is a Next.js 15 application using the App Router with server-side rendering and API routes.

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Registration  │  │    Admin Dashboard      │  │
│  │    Page       │  │  (React + Server Ctx)   │  │
│  └──────┬───────┘  └───────────┬─────────────┘  │
└─────────┼───────────────────────┼────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────────────────────────────────────┐
│              Next.js App Router                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ /api/     │  │ /api/     │  │ /api/admin/  │  │
│  │ register  │  │ branding  │  │ servers,     │  │
│  │ validate  │  │ assets    │  │ tokens, etc. │  │
│  │ resolve   │  │           │  │              │  │
│  └─────┬────┘  └─────┬─────┘  └──────┬───────┘  │
│        │              │               │           │
│  ┌─────┴──────────────┴───────────────┴────────┐ │
│  │             Service Layer                    │ │
│  │  servers.ts │ synapse.ts │ audit.ts          │ │
│  │  branding.ts│ engine.ts  │ bots.ts           │ │
│  │  crypto.ts  │ catalog/   │ validation.ts     │ │
│  └─────────────┬────────────┬──────────────────┘ │
│                │            │                     │
│         ┌──────┴──┐   ┌────┴─────┐               │
│         │ Prisma  │   │ Synapse  │               │
│         │ Client  │   │ Admin API│               │
│         └────┬────┘   └────┬─────┘               │
└──────────────┼─────────────┼─────────────────────┘
               │             │
        ┌──────┴──┐   ┌──────┴──────┐
        │PostgreSQL│   │ Synapse     │
        │  (local) │   │ Homeserver  │
        └─────────┘   │ (1 or more) │
                      └─────────────┘
```

## Request Flow

### Admin API Request

1. Browser sends request with iron-session cookie
2. Middleware checks authentication
3. API route extracts `serverId` from query/body
4. `getServerConnectionById()` retrieves and decrypts the server's admin token
5. Service function calls Synapse Admin API with the decrypted connection
6. Response is returned (sensitive fields stripped)
7. Action is audit-logged with server context

### Public Registration Request

1. Registration page loads with `?server=slug` parameter
2. `GET /api/server/resolve?slug=...` resolves the server
3. Active branding profile is fetched via `GET /api/branding`
4. User submits the form
5. `POST /api/register` resolves the server, validates input, and executes UIA flow
6. Registration result is returned
7. Action is audit-logged

## Directory Structure

```
src/
├── app/
│   ├── admin/                  # Admin dashboard pages
│   │   ├── layout.tsx          # Admin layout with nav + server selector
│   │   ├── page.tsx            # Overview dashboard
│   │   ├── tokens/page.tsx     # Token management
│   │   ├── servers/            # Server management
│   │   ├── branding/page.tsx   # Branding editor
│   │   ├── integrations/       # Integration management
│   │   ├── bots/               # Bot management
│   │   ├── diagnostics/page.tsx
│   │   └── audit/page.tsx
│   ├── register/page.tsx       # Public registration page
│   ├── login/page.tsx          # Admin login
│   └── api/
│       ├── auth/               # Login, logout, session
│       ├── admin/              # Protected admin API routes
│       │   ├── servers/        # Server CRUD + lifecycle
│       │   ├── tokens/         # Token CRUD
│       │   ├── branding/       # Branding CRUD + assets
│       │   ├── integrations/   # Integration lifecycle + secrets
│       │   ├── bots/           # Bot lifecycle + rooms + features
│       │   ├── stats/          # Dashboard statistics
│       │   ├── diagnostics/    # Synapse diagnostics
│       │   └── audit/          # Audit log
│       ├── register/           # Public registration + token validation
│       ├── server/resolve/     # Public server resolution
│       ├── branding/           # Public branding config + assets
│       └── health/             # Health check
├── lib/
│   ├── servers.ts              # Server service layer
│   ├── synapse.ts              # Synapse Admin API client
│   ├── audit.ts                # Audit logging
│   ├── branding.ts             # Branding service layer
│   ├── branding-defaults.ts    # Branding defaults and constants
│   ├── validation.ts           # Zod schemas
│   ├── types.ts                # TypeScript types
│   ├── env.ts                  # Environment variable validation
│   ├── session.ts              # iron-session config
│   ├── db.ts                   # Prisma client singleton
│   ├── rate-limit.ts           # In-memory rate limiter
│   ├── server-context.tsx      # React context for server selection
│   └── integrations/
│       ├── engine.ts           # Integration lifecycle
│       ├── bots.ts             # Bot lifecycle
│       ├── crypto.ts           # AES-256-GCM encryption
│       ├── environment.ts      # Capability detection
│       ├── types.ts            # Integration types
│       └── catalog/            # Built-in catalog entries
├── components/ui/              # shadcn/ui components
├── middleware.ts                # Auth + security headers
└── __tests__/                  # Vitest test suites
```

## Key Design Decisions

### Server-Scoped Everything

All data-bearing entities (tokens, audit logs, integrations, bots) have a `serverId` foreign key. Every admin API route requires or accepts a `serverId` parameter. This ensures complete data isolation between managed servers.

### Encryption at Rest

Sensitive values (admin tokens, integration secrets, bot access tokens) are encrypted with AES-256-GCM using a key derived from `SESSION_SECRET`. Each value has its own IV and auth tag.

### Backward Compatibility

Legacy single-server environment variables (`SYNAPSE_*`) serve as fallback when no `ManagedServer` is configured. The Synapse client functions accept an optional `SynapseConnection` parameter — if omitted, they fall back to env var defaults.

### Server Context (React)

The admin dashboard uses a React Context (`ServerProvider`) to track the currently selected server. All admin pages read from this context and pass `serverId` to API calls. The selection is persisted in `localStorage`.
