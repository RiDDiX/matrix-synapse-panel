# RiDDiX Invite Portal

Invitation-code-based self-registration portal for Matrix Synapse homeservers.

Provides an admin dashboard for managing registration tokens and a public registration page for invited users.

## Features

- **Admin Dashboard** — overview stats, token CRUD with labels/notes, audit log, Synapse diagnostics
- **Branding Management** — full white-label system: visual identity, theme colors, layout presets, custom content, footer links, asset uploads, draft/publish workflow with live preview
- **Public Registration** — branded form with invitation code validation, username/password/display name, dynamic theming from published branding profile
- **Synapse Integration** — wraps Synapse Admin API for token management; uses standard Matrix UIA registration flow with `m.login.registration_token`
- **Security** — admin tokens never exposed to clients, iron-session cookies, rate limiting, input validation (Zod), security headers, audit logging
- **Dark Mode** — full light/dark theme support
- **Docker Ready** — multi-stage Dockerfile, docker-compose with PostgreSQL, non-root container

## Requirements

- Node.js 20+
- PostgreSQL 14+
- Matrix Synapse homeserver with:
  - `enable_registration: true`
  - `registration_requires_token: true`
  - An admin user access token

## Quick Start (Docker)

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in **all** values marked `CHANGE_ME`:
   ```bash
   cp .env.example .env
   # Generate a session secret:
   openssl rand -hex 32
   # Edit .env and replace all CHANGE_ME placeholders
   ```
3. Run:
   ```bash
   docker compose up -d
   ```

The application binds to `127.0.0.1:3000` by default. Use a reverse proxy with TLS termination for production — see the `examples/` directory.

> **Important:** Never expose the application directly to the internet without HTTPS. Always run behind a reverse proxy with a valid TLS certificate.

## Quick Start (Development)

```bash
cp .env.example .env
# Edit .env with your values

npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `APP_NAME` | No | Application display name (default: RiDDiX Invite Portal) |
| `APP_URL` | No | Public URL of the application |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for iron-session (min 32 chars) |
| `ADMIN_EMAIL` | Yes | Admin login email |
| `ADMIN_PASSWORD` | Yes | Admin login password (hashed at seed time) |
| `SYNAPSE_INTERNAL_URL` | Yes | Synapse URL reachable from the app (e.g. `http://synapse:8008`) |
| `SYNAPSE_PUBLIC_URL` | Yes | Public Synapse URL shown to users |
| `SYNAPSE_SERVER_NAME` | Yes | Matrix server name (e.g. `example.com`) |
| `SYNAPSE_ADMIN_ACCESS_TOKEN` | Yes | Synapse admin user access token |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 900000) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 15) |

## Synapse Configuration

Your `homeserver.yaml` must include:

```yaml
enable_registration: true
registration_requires_token: true
```

Do **not** enable MSC3861/OIDC delegation — this portal uses the standard registration token flow.

### Obtaining an Admin Access Token

1. Log in to your Synapse as an admin user
2. Use the Synapse Admin API or Element's `/devtools` to retrieve the access token
3. Set it as `SYNAPSE_ADMIN_ACCESS_TOKEN` in your `.env`

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── admin/        # Protected admin endpoints (tokens, stats, audit, diagnostics, branding)
│   │   ├── auth/         # Login, logout, session check
│   │   ├── branding/     # Public branding + asset serving
│   │   ├── health/       # Health check endpoint
│   │   └── register/     # Public registration + token validation
│   ├── admin/            # Admin dashboard pages (overview, tokens, branding, audit, diagnostics)
│   └── register/         # Public registration page with dynamic branding
├── __tests__/            # Unit tests (rate limiting, validation, types, branding)
├── components/
│   └── ui/               # shadcn/ui components
├── hooks/                # React hooks (toast)
└── lib/                  # Core utilities
    ├── audit.ts          # Audit logging
    ├── auth-guard.ts     # Admin route protection
    ├── branding.ts       # Branding service layer (CRUD, assets, publishing)
    ├── branding-defaults.ts # Default branding values and asset config
    ├── db.ts             # Prisma client
    ├── env.ts            # Environment validation
    ├── rate-limit.ts     # In-memory rate limiting
    ├── session.ts        # iron-session config
    ├── synapse.ts        # Synapse API wrapper
    ├── types.ts          # TypeScript type definitions
    ├── utils.ts          # Utility functions
    └── validation.ts     # Zod schemas
