---
sidebar_position: 2
title: Token Management
---

# Token Management

Registration tokens control who can create accounts on your Matrix homeserver. RiDDiX - Matrix Synapse Panel wraps the Synapse Admin API for full token lifecycle management.

## How It Works

Synapse supports registration tokens as part of the User-Interactive Authentication (UIA) flow. Each token can be configured with:

- **Usage limit** — how many times the token can be used (or unlimited)
- **Expiry time** — when the token stops being valid
- **Custom token string** — or auto-generated (8–64 characters)

The portal adds local metadata on top:
- **Label** — a short description visible in the dashboard
- **Note** — longer internal notes

## Creating Tokens

1. Navigate to **Admin → Tokens**
2. Ensure you have a server selected in the server context selector
3. Click **Create Token**
4. Configure:

| Field | Required | Description |
|---|---|---|
| Token | No | Custom token string (auto-generated if empty). Allowed chars: `A-Za-z0-9._~-` |
| Length | No | Length for auto-generated tokens (8–64, default: 16) |
| Uses Allowed | No | Maximum number of registrations (null = unlimited) |
| Expiry | No | Expiration timestamp (null = never expires) |
| Label | No | Display label for the dashboard |
| Note | No | Internal note |

The token is created on Synapse via the Admin API and metadata is stored locally.

## Token Status

Each token has a computed status:

| Status | Condition |
|---|---|
| **Valid** | Not expired, not exhausted, uses_allowed > 0 or null |
| **Expired** | `expiry_time` is in the past |
| **Exhausted** | `completed >= uses_allowed` |
| **Disabled** | `uses_allowed` is set to 0 |

## Managing Tokens

From the token list, you can:

- **View details** — see usage count, pending registrations, expiry, and metadata
- **Update** — change uses_allowed, expiry, label, or note
- **Disable** — set uses_allowed to 0 (token remains but cannot be used)
- **Delete** — permanently remove the token from Synapse

All token operations are audit-logged.

## Server Scoping

Tokens are scoped to the currently selected server. The token list only shows tokens from the active server, and all CRUD operations target that server's Synapse instance.

Token metadata (labels, notes) is stored in the local database with a `serverId` foreign key, ensuring per-server isolation.

## Sharing Invite Links

Once a token is created, you can share a registration link:

```
https://your-portal.example.com/register?server=main-server&token=YOUR_TOKEN
```

The registration page will:
1. Resolve the server from the `server` slug parameter
2. Pre-fill the invitation code if `token` is in the URL
3. Apply the server's branding profile
