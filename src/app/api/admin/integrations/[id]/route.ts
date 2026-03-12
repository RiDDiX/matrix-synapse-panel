import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import {
  getInstalledIntegration,
  updateIntegrationConfig,
  enableIntegration,
  disableIntegration,
  uninstallIntegration,
  checkIntegrationHealth,
  getGeneratedFiles,
} from "@/lib/integrations/engine";
import { getCatalogEntry } from "@/lib/integrations/catalog";
import { integrationConfigSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const integration = await getInstalledIntegration(id);

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  const catalogEntry = getCatalogEntry(integration.catalogId);
  const files = await getGeneratedFiles(id);

  return NextResponse.json({ integration, catalogEntry: catalogEntry ?? null, files });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const integration = await getInstalledIntegration(id);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = integrationConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid config", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await updateIntegrationConfig(id, parsed.data.config as Record<string, unknown>, auth.email);

  await logAudit({
    action: "integration.updated",
    actor: auth.email,
    target: id,
    detail: `config updated, keys: ${Object.keys(parsed.data.config).join(", ")}`,
    ip: getClientIp(request),
  });

  const updated = await getInstalledIntegration(id);
  return NextResponse.json({ integration: updated });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const integration = await getInstalledIntegration(id);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  if (integration.enabled) {
    return NextResponse.json({ error: "Disable the integration before uninstalling" }, { status: 409 });
  }

  await uninstallIntegration(id);

  await logAudit({
    action: "integration.uninstalled",
    actor: auth.email,
    target: id,
    detail: `catalog: ${integration.catalogId}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const integration = await getInstalledIntegration(id);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  if (action === "enable") {
    await enableIntegration(id);
    await logAudit({ action: "integration.enabled", actor: auth.email, target: id, ip: getClientIp(request) });
    const updated = await getInstalledIntegration(id);
    return NextResponse.json({ integration: updated });
  }

  if (action === "disable") {
    await disableIntegration(id);
    await logAudit({ action: "integration.disabled", actor: auth.email, target: id, ip: getClientIp(request) });
    const updated = await getInstalledIntegration(id);
    return NextResponse.json({ integration: updated });
  }

  if (action === "health") {
    const health = await checkIntegrationHealth(id);
    return NextResponse.json({ health });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
