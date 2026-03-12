---
sidebar_position: 4
title: Synapse Configuration
---

# Synapse Configuration

RiDDiX Matrix Control requires specific Synapse settings to function correctly.

## Required Synapse Settings

Add the following to your `homeserver.yaml`:

```yaml
enable_registration: true
registration_requires_token: true
```

These settings enable the token-based registration flow (`m.login.registration_token`) that the portal uses.

## Important Notes

### Do NOT Enable MSC3861 / OIDC Delegation

If your Synapse uses delegated authentication (MSC3861 / OIDC via MAS), token-based registration is **not compatible**. The portal's diagnostics page will detect and warn about this.

```yaml
# Do NOT use this with the portal:
experimental_features:
  msc3861:
    enabled: true  # Incompatible!
```

### Registration Without Token

If you set `enable_registration: true` but omit `registration_requires_token: true`, anyone can register without an invitation code. The portal will still work but defeats the purpose of invitation-based registration.

## Obtaining an Admin Access Token

You need a Synapse admin access token for each managed server.

### Method 1: Element DevTools

1. Log in to Element as an admin user
2. Open Settings → Help & About → Advanced → Access Token
3. Copy the token

### Method 2: Synapse Admin API

```bash
curl -X POST "https://matrix.example.com/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "m.login.password",
    "identifier": { "type": "m.id.user", "user": "@admin:example.com" },
    "password": "your-admin-password"
  }'
```

The response contains an `access_token` field.

### Method 3: Register via Synapse CLI

```bash
register_new_matrix_user -c /data/homeserver.yaml http://localhost:8008 \
  --admin --user admin --password YOUR_PASSWORD
```

Then log in to obtain the access token.

## Where to Use the Token

- **Multi-server mode:** Enter the token when creating a server in Admin → Servers. It is encrypted at rest with AES-256-GCM.
- **Legacy single-server mode:** Set it as `SYNAPSE_ADMIN_ACCESS_TOKEN` in your `.env` file.

## Verifying Your Setup

After adding a server, use the **Diagnostics** page (Admin → Diagnostics) to verify:

1. **Synapse Reachable** — the portal can connect to the Synapse API
2. **Admin API Reachable** — the admin token is valid and has sufficient permissions
3. **Token Endpoints Available** — the registration token admin endpoints respond correctly
4. **Registration Flow Available** — `m.login.registration_token` appears in the UIA flows
5. **No MSC3861 Detected** — delegated auth is not enabled

## Network Considerations

The portal connects to Synapse via the **Internal URL** (not the public URL). This should be a URL reachable from the portal container:

| Setup | Internal URL Example |
|---|---|
| Same Docker network | `http://synapse:8008` |
| Same host, different compose | `http://host.docker.internal:8008` |
| Remote server | `https://synapse-internal.example.com:8448` |

The **Public URL** is shown to users after registration (e.g., `https://matrix.example.com`) and is not used for API calls.
