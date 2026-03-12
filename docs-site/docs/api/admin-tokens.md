---
sidebar_position: 3
title: Admin — Tokens
---

# Admin API — Token Management

All endpoints require authentication and a `serverId` query parameter.

## List Tokens

```
GET /api/admin/tokens?serverId=clx...
```

Lists all registration tokens from the selected server's Synapse instance, merged with local metadata (labels, notes).

**Response:**

```json
{
  "tokens": [
    {
      "token": "abc123",
      "uses_allowed": 10,
      "pending": 0,
      "completed": 3,
      "expiry_time": null,
      "label": "Team invite",
      "note": "For engineering team"
    }
  ]
}
```

---

## Create Token

```
POST /api/admin/tokens?serverId=clx...
```

Creates a registration token on Synapse and stores local metadata.

**Request Body:**

```json
{
  "token": "custom-token",
  "length": 16,
  "uses_allowed": 10,
  "expiry_time": 1735689600000,
  "label": "Team invite",
  "note": "For engineering team"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `token` | string | No | Custom token (`[A-Za-z0-9._~-]`, max 64). Auto-generated if empty. |
| `length` | number | No | Length for auto-generated token (8–64) |
| `uses_allowed` | number\|null | No | Max uses (null = unlimited) |
| `expiry_time` | number\|null | No | Expiry timestamp in ms (null = never) |
| `label` | string | No | Display label (max 255) |
| `note` | string | No | Internal note (max 1000) |

**Response:** `201` with the created token merged with metadata.

**Audit:** `token.created`

---

## Get Token Details

```
GET /api/admin/tokens/:token?serverId=clx...
```

Returns a single token from Synapse merged with local metadata.

---

## Update Token

```
PUT /api/admin/tokens/:token?serverId=clx...
```

Updates token settings on Synapse and/or local metadata.

**Request Body:**

```json
{
  "uses_allowed": 20,
  "expiry_time": null,
  "label": "Updated label",
  "note": "Updated note"
}
```

All fields are optional.

**Audit:** `token.updated`

---

## Disable Token

```
PATCH /api/admin/tokens/:token?serverId=clx...
```

Sets `uses_allowed` to 0, effectively disabling the token.

**Audit:** `token.disabled`

---

## Delete Token

```
DELETE /api/admin/tokens/:token?serverId=clx...
```

Deletes the token from Synapse and removes local metadata.

**Audit:** `token.deleted`
