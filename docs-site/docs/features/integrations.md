---
sidebar_position: 5
title: Integration Platform
---

# Integration Platform

RiDDiX - Matrix Synapse Panel includes a platform for installing, configuring, and monitoring Matrix bridges and services.

## Overview

The integration system provides:
- A **catalog** of pre-configured bridges with installation templates
- **Two deployment modes**: managed (Docker) and guided (manual)
- **Configuration management** with versioned snapshots
- **Secret management** with AES-256-GCM encryption
- **Health monitoring** for installed integrations
- **Generated files**: Docker Compose fragments and appservice registration YAML

## Catalog

The built-in catalog includes 10 bridges:

| Bridge | Package | Maturity | Description |
|---|---|---|---|
| **WhatsApp** | mautrix-whatsapp | Stable | End-to-end bridging with double puppeting support |
| **Signal** | mautrix-signal | Beta | Bridges Signal chats to Matrix |
| **Telegram** | mautrix-telegram | Stable | Requires Telegram API credentials (api_id, api_hash) |
| **Slack** | mautrix-slack | Stable | Bridges Slack workspaces |
| **Discord** | mautrix-discord | Beta | Bridges Discord servers and DMs |
| **Google Messages** | mautrix-gmessages | Beta | Bridges Google Messages (requires a paired Android phone) |
| **Meta** | mautrix-meta | Beta | Bridges Facebook Messenger and Instagram DMs |
| **Google Chat** | mautrix-googlechat | Beta | Bridges Google Chat |
| **IRC** | matrix-appservice-irc | Stable | Bridges IRC networks |
| **Twitter/X** | mautrix-twitter | Beta | Bridges Twitter/X DMs |

Each catalog entry defines:
- Required secrets (API keys, tokens)
- Configuration fields with validation
- Infrastructure requirements
- Synapse changes needed (appservice registration)
- Health check strategy
- Docker image and default port

### Browsing the Catalog

Navigate to **Admin → Integrations** and click **Browse Catalog** (or append `?view=catalog` to the URL). Filter by type or search by name.

## Deployment Modes

### Managed Mode

When Docker and filesystem access are available, the platform can:
1. Generate a `docker-compose.yml` fragment for the bridge
2. Generate an appservice registration YAML for Synapse
3. Write files to the configured directories
4. Manage the service lifecycle (start, stop, restart)

Requirements:
- `SYNAPSE_CONFIG_DIR` environment variable set
- `SYNAPSE_APPSERVICE_DIR` environment variable set
- Docker and Docker Compose available on the host

### Guided Mode

When Docker or filesystem access is not available, the platform:
1. Generates the same configuration files
2. Displays them in the UI for copy/paste
3. Provides step-by-step setup instructions

The mode is **auto-detected** based on environment capabilities (Docker availability, filesystem permissions, Synapse config directory access).

## Installing an Integration

1. Browse the catalog and select a bridge
2. Click **Install**
3. The integration is created with status `installed`
4. Configure required settings in the detail page
5. Add required secrets (encrypted at rest)
6. Review generated files
7. Enable the integration

## Integration Lifecycle

| Status | Description |
|---|---|
| `installed` | Newly installed, needs configuration |
| `configured` | Configuration complete, ready to enable |
| `enabled` | Active and running |
| `running` | Health check confirmed operational |
| `degraded` | Health check shows issues |
| `failed` | Health check failed |
| `disabled` | Manually disabled |
| `waiting_for_pairing` | Bridge waiting for user pairing (e.g., WhatsApp QR) |

Actions:
- **Enable** — activate the integration
- **Disable** — deactivate (required before uninstall)
- **Health Check** — run an on-demand health check
- **Uninstall** — remove the integration (must be disabled first)

## Configuration

Each integration has typed configuration fields defined by its catalog entry. Fields support:
- String, number, boolean, URL, select, textarea, port types
- Validation rules (min, max, pattern)
- Sections for logical grouping
- Default values

Configuration changes create versioned snapshots in the `IntegrationConfig` table.

## Secrets

Sensitive values (API keys, tokens, passwords) are managed separately:
- Encrypted at rest with AES-256-GCM
- Never returned in plaintext via API
- Can be rotated without reconfiguring the integration
- Each secret has a key and encrypted value

## Generated Files

For each installed integration, the platform generates:

### Appservice Registration YAML

```yaml
id: mautrix-whatsapp
url: http://mautrix-whatsapp:29318
as_token: <generated>
hs_token: <generated>
sender_localpart: whatsappbot
namespaces:
  users:
    - regex: '@whatsapp_.*:example\.com'
      exclusive: true
```

### Docker Compose Fragment

```yaml
services:
  mautrix-whatsapp:
    image: dock.mau.dev/mautrix/whatsapp:latest
    restart: unless-stopped
    ports:
      - "29318:29318"
    volumes:
      - ./data:/data
```

In guided mode, these are displayed in the UI. In managed mode, they are written to disk.

## Server Scoping

Integrations are scoped per server. Each installed integration has a `serverId` foreign key. The integration list only shows integrations for the currently selected server.

## System Diagnostics

Navigate to **Admin → Int. Diagnostics** for a system-wide health snapshot:
- Synapse connectivity check
- Environment variable status
- Docker and Docker Compose availability
- Filesystem write permissions
- Health status of all installed integrations and bots
