---
sidebar_position: 7
title: Audit Log
---

# Audit Log

RiDDiX Matrix Control maintains a comprehensive audit trail for all administrative and registration activity.

## Overview

Every significant action is recorded with:
- **Action type** — what happened (e.g., `token.created`, `registration.success`)
- **Actor** — who performed the action (admin email or IP address)
- **Target** — what was affected (e.g., token value, server ID)
- **Detail** — additional context (sanitized, no sensitive values)
- **Server ID** — which managed server the action relates to
- **IP address** — client IP (from `X-Forwarded-For` or `X-Real-IP` headers)
- **Timestamp** — when the action occurred

## Audit Actions

### Server Management

| Action | Description |
|---|---|
| `server.created` | A new managed server was added |
| `server.updated` | Server configuration was changed |
| `server.enabled` | Server was activated |
| `server.disabled` | Server was deactivated |
| `server.deleted` | Server was removed |
| `server.default.changed` | Default server was changed |
| `server.token.rotated` | Server admin token was rotated |
| `server.diagnostics.run` | Diagnostics were executed for a server |

### Token Management

| Action | Description |
|---|---|
| `token.created` | A registration token was created |
| `token.updated` | A token's settings were changed |
| `token.disabled` | A token was disabled (uses_allowed set to 0) |
| `token.deleted` | A token was deleted |

### Registration

| Action | Description |
|---|---|
| `registration.attempt` | A registration was attempted |
| `registration.success` | A registration completed successfully |
| `registration.failure` | A registration failed (error code logged, not token value) |

### Authentication

| Action | Description |
|---|---|
| `admin.login` | Admin logged in |
| `admin.logout` | Admin logged out |

### Branding

| Action | Description |
|---|---|
| `branding.created` | Branding profile created |
| `branding.updated` | Branding profile updated |
| `branding.published` | Branding profile published |
| `branding.reset` | Branding profile reset to defaults |
| `branding.deleted` | Branding profile deleted |
| `branding.asset.uploaded` | Branding asset uploaded |
| `branding.asset.deleted` | Branding asset deleted |

### Integrations

| Action | Description |
|---|---|
| `integration.installed` | Integration installed from catalog |
| `integration.updated` | Integration configuration updated |
| `integration.enabled` | Integration enabled |
| `integration.disabled` | Integration disabled |
| `integration.restarted` | Integration restarted |
| `integration.upgraded` | Integration version upgraded |
| `integration.uninstalled` | Integration uninstalled |
| `integration.secret.rotated` | Integration secret was rotated |
| `integration.diagnostics.failure` | Integration diagnostics failed |
| `bridge.paired` | Bridge pairing completed |
| `bridge.pairing.failed` | Bridge pairing failed |

### Bots

| Action | Description |
|---|---|
| `bot.created` | Bot created from template |
| `bot.updated` | Bot configuration updated |
| `bot.activated` | Bot activated |
| `bot.deactivated` | Bot deactivated |
| `bot.deleted` | Bot deleted |
| `bot.room.assigned` | Bot assigned to a room |
| `bot.room.unassigned` | Bot removed from a room |
| `bot.feature.updated` | Bot feature toggle changed |

## Viewing the Audit Log

Navigate to **Admin → Audit Log**. The log displays entries in reverse chronological order with pagination.

When a server is selected in the context selector, the audit log is filtered to show only entries for that server. Clear the server selection to see all entries.

## Server Scoping

Audit log entries include an optional `serverId` field. This allows:
- Filtering logs by server in the admin UI
- Associating actions with the correct homeserver
- Global actions (like `admin.login`) have `serverId` as null

## Security

- Token values are **never** logged in audit entries
- Error details are sanitized (only error codes, not full messages)
- Detail fields have length limits
- The audit API validates `offset` and `limit` parameters (NaN-safe)
