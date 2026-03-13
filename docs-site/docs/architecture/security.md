---
sidebar_position: 3
title: Security
---

# Security

RiDDiX - Matrix Synapse Panel implements multiple layers of security to protect sensitive data and prevent unauthorized access.

## Encryption at Rest

### AES-256-GCM

All sensitive values are encrypted before database storage:

| Data | Location |
|---|---|
| Server admin tokens | `ManagedServer.adminTokenEnc/Iv/Tag` |
| Integration secrets | `IntegrationSecret.encryptedValue/iv/tag` |
| Bot access tokens | `BotDefinition.accessTokenEnc/Iv/Tag` |

**Implementation details:**
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key derivation:** scrypt with `SESSION_SECRET` as input and a static salt
- **IV:** Random 12-byte initialization vector per encryption operation
- **Auth tag:** 16-byte authentication tag for tamper detection
- **Module:** `src/lib/integrations/crypto.ts` using Node.js `crypto`

### Key Management

- The encryption key is derived from `SESSION_SECRET` at runtime
- **Changing `SESSION_SECRET` after deployment makes all encrypted data unreadable**
- The key is never stored on disk — only in memory during request processing
- Each encrypted value has its own IV (never reused)

## Authentication

### Admin Sessions

- **Library:** iron-session (encrypted, signed, httpOnly cookies)
- **Cookie flags:** `httpOnly`, `sameSite: lax`, `path: /`
- **Secure flag:** Auto-detected from `APP_URL` protocol, overridable via `COOKIE_SECURE` env var
- **Session TTL:** 8 hours
- **No session data stored server-side** — the cookie is the session (encrypted with `SESSION_SECRET`)

### Cookie Secure Flag Resolution

The `Secure` flag determines whether the browser sends the session cookie. It is resolved in this order:

1. **`COOKIE_SECURE=true`** → always set Secure (use if reverse proxy terminates TLS but `APP_URL` is an internal HTTP address)
2. **`COOKIE_SECURE=false`** → never set Secure (use for plain HTTP access without TLS)
3. **`APP_URL` starts with `https://`** → Secure enabled
4. **Otherwise** → Secure disabled

:::danger Common Login Loop Cause
If you access the portal via plain HTTP (e.g. `http://192.168.x.x:3000`), the cookie **must not** have the `Secure` flag. Set `APP_URL` to your actual HTTP URL or set `COOKIE_SECURE=false`.

**Symptom:** Login appears to succeed but you are immediately redirected back to the login page.
:::

### Reverse Proxy Requirements

When running behind a reverse proxy (Nginx, Caddy, Nginx Proxy Manager, SWAG):

| Requirement | Details |
|---|---|
| `APP_URL` | Set to the **public-facing** URL (e.g. `https://invite.example.com`) |
| `X-Forwarded-For` | Proxy must forward the client IP (used for rate limiting and audit logging) |
| `X-Forwarded-Proto` | Recommended for protocol detection |
| `Host` | Proxy must forward the original Host header |

**Example Nginx config:**

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Auth Observability

The server logs structured `[auth]` messages for all authentication events:

| Log | Meaning |
|---|---|
| `[auth] Session config: ...` | Logged once on first session access — shows cookie settings |
| `[auth] Login success: email` | Successful login |
| `[auth] Login failed: unknown email` | Email not found |
| `[auth] Login failed: bad password` | Wrong password |
| `[auth] Session check: no session cookie received` | Browser did not send cookie — likely Secure/protocol mismatch |
| `[auth] Session check: cookie present but session invalid` | Cookie sent but expired or corrupted |
| `[auth] Logout: email` | Explicit logout |

:::tip Debugging Login Loops
Check `docker logs` for `[auth] Session check: no session cookie received`. This confirms a Secure cookie mismatch. Fix by setting `APP_URL` to your actual access URL or setting `COOKIE_SECURE=false`.
:::

### Password Storage

- Admin passwords are hashed with bcrypt at seed time
- Plaintext passwords are never stored or logged

### Rate Limiting

- **Login:** Dual rate limiting — per IP and per email address
- **Registration:** Per IP rate limiting
- **Token validation:** Per IP rate limiting
- **Defaults:** 15 requests per 15-minute window
- **Implementation:** In-memory sliding window (resets on restart)

## Input Validation

All API inputs are validated with Zod schemas before processing:

| Schema | Purpose |
|---|---|
| `loginSchema` | Email + password |
| `registrationSchema` | Username, password, confirm, token |
| `createTokenSchema` | Token creation params |
| `updateTokenSchema` | Token update params |
| `createServerSchema` | Server creation with all fields |
| `updateServerSchema` | Partial server update |
| `rotateServerTokenSchema` | New admin token |
| `brandingUpdateSchema` | Branding fields (hex colors, URLs, text limits) |
| `installIntegrationSchema` | Catalog ID |
| `integrationConfigSchema` | Config JSON |
| `integrationSecretSchema` | Secret key + value |
| `createBotSchema` | Bot template + config |
| `updateBotSchema` | Partial bot update |
| `botRoomAssignmentSchema` | Room ID validation |
| `botFeatureSchema` | Feature key + scope |

## API Security

### Data Sanitization

Sensitive fields are stripped from all API responses:

| Function | Stripped Fields |
|---|---|
| `sanitizeServer()` | `adminTokenEnc`, `adminTokenIv`, `adminTokenTag` |
| `sanitizeProfile()` | `storagePath` on all assets |
| `sanitizeAsset()` | `storagePath` |

### Public Endpoints

Public endpoints expose minimal information:

- `/api/server/resolve` — only returns safe server fields (name, slug, serverName, publicUrl, brandingProfileId). Never returns internal URLs or tokens.
- `/api/branding` — only returns resolved branding config. No storage paths.
- `/api/health` — only returns `{ status: "ok" }`. No database state.

### Server-Scoped Queries

All database queries for server-scoped data include a `serverId` filter. This prevents cross-server data leakage even if a user manipulates request parameters.

## Middleware

The Next.js middleware (`src/middleware.ts`) enforces:

- **Security headers** on all routes:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Admin route guard** — client-side session check redirects to `/admin/login` if unauthenticated
- **API route guard** — `requireAdmin()` returns 401 for unauthenticated API requests

## Audit Trail

All significant actions are logged to the `AuditLog` table:
- Token values are **never** logged
- Error details are sanitized (only error codes stored)
- Client IP captured from `X-Forwarded-For` or `X-Real-IP` headers
- Audit API validates `offset`/`limit` parameters (NaN-safe)

## Docker Security

- App binds to `127.0.0.1:3000` — not directly exposed to the internet
- PostgreSQL has no published ports — only accessible within the Docker network
- Secrets loaded via `env_file` (not inline in docker-compose.yml)
- Non-root user (`nextjs:nodejs`) runs the application
- Multi-stage build minimizes the final image size and attack surface

## File Upload Security

- SVG files are **blocked** (XSS risk)
- File type, size, and extension are validated on upload
- Extension must match content type
- Size limits: 256 KB (favicon), 2 MB (others)
- Files stored with UUID filenames (no user-controlled paths)
- Path containment check in `readAssetFile()` prevents directory traversal
- `storagePath` never exposed in API responses

## CI/CD Security

- All GitHub Actions are pinned to commit SHAs (not mutable tags)
- Least-privilege permissions on workflow jobs
- No secrets logged in CI output
