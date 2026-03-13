---
sidebar_position: 3
title: Environment Variables
---

# Environment Variables

All configuration is done via environment variables. In Docker deployments, these are loaded from the `.env` file via `env_file`.

## Required Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g., `postgresql://portal:pass@db:5432/invite_portal`) |
| `SESSION_SECRET` | Secret for iron-session cookies **and** AES-256-GCM encryption. Minimum 32 characters. Generate with `openssl rand -hex 32`. |
| `ADMIN_EMAIL` | Email address for the admin seed account |
| `ADMIN_PASSWORD` | Password for the admin seed account (bcrypt-hashed at seed time) |

## Optional Variables

| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `RiDDiX - Matrix Synapse Panel` | Application display name |
| `APP_URL` | `http://localhost:3000` | Public URL of the application |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in milliseconds (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `15` | Maximum requests per rate limit window |
| `CAPTCHA_SITE_KEY` | — | hCaptcha or reCAPTCHA site key (placeholder for future use) |
| `CAPTCHA_SECRET` | — | CAPTCHA secret key |
| `COOKIE_SECURE` | _(auto)_ | Override the Secure flag on session cookies. `true` or `false`. Auto-detected from `APP_URL` if not set. |
| `SYNAPSE_CONFIG_DIR` | — | Path to Synapse config directory (for managed integration mode) |
| `SYNAPSE_APPSERVICE_DIR` | — | Path to Synapse appservice registration directory |

## Legacy Single-Server Variables

These variables are **optional** when using multi-server management (Admin → Servers). They serve as fallback for backward compatibility with single-server deployments where no `ManagedServer` is configured in the database.

| Variable | Description |
|---|---|
| `SYNAPSE_INTERNAL_URL` | Synapse URL reachable from the app (e.g., `http://synapse:8008`) |
| `SYNAPSE_PUBLIC_URL` | Public Synapse URL shown to users (e.g., `https://matrix.example.com`) |
| `SYNAPSE_SERVER_NAME` | Matrix server name (e.g., `example.com`) |
| `SYNAPSE_ADMIN_ACCESS_TOKEN` | Synapse admin user access token |

:::info
In multi-server mode, each homeserver's connection details (URL, admin token, server name) are stored in the database as `ManagedServer` records. The legacy env vars are only used if no server can be resolved from the request.
:::

## Docker Compose Variables

These are used by the `docker-compose.yml` to configure the PostgreSQL container:

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `portal` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `portal` | PostgreSQL password |
| `POSTGRES_DB` | `invite_portal` | PostgreSQL database name |

## Security Notes

- **`SESSION_SECRET`** is critical. It is used to derive the AES-256-GCM encryption key for all encrypted data (server admin tokens, integration secrets, bot access tokens). Changing it after deployment will make existing encrypted data unreadable.
- Never commit `.env` files to version control.
- Use strong, unique values for all secrets.
- The `.env.example` file contains `CHANGE_ME` placeholders — replace every one of them.
