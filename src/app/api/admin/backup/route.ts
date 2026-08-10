import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { backupConfigSchema } from "@/lib/validation";
import { generateBackupKit, validateBackupConfig, type BackupConfig } from "@/lib/backup";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * POST /api/admin/backup
 *
 * Generate a Synapse backup kit (backup.sh, restore.sh, cron line, checklist).
 * Synapse has no backup Admin API — a full backup is database + media store +
 * config/signing key on the homeserver host, so this is a PREPARATION tool
 * like server-prep: it generates scripts, the administrator deploys them.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission("backup");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = backupConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const config = parsed.data as BackupConfig;
  const issues = validateBackupConfig(config);
  if (issues.length > 0) {
    return NextResponse.json({ error: "Invalid configuration", details: { config: issues } }, { status: 400 });
  }

  const kit = generateBackupKit(config);

  await logAudit({
    action: "backup.script.generated",
    actor: auth.email,
    target: config.serverName,
    detail: `generated backup kit (${config.deployment}, media ${config.includeMedia ? "included" : "excluded"}, retention ${config.retentionDays}d)`,
    ip: getClientIp(request),
  });

  return NextResponse.json(kit);
}
