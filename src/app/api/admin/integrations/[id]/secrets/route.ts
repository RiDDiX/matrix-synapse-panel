import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getInstalledIntegration, setIntegrationSecret } from "@/lib/integrations/engine";
import { integrationSecretSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const integration = await getInstalledIntegration(id);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = integrationSecretSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await setIntegrationSecret(id, parsed.data.key, parsed.data.value);

  await logAudit({
    action: "integration.secret.rotated",
    actor: auth.email,
    target: id,
    detail: `key: ${parsed.data.key}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
