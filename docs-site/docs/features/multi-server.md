---
sidebar_position: 1
title: Multi-Server Management
---

# Multi-Server Management

RiDDiX - Matrix Synapse Panel can manage multiple Matrix Synapse homeservers from a single deployment. Each server has its own tokens, integrations, bots, and audit trail.

## Overview

Instead of configuring a single Synapse instance via environment variables, you add servers through the admin dashboard. Each server stores its connection details (URL, admin token, server name) in the database with the admin token encrypted at rest using AES-256-GCM.

## Adding a Server

1. Navigate to **Admin → Servers**
2. Click **Add Server**
3. Fill in the required fields:

| Field | Description | Example |
|---|---|---|
| **Name** | Display name for the server | `Main Homeserver` |
| **Slug** | URL-safe identifier (lowercase, hyphens) | `main-server` |
| **Server Name** | Matrix server name | `example.com` |
| **Internal URL** | Synapse URL reachable from the portal | `http://synapse:8008` |
| **Public URL** | Public-facing Synapse URL | `https://matrix.example.com` |
| **Admin Token** | Synapse admin access token | `syt_...` |

Optional fields:
- **Notes** — internal notes for administrators
- **Public Domain** — custom domain for server-specific registration pages
- **Route Prefix** — URL path prefix for routing
- **Branding Profile** — link to a branding profile for the registration page

4. Click **Create**
5. Click **Enable** to activate the server

## Server Lifecycle

Each server has a status and enabled flag:

| Status | Enabled | Description |
|---|---|---|
| `draft` | `false` | Newly created, not yet activated |
| `active` | `true` | Running and accepting requests |
| `disabled` | `false` | Manually disabled by admin |
| `error` | varies | Diagnostics detected a problem |

### Actions

- **Enable** — sets status to `active` and `enabled: true`
- **Disable** — sets status to `disabled` and `enabled: false`
- **Set as Default** — makes this server the fallback when no server is specified in a request
- **Rotate Token** — encrypts and stores a new admin access token
- **Run Diagnostics** — checks Synapse connectivity, admin API, and registration flow
- **Delete** — only possible when the server is disabled and not the default

## Server Context Selector

The admin dashboard includes a server selector dropdown in the sidebar. When you select a server, all pages (overview, tokens, diagnostics, audit, integrations, bots) are scoped to that server.

The selected server is persisted in `localStorage` so it survives page reloads and browser restarts.

## Default Server

One server can be marked as the **default**. It is used when:
- A public registration request does not specify a `serverId`
- The server resolve endpoint receives no matching slug or domain
- The admin dashboard loads without a previously selected server

Setting a new default automatically unsets the previous default (atomic transaction).

## Server Resolution

The public registration page resolves a server in this order:

1. **`serverId`** query parameter — exact match by ID
2. **`server`** query parameter — match by slug
3. **Domain** — match by `publicDomain` field
4. **Default server** — fallback to the default enabled server

This allows server-specific registration URLs:
- `https://portal.example.com/register?server=main-server`
- `https://portal.example.com/register?serverId=clx...`

## Data Isolation

All server-scoped data is filtered by `serverId`:
- **Token metadata** — labels and notes per server
- **Audit logs** — each entry tagged with the server it belongs to
- **Installed integrations** — bridges are per-server
- **Bot definitions** — bots are per-server

This ensures complete data isolation between servers.

## Admin Token Security

Server admin tokens are encrypted at rest:
- **Algorithm:** AES-256-GCM
- **Key derivation:** scrypt from `SESSION_SECRET` with a static salt
- **Storage:** encrypted value, IV, and auth tag stored as separate database columns
- **API responses:** `sanitizeServer()` strips all token fields before returning data

The plaintext token is only decrypted when making API calls to Synapse.