```

## Reverse Proxy

Example configurations are provided in the `examples/` directory:

- **Nginx** — `examples/nginx.conf`
- **Caddy** — `examples/caddy/Caddyfile`
- **Nginx Proxy Manager** — `examples/nginx-proxy-manager.md`
- **SWAG** — `examples/swag.md`

Ensure `X-Forwarded-For` and `X-Real-IP` headers are passed for accurate rate limiting and audit logging.

## API Endpoints

### Public

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/register` | Register a new user |
| `POST` | `/api/register/validate-token` | Check if a token is valid |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/branding` | Active branding config |
| `GET` | `/api/branding/assets/:id` | Serve branding asset |

### Admin (requires authentication)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Admin login |
| `POST` | `/api/auth/logout` | Admin logout |
| `GET` | `/api/auth/session` | Check session status |
| `GET` | `/api/admin/tokens` | List all tokens |
| `POST` | `/api/admin/tokens` | Create a token |
| `GET` | `/api/admin/tokens/:token` | Get token details |
| `PUT` | `/api/admin/tokens/:token` | Update a token |
| `DELETE` | `/api/admin/tokens/:token` | Delete a token |
| `GET` | `/api/admin/stats` | Dashboard statistics |
| `GET` | `/api/admin/audit` | Audit log entries |
| `GET` | `/api/admin/diagnostics` | Synapse connectivity check |
| `GET` | `/api/admin/branding` | List branding profiles |
| `POST` | `/api/admin/branding` | Create branding profile |
| `GET` | `/api/admin/branding/:id` | Get branding profile |
| `PUT` | `/api/admin/branding/:id` | Update branding profile (draft) |
| `DELETE` | `/api/admin/branding/:id` | Delete branding profile |
| `PATCH` | `/api/admin/branding/:id` | Reset profile to defaults |
| `POST` | `/api/admin/branding/:id/publish` | Publish branding profile |
| `POST` | `/api/admin/branding/assets` | Upload branding asset |
| `DELETE` | `/api/admin/branding/assets/:id` | Delete branding asset |

## Database

Uses PostgreSQL with Prisma ORM. Models:

- **AdminUser** — admin credentials (bcrypt hashed)
- **TokenMeta** — local labels/notes for Synapse tokens
- **AuditLog** — all admin and registration activity
- **BrandingProfile** — branding configuration (theme, layout, content, links)
- **BrandingAsset** — uploaded images (logo, favicon, hero, background)

Migrations run automatically on container startup via `docker-entrypoint.sh`.

## Security Notes

- Admin access tokens are **never** sent to the browser
- Passwords are **never** stored locally (only transient during registration submission to Synapse)
- Admin password is bcrypt-hashed at seed time
- All API inputs validated with Zod
- Rate limiting on login, registration, and token validation
- Security headers set via middleware (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- iron-session provides encrypted, HTTP-only, secure cookies
- Branding asset uploads validated by type, size, and extension (no SVG)
- Branding text fields sanitized against XSS; no raw HTML injection
- All branding changes logged in audit trail

## Branding

The admin dashboard includes a full branding management system at `/admin/branding`.

Capabilities:
- **Visual Identity** — app title, subtitle, logo, favicon, hero image, background image
- **Theme** — primary/secondary/accent/background/panel/text colors, button and input styles, border radius, shadow intensity, spacing density
- **Layout** — choose from centered, split-screen, left-image, top-branding, or compact presets
- **Content** — welcome headline, registration text, success message, footer, support text
- **Links** — privacy policy, imprint, terms of service, help page
- **Presentation** — homeserver display name, client recommendation, post-registration instructions

Workflow: edit fields → save draft → preview in live panel → publish. Reset to defaults at any time. All changes are versioned and audit-logged.

Uploaded assets are stored in `data/uploads/branding/` (Docker volume `uploads`). Accepted formats: PNG, JPEG, WebP, GIF, ICO. Max 2 MB (favicon: 256 KB).

## License

MIT
