---
sidebar_position: 5
title: Admin — Integrations
---

# Admin API — Integrations

All endpoints require authentication. Most require a `serverId` query parameter.

## List Installed Integrations

```
GET /api/admin/integrations?serverId=clx...
```

Returns all installed integrations for the specified server.

**Response:**

```json
{
  "integrations": [
    {
      "id": "clx...",
      "serverId": "clx...",
      "catalogId": "mautrix-whatsapp",
      "name": "mautrix-whatsapp",
      "type": "bridge",
      "deploymentMode": "guided",
      "status": "installed",
      "enabled": false,
      "version": "1.0.0",
      "createdAt": "2026-03-12T12:00:00.000Z"
    }
  ]
}
```

---

## Browse Catalog

```
GET /api/admin/integrations?view=catalog
```

Returns all available integrations from the built-in catalog.

**Optional query parameters:**

| Parameter | Description |
|---|---|
| `type` | Filter by type: `bridge`, `bot`, `synapse_module`, `external_service` |
| `search` | Search by name |

**Response:**

```json
{
  "catalog": [
    {
      "id": "mautrix-whatsapp",
      "name": "mautrix-whatsapp",
      "type": "bridge",
      "description": "End-to-end bridging with double puppeting support",
      "maturity": "stable",
      "deploymentModes": ["managed", "guided"],
      "tags": ["whatsapp", "bridge", "mautrix"]
    }
  ]
}
```

---

## Install Integration

```
POST /api/admin/integrations?serverId=clx...
```

**Request Body:**

```json
{
  "catalogId": "mautrix-whatsapp"
}
```

Installs an integration from the catalog for the specified server. The deployment mode is auto-detected based on environment capabilities.

**Response:** `201` with the installed integration and generated files.

**Audit:** `integration.installed`

---

## Get Integration Details

```
GET /api/admin/integrations/:id
```

Returns full integration details including configuration, secrets (keys only), and generated files.

---

## Update Configuration

```
PUT /api/admin/integrations/:id
```

**Request Body:**

```json
{
  "config": {
    "bridge_port": 29318,
    "homeserver_url": "http://synapse:8008",
    "enable_double_puppeting": true
  }
}
```

Creates a versioned config snapshot. Returns updated integration with regenerated files.

**Audit:** `integration.updated`

---

## Integration Lifecycle Actions

```
PATCH /api/admin/integrations/:id
```

**Request Body:**

```json
{
  "action": "enable"
}
```

| Action | Description | Audit |
|---|---|---|
| `enable` | Activate the integration | `integration.enabled` |
| `disable` | Deactivate the integration | `integration.disabled` |
| `health_check` | Run an on-demand health check | — |

---

## Uninstall Integration

```
DELETE /api/admin/integrations/:id
```

Removes the integration. Must be disabled first.

**Audit:** `integration.uninstalled`

---

## Secret Management

### List Secrets

```
GET /api/admin/integrations/:id/secrets
```

Returns secret keys and metadata. **Values are never returned in plaintext.**

```json
{
  "secrets": [
    {
      "id": "clx...",
      "key": "as_token",
      "rotatedAt": null,
      "createdAt": "2026-03-12T12:00:00.000Z"
    }
  ]
}
```

### Set / Rotate Secret

```
POST /api/admin/integrations/:id/secrets
```

```json
{
  "key": "as_token",
  "value": "secret-value-here"
}
```

The value is encrypted with AES-256-GCM before storage. If a secret with the same key exists, it is rotated (replaced).

**Audit:** `integration.secret.rotated`

### Delete Secret

```
DELETE /api/admin/integrations/:id/secrets/:secretId
```

---

## Integration Diagnostics

```
GET /api/admin/integrations/diagnostics?serverId=clx...
```

Returns a system-wide diagnostics snapshot:

```json
{
  "diagnostics": {
    "synapseConnectivity": true,
    "appserviceRegistrationOk": true,
    "filesystemWritable": true,
    "dockerAvailable": false,
    "dockerComposeAvailable": false,
    "capabilityMode": "guided",
    "envVarsPresent": ["DATABASE_URL", "SESSION_SECRET"],
    "envVarsMissing": ["SYNAPSE_CONFIG_DIR"],
    "integrationHealth": {},
    "botHealth": {},
    "errors": [],
    "checkedAt": "2026-03-12T22:00:00.000Z"
  }
}
```
