---
sidebar_position: 2
title: Database Schema
---

# Database Schema

RiDDiX Matrix Control uses PostgreSQL with Prisma ORM. All table and column names use `snake_case` mapping.

## Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  AdminUser   │     │  ManagedServer   │     │ BrandingProfile  │
│──────────────│     │──────────────────│     │──────────────────│
│ id           │     │ id               │◄────│ id               │
│ email        │     │ name             │     │ name             │
│ password     │     │ slug (unique)    │     │ isActive         │
│ name         │     │ serverName       │     │ isDraft          │
│ role         │     │ internalUrl      │     │ version          │
└──────────────┘     │ publicUrl        │     │ (theme fields)   │
                     │ status           │     │ (content fields) │
                     │ enabled          │     │ (link fields)    │
                     │ isDefault        │     └────────┬─────────┘
                     │ adminTokenEnc    │              │
                     │ adminTokenIv     │     ┌────────┴─────────┐
                     │ adminTokenTag    │     │  BrandingAsset   │
                     │ brandingProfileId│────►│──────────────────│
                     │ (diag fields)    │     │ id               │
                     │ (config fields)  │     │ profileId        │
                     └───────┬──────────┘     │ purpose          │
                             │                │ filename         │
              ┌──────────────┼────────────┐   │ storagePath      │
              │              │            │   │ mimeType, size   │
              ▼              ▼            ▼   └──────────────────┘
     ┌────────────┐ ┌────────────┐ ┌──────────────────────┐
     │ TokenMeta  │ │ AuditLog   │ │InstalledIntegration  │
     │────────────│ │────────────│ │──────────────────────│
     │ id         │ │ id         │ │ id                   │
     │ serverId   │ │ serverId?  │ │ serverId             │
     │ token      │ │ action     │ │ catalogId            │
     │ label      │ │ actor      │ │ name, type           │
     │ note       │ │ target     │ │ deploymentMode       │
     │ createdBy  │ │ detail     │ │ status, enabled      │
     └────────────┘ │ ip         │ │ configJson           │
                    └────────────┘ │ (docker fields)      │
                                   │ (health fields)      │
                                   │ (appservice fields)  │
                                   └───────┬──────────────┘
                                           │
                              ┌────────────┼────────────┐
                              ▼                         ▼
                    ┌──────────────────┐   ┌──────────────────┐
                    │IntegrationSecret │   │IntegrationConfig │
                    │──────────────────│   │──────────────────│
                    │ id               │   │ id               │
                    │ integrationId    │   │ integrationId    │
                    │ key              │   │ version          │
                    │ encryptedValue   │   │ configJson       │
                    │ iv, tag          │   │ appliedAt        │
                    │ rotatedAt        │   │ createdBy        │
                    └──────────────────┘   └──────────────────┘

     ┌──────────────────┐
     │  BotDefinition   │◄── ManagedServer.bots
     │──────────────────│
     │ id               │
     │ serverId         │
     │ templateId       │
     │ displayName      │
     │ localpart        │
     │ matrixUserId     │
     │ status, enabled  │
     │ configJson       │
     │ accessTokenEnc   │
     │ accessTokenIv    │
     │ accessTokenTag   │
     └───────┬──────────┘
             │
    ┌────────┼──────────┐
    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐
