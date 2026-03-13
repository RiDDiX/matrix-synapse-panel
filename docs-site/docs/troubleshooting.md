---
sidebar_position: 99
title: Troubleshooting
---

# Troubleshooting

Common issues and solutions for RiDDiX Matrix Control.

## Installation & Startup

### Database connection refused

**Error:** `Connection refused` or `ECONNREFUSED` on startup.

**Causes:**
- PostgreSQL is not running
- `DATABASE_URL` is incorrect
- Database container hasn't finished starting

**Solutions:**
- Check PostgreSQL is running: `docker compose ps db`
- Verify `DATABASE_URL` matches your database credentials
- The app waits for the database health check — check `docker compose logs db`

---

### Prisma migration failed

**Error:** `prisma migrate deploy` fails during startup.

**Causes:**
- Database schema conflicts from manual changes
- Missing migration files

**Solutions:**
- Check migration logs: `docker compose logs app`
- If starting fresh: remove the database volume and restart
  ```bash
  docker compose down -v
  docker compose up -d
  ```

---

### SESSION_SECRET too short

**Error:** Application fails to encrypt data or sessions.

**Solution:** Generate a proper 64-character hex string:
```bash
openssl rand -hex 32
```

---

## Synapse Connectivity

### Diagnostics show "Synapse not reachable"

**Causes:**
- Incorrect Internal URL
- Synapse is not running
- Network isolation (different Docker networks)

**Solutions:**
1. Verify the Internal URL is reachable from the portal container:
   ```bash
   docker compose exec app wget -qO- http://synapse:8008/_matrix/client/versions
   ```
