---
sidebar_position: 4
title: Synapse Configuration
---

# Synapse Configuration

RiDDiX - Matrix Synapse Panel requires specific Synapse settings to function correctly.

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

## Internal URL vs Public URL

The portal uses **two separate URLs** per managed server:

| URL | Purpose | Used for |
|---|---|---|
| **Internal URL** | Direct Synapse access | Admin API calls (`/_synapse/admin/*`), token management, diagnostics |
| **Public URL** | User-facing references | Registration page links, client references |

:::danger Critical: Internal URL must reach Synapse directly
The Internal URL must point to the **Synapse process itself**, not to a public reverse proxy. Most reverse proxies intentionally do not forward `/_synapse/admin/*` paths — this is correct security practice, but it means the portal cannot use the public URL for admin operations.

**Symptom:** Diagnostics show "Synapse reachable" but "Admin token endpoint returned 404" with an HTML error page from nginx.

**Fix:** Set the Internal URL to the direct Synapse address (e.g. `http://synapse:8008`).
:::

### Network Examples

| Setup | Internal URL | Public URL |
|---|---|---|
| Same Docker network | `http://synapse:8008` | `https://matrix.example.com` |
| Same host, different compose | `http://host.docker.internal:8008` | `https://matrix.example.com` |
| unRAID / container by IP | `http://192.168.1.50:8008` | `https://matrix.example.com` |
| Native install on same host | `http://localhost:8008` | `https://matrix.example.com` |
| Remote server (admin exposed) | `https://synapse-internal.example.com:8448` | `https://matrix.example.com` |

### Verifying the Internal URL

Test admin API access directly from the portal container:

```bash
# From within the portal container (or same Docker network):
curl -i http://synapse:8008/_synapse/admin/v1/registration_tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

If this returns a JSON array of tokens, the Internal URL is correct. If it returns an HTML 404 page from nginx, you are hitting a reverse proxy instead of Synapse.

### API Families and URL Mapping

| API | Base URL | Endpoints |
|---|---|---|
| **Synapse Admin API** | Internal URL only | `GET/POST/PUT/DELETE /_synapse/admin/v1/registration_tokens[/*]` |
| **Client-Server API** | Internal URL | `POST /_matrix/client/v3/register`, `GET /_matrix/client/versions` |
| **Token Validity** | Internal URL | `GET /_matrix/client/v1/register/m.login.registration_token/validity` |

All admin operations use `/_synapse/admin/v1/*` — these are **Synapse-specific** endpoints (not part of the Matrix spec) and are only available on direct Synapse access.

## Verifying Your Setup

After adding a server, use the **Diagnostics** tab (Admin → Servers → [Server] → Diagnostics) to verify:

1. **Synapse Reachable** — the portal can connect to the Synapse Client-Server API
2. **Admin API Reachable** — the `/_synapse/admin/*` endpoints respond (not blocked by proxy)
3. **Token Endpoints Available** — the registration token admin endpoint returns 200 with valid auth
4. **Registration Flow Available** — `m.login.registration_token` appears in the UIA flows
5. **Token Registration Supported** — the correct auth stage is present
6. **No MSC3861 Detected** — delegated auth is not enabled
7. **Registration Enabled** — Synapse allows registration

If Admin API shows a failure with class `proxy_not_forwarded`, the Internal URL is pointing at a reverse proxy. Change it to the direct Synapse address.
