---
sidebar_position: 6
title: Admin — Bots
---

# Admin API — Bots

All endpoints require authentication. Most require a `serverId` query parameter.

## List Bots

```
GET /api/admin/bots?serverId=clx...
```

Returns all bot definitions for the specified server.

**Response:**

```json
{
  "bots": [
    {
      "id": "clx...",
      "serverId": "clx...",
      "templateId": "welcome",
      "displayName": "Welcome Bot",
      "localpart": "welcomebot",
      "matrixUserId": "@welcomebot:example.com",
      "status": "active",
      "enabled": true,
      "createdAt": "2026-03-12T12:00:00.000Z"
    }
  ]
}
```

---

## Browse Templates

```
GET /api/admin/bots?view=templates
```

Returns all available bot templates.

**Response:**

```json
{
  "templates": [
    {
      "id": "welcome",
      "name": "Welcome Bot",
      "description": "Greets new members when they join a room.",
      "icon": "HandMetal",
      "defaultFeatures": ["room_auto_join", "room_responses"],
      "capabilities": ["Greet new members", "Room-specific messages"],
      "threadAware": false
    }
  ]
}
```

---

## Create Bot

```
POST /api/admin/bots?serverId=clx...
```

**Request Body:**

```json
{
  "templateId": "welcome",
  "displayName": "Welcome Bot",
  "localpart": "welcomebot",
  "avatarUrl": "mxc://example.com/abc123",
  "config": {
    "welcome_message": "Welcome to {room}, {user}!"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `templateId` | string | Yes | Template ID from the catalog |
| `displayName` | string | Yes | Bot display name (max 200) |
| `localpart` | string | No | Matrix localpart (`[a-z0-9._=-]+`, max 64) |
| `avatarUrl` | string | No | Avatar URL |
| `config` | object | No | Template-specific configuration |

**Response:** `201` with the created bot.

**Audit:** `bot.created`

---

## Get Bot Details

```
GET /api/admin/bots/:id
```

Returns full bot details including room assignments and feature flags.

---

## Update Bot

```
PUT /api/admin/bots/:id
```

**Request Body:**

```json
{
  "displayName": "Updated Welcome Bot",
  "config": { "welcome_message": "Hello, {user}!" }
}
```

**Audit:** `bot.updated`

---

## Bot Lifecycle Actions

```
PATCH /api/admin/bots/:id
```

```json
{
  "action": "activate"
}
```

| Action | Description | Audit |
|---|---|---|
| `activate` | Activate the bot | `bot.activated` |
| `deactivate` | Deactivate the bot | `bot.deactivated` |
| `set_token` | Store an encrypted Matrix access token | — |

### Set Token

```json
{
  "action": "set_token",
  "accessToken": "syt_..."
}
```

The token is encrypted with AES-256-GCM before storage.

---

## Delete Bot

```
DELETE /api/admin/bots/:id
```

Must be deactivated first.

**Audit:** `bot.deleted`

---

## Room Assignments

### List Rooms

```
GET /api/admin/bots/:id/rooms
```

### Assign to Room

```
POST /api/admin/bots/:id/rooms
```

```json
{
  "roomId": "!abc123:example.com",
  "roomAlias": "#general:example.com",
  "config": {}
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `roomId` | string | Yes | Matrix room ID (must start with `!`) |
| `roomAlias` | string | No | Room alias |
| `config` | object | No | Per-room configuration |

**Audit:** `bot.room.assigned`

### Remove from Room

```
DELETE /api/admin/bots/:id/rooms/:assignmentId
```

**Audit:** `bot.room.unassigned`

---

## Feature Toggles

### List Features

```
GET /api/admin/bots/:id/features
```

### Toggle Feature

```
PUT /api/admin/bots/:id/features
```

```json
{
  "featureKey": "command_handling",
  "enabled": true,
  "scope": "global",
  "scopeId": null,
  "config": {}
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `featureKey` | string | Yes | Feature identifier |
| `enabled` | boolean | Yes | Enable or disable |
| `scope` | string | No | `global` or `room` (default: `global`) |
| `scopeId` | string | No | Room ID for room-scoped features |
| `config` | object | No | Feature-specific config |

**Available features:** `command_handling`, `keyword_triggers`, `webhook_notifications`, `scheduled_messages`, `moderation_actions`, `room_auto_join`, `room_responses`, `thread_replies`, `message_relay`, `admin_commands`

**Audit:** `bot.feature.updated`
