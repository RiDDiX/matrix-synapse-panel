---
sidebar_position: 2
title: Admin — Servers
---

# Admin API — Server Management

All admin endpoints require authentication via iron-session cookie.

## List Servers

```
GET /api/admin/servers
```

Returns all managed servers (sorted: default first, then by creation date). Admin token fields are stripped from the response.

**Response:**

```json
{
  "servers": [
    {
      "id": "clx...",
      "name": "Main Homeserver",
      "slug": "main-server",
      "serverName": "example.com",
      "internalUrl": "http://synapse:8008",
      "publicUrl": "https://matrix.example.com",
      "status": "active",
      "enabled": true,
      "isDefault": true,
      "notes": null,
      "lastDiagAt": "2026-03-12T22:00:00.000Z",
      "lastDiagOk": true,
      "createdAt": "2026-03-10T12:00:00.000Z"
    }
  ]
}
```

---

## Create Server

```
POST /api/admin/servers
```

**Request Body:**

```json
{
  "name": "Main Homeserver",
  "slug": "main-server",
  "serverName": "example.com",
  "internalUrl": "http://synapse:8008",
  "publicUrl": "https://matrix.example.com",
  "adminToken": "syt_...",
  "notes": "Production server",
  "publicDomain": "matrix.example.com",
  "routePrefix": null,
  "brandingProfileId": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name (max 200) |
| `slug` | string | Yes | URL-safe identifier (`[a-z0-9-]+`, max 100) |
| `serverName` | string | Yes | Matrix server name (max 500) |
| `internalUrl` | string | Yes | Synapse URL reachable from portal (valid URL) |
| `publicUrl` | string | Yes | Public-facing Synapse URL (valid URL) |
| `adminToken` | string | Yes | Synapse admin access token (max 10000) |
| `notes` | string | No | Internal notes (max 5000) |
| `publicDomain` | string | No | Custom domain for registration (max 500) |
| `routePrefix` | string | No | URL path prefix (max 100) |
| `brandingProfileId` | string | No | Linked branding profile ID |

The admin token is encrypted with AES-256-GCM before storage. The server is created with `status: "draft"` and `enabled: false`.

**Response:** `201` with the created server (token fields stripped).

**Audit:** `server.created`

---

## Get Server Details

```
GET /api/admin/servers/:id
```

**Response:** Server object with token fields stripped.

---

## Update Server

```
PUT /api/admin/servers/:id
```

**Request Body:** Partial object with any of:

```json
{
  "name": "Updated Name",
  "slug": "new-slug",
  "serverName": "example.com",
  "internalUrl": "http://synapse:8008",
  "publicUrl": "https://matrix.example.com",
  "notes": "Updated notes",
  "publicDomain": null,
  "routePrefix": null,
  "brandingProfileId": null,
  "registrationMode": null,
  "managedMode": null
}
```

All fields are optional. Set to `null` to clear optional fields.

**Audit:** `server.updated`

---

## Server Actions

```
PATCH /api/admin/servers/:id
```

**Request Body:**

```json
{
  "action": "enable"
}
```

| Action | Description | Audit |
|---|---|---|
| `enable` | Activate the server | `server.enabled` |
| `disable` | Deactivate the server | `server.disabled` |
| `set_default` | Make this the default server | `server.default.changed` |
| `rotate_token` | Replace the admin token | `server.token.rotated` |
| `diagnostics` | Run Synapse connectivity checks | `server.diagnostics.run` |

### Rotate Token

```json
{
  "action": "rotate_token",
  "adminToken": "syt_new_token..."
}
```

The new token is encrypted and stored. The old token is overwritten.

### Diagnostics

```json
{
  "action": "diagnostics"
}
```

Returns the full diagnostics result and stores it in the server record.

---

## Delete Server

```
DELETE /api/admin/servers/:id
```

Deletes a managed server. Requirements:
- Server must be **disabled** (`enabled: false`)
- Server must **not** be the default server

**Response:** `200` with `{ deleted: true }`

**Audit:** `server.deleted`
