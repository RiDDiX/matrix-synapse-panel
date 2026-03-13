---
sidebar_position: 1
title: Public API
---

# Public API

These endpoints do not require authentication.

## Registration

### Register a New User

```
POST /api/register
```

Creates a Matrix account using the Synapse UIA registration flow with a registration token.

**Request Body:**

```json
{
  "username": "alice",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "token": "invite-code-123",
  "displayName": "Alice",
  "serverId": "clx..."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `username` | string | Yes | Matrix localpart (`[a-z0-9._=-]+`, max 255) |
| `password` | string | Yes | Account password (min 8 chars) |
| `confirmPassword` | string | Yes | Must match password |
| `token` | string | Yes | Invitation code |
| `displayName` | string | No | Initial display name (max 255) |
| `serverId` | string | No | Target server ID. Falls back to default server. |

**Response (success):**

```json
{
  "success": true,
  "userId": "@alice:example.com"
}
```

**Response (error):**

```json
{
  "success": false,
  "error": "This username is already taken.",
  "errorCode": "M_USER_IN_USE"
}
```

**Rate Limited:** Yes (default: 15 requests per 15 minutes per IP)

---

### Validate a Token

```
POST /api/register/validate-token
```

Checks if a registration token is valid without consuming a use.

**Request Body:**

```json
{
  "token": "invite-code-123",
  "serverId": "clx..."
}
```

**Response:**

```json
{
  "valid": true
}
```

**Rate Limited:** Yes

---

## Server Resolution

### Resolve Server

```
GET /api/server/resolve?slug=main-server
```

Resolves a managed server by slug, domain, or ID. Used by the registration page to determine which Synapse instance to register against.

**Query Parameters:**

| Parameter | Description |
|---|---|
| `slug` | Server slug |
| `domain` | Public domain |
| `serverId` | Server ID |

Priority: `serverId` > `slug` > `domain` > default server.

**Response:**

```json
{
  "server": {
    "id": "clx...",
    "name": "Main Homeserver",
    "slug": "main-server",
    "serverName": "example.com",
    "publicUrl": "https://matrix.example.com",
    "brandingProfileId": "clx..."
  }
}
```

Only non-sensitive fields are returned. Admin tokens and internal URLs are never exposed.

**Errors:**
- `404` — No server found
- `403` — Server exists but is disabled

---

## Branding

### Get Active Branding

```
GET /api/branding
```

Returns the currently published branding configuration with defaults applied for unset fields.

**Response:**

```json
{
  "branding": {
    "appTitle": "RiDDiX - Matrix Synapse Panel",
    "subtitle": "Create your Matrix account",
    "logoUrl": "/api/branding/assets/clx...",
    "primaryColor": "#6366f1",
    "layoutPreset": "centered",
    "welcomeHeadline": "Join the Network",
    ...
  }
}
```

---

### Serve Branding Asset

```
GET /api/branding/assets/:id
```

Serves an uploaded branding asset (logo, favicon, hero, background) with appropriate `Content-Type` and caching headers.

**Response:** Binary image data with `Cache-Control: public, max-age=86400`.

---

## Health

### Health Check

```
GET /api/health
```

Returns application health status. Minimal information exposure.

**Response:**

```json
{
  "status": "ok"
}
```
