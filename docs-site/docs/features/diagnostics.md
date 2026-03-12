---
sidebar_position: 8
title: Diagnostics
---

# Diagnostics

RiDDiX Matrix Control provides two levels of diagnostics: **Synapse connectivity checks** and **integration system diagnostics**.

## Synapse Diagnostics

Navigate to **Admin → Diagnostics** to run a connectivity check against the currently selected server.

### Checks Performed

| Check | Description |
|---|---|
| **Synapse Reachable** | Connects to `/_matrix/client/versions` to verify the server is up |
| **Admin API Reachable** | Tests the admin token against `/_synapse/admin/v1/registration_tokens` |
| **Token Endpoints Available** | Confirms the registration token admin endpoints respond with 200 |
| **Registration Flow Available** | Sends an empty POST to `/_matrix/client/v3/register` and inspects UIA flows |
| **Token Registration Supported** | Checks that `m.login.registration_token` appears in the flow stages |
| **MSC3861 Detected** | Warns if delegated authentication (OIDC) is detected |
| **Registration Enabled** | Confirms registration is not disabled (403 response) |

### Results

Each check returns a pass/fail status. Errors include descriptive messages:
- Connection failures with the target URL
- HTTP status codes and response bodies
- Missing UIA flow stages
- Incompatibility warnings (MSC3861)

### Server-Level Diagnostics

You can also run diagnostics from the server detail page (Admin → Servers → [Server] → Run Diagnostics). Results are stored in the `ManagedServer` record:
- `lastDiagAt` — when diagnostics last ran
- `lastDiagOk` — whether all checks passed
- `diagJson` — full diagnostics result as JSON

## Integration System Diagnostics

Navigate to **Admin → Int. Diagnostics** for a system-wide health snapshot.

### Checks Performed

| Check | Description |
|---|---|
| **Synapse Connectivity** | Tests connection to the selected server's Synapse instance |
| **Environment Variables** | Checks presence of required (`DATABASE_URL`, `SESSION_SECRET`) and optional (`SYNAPSE_CONFIG_DIR`, `SYNAPSE_APPSERVICE_DIR`) env vars |
| **Appservice Registration** | Verifies appservice directory is writable (managed mode) |
| **Filesystem** | Checks data directory write permissions |
| **Docker** | Detects Docker availability |
| **Docker Compose** | Detects Docker Compose availability |
| **Capability Mode** | Reports whether managed or guided mode is active |
| **Integration Health** | Runs health checks on all enabled integrations |
| **Bot Health** | Checks status of all enabled bots |

### Capability Mode Detection

The system auto-detects the deployment mode:

| Condition | Mode |
|---|---|
| Docker + Docker Compose + writable Synapse dirs | **Managed** |
| Any requirement missing | **Guided** |

In managed mode, the platform can write files and manage Docker containers. In guided mode, it generates files for manual deployment.
