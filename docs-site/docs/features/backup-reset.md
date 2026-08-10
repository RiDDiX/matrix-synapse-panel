---
sidebar_position: 9
title: Backup & Reset
---

# Backup & Reset

Synapse has no backup or reset Admin API. A complete homeserver backup lives on the host (database, media store, config directory including the signing key), and a true factory reset must run there too. Following the same **preparation-tool** approach as [Server Preparation](../getting-started/synapse-configuration), the panel generates ready-to-run scripts; you deploy and run them on the homeserver host. The reset page additionally offers a soft wipe performed entirely through documented Admin API endpoints.

## Backup

Navigate to **Admin → Backup** (`/admin/backup`). Requires the `backup` permission.

Fill in the deployment details (Docker container or native postgres host, database name/user, config directory, media store path, backup directory, retention, cron schedule) and generate a backup kit:

| Artifact | Purpose |
|---|---|
| **backup.sh** | `pg_dump` of the database, optional media store archive, config/signing-key archive, retention cleanup |
| **restore.sh** | Restores a chosen backup directory into an empty database and the media/config paths, with interactive confirmation |
| **crontab line** | Schedules `backup.sh` with logging |
| **checklist** | Deployment and safety steps |

Each script is generated with `set -euo pipefail`. Copy or download the files, place them on the homeserver host, and install the cron line. Panel data (token metadata, audit logs, server list) is exported separately on the Export page.

:::tip
Test the restore script against a throwaway database before relying on it, and store backups on a different machine or volume than the homeserver. The signing key inside the config archive is secret — protect the backup files accordingly.
:::

Backup guidance follows the [official Synapse documentation](https://element-hq.github.io/synapse/latest/usage/administration/backups.html).

## Server Reset

Navigate to **Admin → Server Reset** (`/admin/reset`). All actions are **global-admin only** and require typing the exact server name to confirm, checked server-side.

### Soft wipe

Performed entirely through official Synapse Admin API endpoints:

- **Delete all rooms** — async v2 room deletion with optional purge and block, plus delete-status polling
- **Deactivate all users** — deactivates every non-admin account, with optional GDPR erase. Admin accounts are skipped so the panel's own admin token keeps working
- **Delete all media** — deletes all local media and purges the remote media cache
- **Delete all registration tokens** — removes every token and its panel metadata

### Factory reset script

A true reset (empty database, empty media store) cannot be done via the Admin API. The panel generates a host-level script that stops Synapse, drops and recreates the database, wipes the media store, and restarts.

:::danger
Wiping the database while keeping the same `server_name` breaks federation: remote homeservers keep cached events, device keys, and your signing key. After a full wipe the [official recommendation](https://element-hq.github.io/synapse/latest/usage/administration/admin_faq.html) is to use a new `server_name`. Always take a backup first.
:::