2. If on different Docker networks, connect them (see [Docker Setup](./getting-started/docker#connecting-to-synapse-on-the-same-docker-network))
3. If Synapse is on a different host, ensure the URL is accessible and any firewalls allow traffic

---

### Admin token endpoint returns 404 from nginx

**Error:** Diagnostics show "Admin API check failed" with an HTML 404 page from nginx.

**Root cause:** The Internal URL points to a public reverse proxy that does not forward `/_synapse/admin/*` paths to Synapse. This is normal — most reverse proxy setups intentionally block admin API access from the public internet.

**Fix:** Set the Internal URL to the **direct Synapse address**, not the public URL:
- Docker same network: `http://synapse:8008`
- Same host: `http://localhost:8008`
- By IP: `http://192.168.1.50:8008`

**Verify from inside the container:**
```bash
curl -i http://synapse:8008/_synapse/admin/v1/registration_tokens \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

If this returns JSON, use that URL as Internal URL. If it returns an HTML page, you're still hitting a proxy.

---

### "Admin API not reachable" or 401 errors

**Causes:**
- Invalid admin access token
- Token belongs to a non-admin user
- Token has been invalidated
- Internal URL is wrong

**Solutions:**
1. Verify the token works directly against the **internal** Synapse URL:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://synapse:8008/_synapse/admin/v1/registration_tokens
   ```
2. Ensure the user is a Synapse admin:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://synapse:8008/_synapse/admin/v2/users/@admin:example.com
   ```
   The response should show `"admin": true`.
3. Generate a new token and rotate it in Admin → Servers → [Server] → Rotate Token
4. Ensure Internal URL points to Synapse directly (not through a reverse proxy)

---

### "Token registration not supported"

**Error:** Diagnostics show `m.login.registration_token` not found in flows.

**Solution:** Add to your `homeserver.yaml`:
```yaml
enable_registration: true
registration_requires_token: true
```

Then restart Synapse.

---

### "MSC3861 detected"

**Error:** Diagnostics warn about delegated authentication.

**Explanation:** If your Synapse uses OIDC/MAS (MSC3861), token-based registration is not available. The portal is incompatible with this authentication mode.

**Solution:** Use a Synapse instance without delegated authentication.

---

## Registration

### "The invitation code is invalid or has expired"

**Causes:**
- Token has been deleted or disabled
- Token has expired (`expiry_time` in the past)
- Token usage limit reached (`completed >= uses_allowed`)
- Token was created on a different server than the one being registered against

**Solutions:**
1. Check token status in Admin → Tokens
2. Create a new token if the existing one is expired/exhausted
3. Verify the registration URL points to the correct server

---

### "Registration is not permitted"

**Cause:** Synapse has `enable_registration: false`.

**Solution:** Set `enable_registration: true` in `homeserver.yaml`.

---

### Username validation errors

The portal enforces Matrix localpart rules:
- Only lowercase letters, numbers, and `._=-`
- Maximum 255 characters
- Must not be already taken
- Must not be in a reserved namespace (e.g., `@whatsapp_*` for bridges)

---

## Admin Authentication

### Login succeeds but redirects back to login page

**Symptom:** You enter valid credentials, the login appears to succeed (no error), but you are immediately redirected back to the login page.

**Root cause:** The session cookie has the `Secure` flag set, but you are accessing the portal via plain HTTP. Browsers refuse to send `Secure` cookies over non-HTTPS connections.

**Solutions:**
1. Set `APP_URL` to your actual access URL (e.g. `http://192.168.1.100:3000`)
2. Or set `COOKIE_SECURE=false` in your `.env` file
3. Or access the portal via HTTPS (recommended for production)

**Diagnosis:** Check `docker compose logs app` for:
```
[auth] Session check: no session cookie received
```
This confirms the browser is not sending the cookie.

---

### Session expires immediately after login

**Causes:**
- `SESSION_SECRET` changed between login and the next request (container restart with a new random secret)
- Cookie `path` mismatch (should be `/`)

**Solutions:**
- Ensure `SESSION_SECRET` is set in `.env` and not randomly generated
- Check logs for `[auth] Session config:` to verify cookie settings

---

### Login works locally but not behind reverse proxy

**Causes:**
- Proxy strips or does not forward cookies
- `APP_URL` does not match the public URL
- `Secure` cookie enabled but proxy connects to the app via HTTP internally

**Solutions:**
1. Set `APP_URL` to the public HTTPS URL (e.g. `https://invite.example.com`)
2. Ensure proxy forwards `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers
3. If the proxy connects to the app via HTTP internally but provides HTTPS externally, `APP_URL=https://...` is correct — the cookie will be Secure, and the browser will send it over HTTPS

---

## Admin Dashboard

### Server selector is empty

**Cause:** No servers have been added yet.

**Solution:** Go to Admin → Servers and add your first homeserver.

---

### "No server selected" errors

**Cause:** The server context selector has no server selected, or the previously selected server was deleted.

**Solution:** Select a server from the dropdown in the admin sidebar.

---

### Changes not reflected after server switch

**Cause:** The browser may have cached API responses.

**Solution:** Hard refresh the page (`Ctrl+Shift+R` / `Cmd+Shift+R`) or clear the server selection in the dropdown and re-select.

---

## Branding

### Uploaded images not showing

**Causes:**
- The `uploads` Docker volume is not mounted
- File permissions issue
- Image was uploaded to a draft profile (not published)

**Solutions:**
1. Verify the volume is mounted: `docker compose exec app ls /app/data/uploads/branding/`
2. Check file ownership: `docker compose exec app ls -la /app/data/uploads/branding/`
3. Publish the branding profile (Admin → Branding → Publish)

---

### SVG upload rejected

**By design:** SVG files are blocked to prevent XSS attacks. Use PNG, JPEG, WebP, GIF, or ICO instead.

---

## Docker Build

### Prisma schema not found during build

**Error:** `Could not find Prisma Schema` during `npm ci` in Docker build.

**Cause:** The `postinstall` script runs `prisma generate`, which needs `prisma/schema.prisma`.

**Solution:** The Dockerfile copies the prisma directory before `npm ci`:
```dockerfile
COPY prisma ./prisma
RUN npm ci
```

If you see this error, ensure your Dockerfile includes this `COPY` line.

---

## Performance

### Slow API responses

**Causes:**
- Synapse is under heavy load
- Database queries are slow
- Network latency between portal and Synapse

**Solutions:**
1. Check Synapse health independently
2. Add database indexes (Prisma schema already includes indexes on key columns)
3. If Synapse is remote, consider running the portal closer to it

---

### Rate limiting too aggressive

**Solution:** Increase the rate limit window or max requests in `.env`:
```bash
RATE_LIMIT_WINDOW_MS=1800000   # 30 minutes
RATE_LIMIT_MAX_REQUESTS=30     # 30 requests
```

Note: Rate limits are in-memory and reset on application restart.

## Getting Help

1. Check the [Diagnostics](./features/diagnostics) page for automated health checks
2. Review the [Audit Log](./features/audit-log) for recent errors
3. Check container logs: `docker compose logs -f app`
4. Open an issue on [GitHub](https://github.com/RiDDiX/regtokendashboard-synapse/issues)
