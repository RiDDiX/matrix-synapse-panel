import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { serverPrepSchema } from "@/lib/validation";
import { generateServerPrep, validatePrepConfig, type ServerPrepConfig } from "@/lib/server-prep";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * POST /api/admin/server-prep
 *
 * Generate Synapse server preparation assets (homeserver.yaml, docker-compose.yaml, .env).
 * This is a PREPARATION tool — it generates files, not running servers.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = serverPrepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid configuration", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const config = parsed.data as ServerPrepConfig;

  // Validate config consistency
  const validation = validatePrepConfig(config);

  const result = generateServerPrep(config);

  await logAudit({
    action: "server.prep.generated",
    actor: auth.email,
    target: config.serverName,
    detail: `generated config for ${config.serverName} (${config.database}, port ${config.bindPort})`,
    ip: getClientIp(request),
  });

  return NextResponse.json({
    ...result,
    validation,
  });
}

/**
 * PUT /api/admin/server-prep
 *
 * Validate a server prep configuration without generating files.
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = serverPrepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid configuration", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const config = parsed.data as ServerPrepConfig;
  const validation = validatePrepConfig(config);

  return NextResponse.json({ validation });
}
