---
sidebar_position: 6
title: Bot Platform
---

# Bot Platform

RiDDiX Matrix Control includes a bot management platform for creating, configuring, and managing Matrix bots from templates.

## Overview

The bot platform provides:
- **7 bot templates** with pre-configured capabilities
- **10 feature toggles** (global or per-room scope)
- **Room assignments** for controlling where bots operate
- **Encrypted access tokens** stored with AES-256-GCM
- **Per-server scoping** — bots belong to a specific managed server

## Bot Templates

| Template | Description | Default Features |
|---|---|---|
| **Welcome Bot** | Greets new members with a configurable message | Room auto-join, room-specific responses |
| **Moderation Helper** | Word filters, spam detection, admin commands | Command handling, keyword triggers, moderation actions, admin commands |
| **Keyword Responder** | Responds to trigger keywords/phrases | Keyword triggers, room responses, thread-aware replies |
| **Webhook Relay** | Receives external webhooks and posts to rooms | Webhook notifications, room responses |
| **Notification Bot** | Scheduled or event-driven notifications | Scheduled messages, room responses |
| **Bridge Support Bot** | Status and help for installed bridges | Command handling, room responses, admin commands |
| **Custom Command Bot** | User-defined commands and behaviors | Command handling, admin commands |

## Creating a Bot

1. Navigate to **Admin → Bots**
2. Ensure you have a server selected
3. Click **Create Bot** or browse templates (`?view=templates`)
4. Select a template
5. Configure:

| Field | Required | Description |
|---|---|---|
| Display Name | Yes | Bot's display name (max 200 chars) |
| Localpart | No | Matrix localpart (auto-generated if empty) |
| Avatar URL | No | URL for the bot's avatar |
| Config | No | Template-specific configuration (JSON) |

6. Click **Create**

## Bot Lifecycle

| Status | Description |
|---|---|
| `created` | Newly created, not yet activated |
| `active` | Running and operational |
| `inactive` | Manually deactivated |
| `error` | An error occurred |

Actions:
- **Activate** — start the bot
- **Deactivate** — stop the bot (required before deletion)
- **Set Token** — store an encrypted Matrix access token
- **Delete** — remove the bot (must be deactivated first)

## Feature Toggles

Each bot supports 10 granular feature toggles:

| Feature | Description |
|---|---|
| **Command Handling** | Respond to `!commands` in rooms |
| **Keyword Triggers** | React to specific keywords in messages |
| **Webhook Notifications** | Receive and relay webhook payloads |
| **Scheduled Messages** | Send messages on a cron schedule |
| **Moderation Actions** | Kick/ban/mute users based on rules |
| **Room Auto-Join** | Automatically join rooms when invited |
| **Room-Specific Responses** | Custom responses per room |
| **Thread-Aware Replies** | Reply in threads (where SDK supports it) |
| **Message Relay** | Relay messages between rooms or to external systems |
| **Admin-Only Commands** | Commands restricted to admin users |

Features can be scoped:
- **Global** — applies to all rooms the bot is in
- **Per-Room** — applies only to a specific room (via `scopeId`)

## Room Assignments

Bots can be assigned to specific Matrix rooms:

1. Go to the bot detail page
2. Click **Assign to Room**
3. Enter the room ID (must start with `!`) and optional room alias
4. Optionally provide per-room configuration

Room assignments track:
- Room ID and alias
- Per-room config (JSON)
- Active status
- Join timestamp

## Template Configuration

Each template defines typed configuration fields:

### Welcome Bot
- **Welcome Message** — message template with `{user}` and `{room}` placeholders
- **Send as DM** — send the welcome as a direct message

### Moderation Helper
- **Banned Words** — comma-separated word filter list
- **Action on Violation** — warn, redact, mute, or kick
- **Spam Threshold** — messages per minute before spam detection triggers

### Keyword Responder
- **Trigger Rules** — JSON array of `{keyword, response}` objects
- **Case Sensitive** — whether matching is case-sensitive

### Webhook Relay
- **Webhook Path** — URL path for incoming webhooks
- **Message Template** — template for formatting payloads
- **Allowed Source IPs** — comma-separated IP allowlist

### Notification Bot
- **Schedule (Cron)** — cron expression for scheduled messages
- **Notification Message** — default message template

### Custom Command Bot
- **Command Prefix** — prefix character (e.g., `!` or `/`)
- **Commands (JSON)** — array of `{command, response, adminOnly}` objects

## Thread Awareness

Some templates support thread-aware replies:

| Template | Thread-Aware | Note |
|---|---|---|
| Keyword Responder | Yes | Replies in threads if the trigger is in a thread |
| Custom Command Bot | Yes | Depends on Matrix SDK capabilities at runtime |
| Others | No | Messages sent as top-level room messages |

## Access Tokens

Bot access tokens are:
- Encrypted at rest with AES-256-GCM
- Never returned in API responses
- Set via the `set_token` PATCH action
- Stored as `accessTokenEnc`, `accessTokenIv`, `accessTokenTag` columns