│BotRoomAssignment │ │ BotFeatureFlag   │
│──────────────────│ │──────────────────│
│ id               │ │ id               │
│ botId            │ │ botId            │
│ roomId           │ │ featureKey       │
│ roomAlias        │ │ enabled          │
│ configJson       │ │ configJson       │
│ active           │ │ scope            │
│ joinedAt         │ │ scopeId          │
└──────────────────┘ └──────────────────┘
```

## Models

### AdminUser

Stores admin dashboard credentials. Passwords are bcrypt-hashed.

| Column | Type | Description |
|---|---|---|
| `id` | cuid | Primary key |
| `email` | string | Unique login email |
| `password` | string | bcrypt hash |
| `name` | string? | Display name |
| `role` | string | Default: `global_admin` |

### ManagedServer

Represents a Matrix Synapse homeserver managed by the portal.

| Column | Type | Description |
|---|---|---|
| `id` | cuid | Primary key |
| `name` | string | Display name |
| `slug` | string | Unique URL-safe identifier |
| `server_name` | string | Matrix server name (e.g., `example.com`) |
| `internal_url` | string | Synapse URL reachable from portal |
| `public_url` | string | Public Synapse URL |
| `status` | string | `draft`, `active`, `disabled`, `error` |
| `enabled` | boolean | Whether the server is active |
| `is_default` | boolean | Whether this is the fallback server |
| `admin_token_enc` | text? | AES-256-GCM encrypted admin token |
| `admin_token_iv` | string? | Encryption initialization vector |
| `admin_token_tag` | string? | Encryption authentication tag |
| `capability_mode` | string? | `managed` or `guided` |
| `last_diag_at` | datetime? | Last diagnostics run |
| `last_diag_ok` | boolean? | Whether last diagnostics passed |
| `diag_json` | text? | Full diagnostics result |
| `public_domain` | string? | Custom domain for registration |
| `route_prefix` | string? | URL path prefix |
| `registration_mode` | string? | Registration mode config |
| `managed_mode` | string? | Managed mode config |
| `branding_profile_id` | string? | FK to BrandingProfile |

**Indexes:** `server_name`, `slug`, `status`

**Relations:** TokenMeta[], AuditLog[], InstalledIntegration[], BotDefinition[], BrandingProfile?

### TokenMeta

Local metadata for Synapse registration tokens.

| Column | Type | Description |
|---|---|---|
| `id` | cuid | Primary key |
| `server_id` | string | FK to ManagedServer |
| `token` | string | Token value (matches Synapse) |
| `label` | string? | Display label |
| `note` | string? | Internal note |
| `created_by` | string? | Admin who created it |

**Unique:** `(server_id, token)`

### AuditLog

Audit trail for all actions.

| Column | Type | Description |
|---|---|---|
| `id` | cuid | Primary key |
| `server_id` | string? | FK to ManagedServer (null for global actions) |
| `action` | string | Action type (e.g., `token.created`) |
| `actor` | string? | Who performed the action |
| `target` | string? | What was affected |
| `detail` | string? | Additional context (sanitized) |
| `ip` | string? | Client IP address |

**Indexes:** `server_id`, `action`, `created_at`

### BrandingProfile

Branding configuration for the registration page.

Contains ~25 theme/content/link fields. See [Branding System](../features/branding) for details.

**Relations:** BrandingAsset[], ManagedServer[]

### InstalledIntegration

An installed bridge or service.

| Column | Type | Description |
|---|---|---|
| `id` | cuid | Primary key |
| `server_id` | string | FK to ManagedServer |
| `catalog_id` | string | Reference to catalog entry |
| `name` | string | Display name |
| `type` | string | `bridge`, `bot`, `synapse_module`, `external_service` |
| `deployment_mode` | string | `managed` or `guided` |
| `status` | string | Lifecycle status |
| `enabled` | boolean | Whether active |
| `config_json` | text? | Current configuration |
| `container_name` | string? | Docker container name |
| `appservice_id` | string? | Appservice registration ID |

**Relations:** IntegrationSecret[], IntegrationConfig[]

### BotDefinition

A bot created from a template.

| Column | Type | Description |
|---|---|---|
| `id` | cuid | Primary key |
| `server_id` | string | FK to ManagedServer |
| `template_id` | string | Reference to bot template |
| `display_name` | string | Bot display name |
| `localpart` | string? | Matrix localpart |
| `matrix_user_id` | string? | Full Matrix user ID |
| `access_token_enc` | text? | Encrypted access token |
| `access_token_iv` | string? | IV |
| `access_token_tag` | string? | Auth tag |

**Unique:** `(server_id, localpart)`

**Relations:** BotRoomAssignment[], BotFeatureFlag[]

## Migrations

Migrations are stored in `prisma/migrations/` and run automatically on container startup via `docker-entrypoint.sh`:

| Migration | Description |
|---|---|
| `20240101000000_init` | Initial schema (AdminUser, TokenMeta, AuditLog) |
| `20240102000000_branding` | BrandingProfile, BrandingAsset |
| `20240103000000_integrations` | Integration and bot tables |
| `20240104000000_multi_server` | ManagedServer, serverId columns |
