---
sidebar_position: 7
title: Admin — Other
---

# Admin API — Other Endpoints

All endpoints require authentication.

## Dashboard Stats

```
GET /api/admin/stats?serverId=clx...
```

Returns token statistics and recent registration count for the selected server.

**Response:**

```json
{
  "totalTokens": 12,
  "validTokens": 8,
  "expiredTokens": 2,
  "exhaustedTokens": 1,
  "disabledTokens": 1,
  "recentRegistrations": 5
}
```

---

## Synapse Diagnostics

```
GET /api/admin/diagnostics?serverId=clx...
```

Runs a full Synapse connectivity check against the selected server.

**Response:**

```json
{
  "diagnostics": {
    "synapseReachable": true,
    "adminApiReachable": true,
    "tokenEndpointsAvailable": true,
    "registrationFlowAvailable": true,
    "serverName": "example.com",
    "registrationEnabled": true,
    "tokenRegistrationSupported": true,
    "msc3861Detected": false,
    "errors": []
  }
}
```

---

## Audit Logs

```
GET /api/admin/audit?serverId=clx...&limit=50&offset=0
```

Returns audit log entries in reverse chronological order.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `serverId` | string | — | Filter by server (optional) |
| `limit` | number | 50 | Max entries per page |
| `offset` | number | 0 | Pagination offset |

**Response:**

```json
{
  "logs": [
    {
      "id": "clx...",
      "serverId": "clx...",
      "action": "token.created",
      "actor": "admin@example.com",
      "target": "invite-abc123",
      "detail": null,
      "ip": "192.168.1.1",
      "createdAt": "2026-03-12T22:00:00.000Z"
    }
  ],
  "total": 150
}
```

---

## Authentication

### Login

```
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

Sets an encrypted iron-session cookie on success.

**Rate Limited:** Yes (dual rate limiting: per IP and per email)

### Logout

```
POST /api/auth/logout
```

Destroys the session cookie.

### Session Check

```
GET /api/auth/session
```

Returns the current session status.

**Response (authenticated):**

```json
{
  "authenticated": true,
  "user": {
    "id": "clx...",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "global_admin"
  }
}
```

**Response (not authenticated):**

```json
{
  "authenticated": false
}
```
