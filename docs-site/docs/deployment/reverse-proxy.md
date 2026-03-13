---
sidebar_position: 2
title: Reverse Proxy
---

# Reverse Proxy Configuration

RiDDiX - Matrix Synapse Panel binds to `127.0.0.1:3000` and should be served behind a reverse proxy with TLS termination.

## Nginx

### Basic Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name portal.example.com;

    ssl_certificate /etc/letsencrypt/live/portal.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to the app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Asset uploads (increase body size for branding assets)
    client_max_body_size 5M;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name portal.example.com;
    return 301 https://$host$request_uri;
}
```

### Important Headers

| Header | Purpose |
|---|---|
| `X-Real-IP` | Client IP for rate limiting and audit logging |
| `X-Forwarded-For` | Proxy chain for IP detection |
| `X-Forwarded-Proto` | Protocol detection for secure cookies |
| `Host` | Required for correct URL generation |

The application reads client IP from `X-Forwarded-For` first, then `X-Real-IP`, for rate limiting and audit log entries.

## Caddy

Caddy provides automatic HTTPS with Let's Encrypt.

### Caddyfile

```
portal.example.com {
    reverse_proxy 127.0.0.1:3000

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

Caddy automatically:
- Obtains and renews TLS certificates
- Sets `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Real-IP` headers
- Handles HTTP to HTTPS redirects

## Traefik

### Docker Labels

If running Traefik as a Docker reverse proxy:

```yaml
services:
  app:
    # ... existing config
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portal.rule=Host(`portal.example.com`)"
      - "traefik.http.routers.portal.entrypoints=websecure"
      - "traefik.http.routers.portal.tls.certresolver=letsencrypt"
      - "traefik.http.services.portal.loadbalancer.server.port=3000"
      - "traefik.http.middlewares.portal-headers.headers.stsSeconds=63072000"
      - "traefik.http.middlewares.portal-headers.headers.stsIncludeSubdomains=true"
      - "traefik.http.middlewares.portal-headers.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.portal-headers.headers.frameDeny=true"
      - "traefik.http.routers.portal.middlewares=portal-headers"
    networks:
      - portal
      - traefik
```

## Session Cookie and Authentication

The session cookie's `Secure` flag is determined by `APP_URL`:
- **`APP_URL=https://...`** → cookie has `Secure` flag → browser only sends it over HTTPS ✓
- **`APP_URL=http://...`** → cookie has no `Secure` flag → works over plain HTTP ✓

You can override this with `COOKIE_SECURE=true` or `COOKIE_SECURE=false` in your `.env` file.

:::danger
If your reverse proxy provides HTTPS to the browser but connects to the app via HTTP internally, set `APP_URL` to the **public HTTPS URL**. The `Secure` flag is about browser-to-proxy communication, not proxy-to-app.
:::

## Security Considerations

- **Always use HTTPS in production.** Set `APP_URL` to your public HTTPS URL (e.g., `https://portal.example.com`).
- **Do not expose port 3000 to the internet.** The app binds to `127.0.0.1` by default in the Docker Compose configuration.
- **Ensure `X-Forwarded-For` or `X-Real-IP` headers are set** by your proxy. These are used for rate limiting and audit logging. Without them, all requests appear to come from the proxy's IP.
- **Set `client_max_body_size`** (Nginx) to at least 5 MB for branding asset uploads.
