import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { listInstalledIntegrations, installIntegration } from "@/lib/integrations/engine";
import { getCatalog, searchCatalog } from "@/lib/integrations/catalog";
import { installIntegrationSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const view = request.nextUrl.searchParams.get("view");

  if (view === "catalog") {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const entries = query ? searchCatalog(query) : getCatalog();
    return NextResponse.json({ catalog: entries });
  }

  const integrations = await listInstalledIntegrations();
  return NextResponse.json({ integrations });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = installIntegrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const result = await installIntegration(parsed.data.catalogId, auth.email);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAudit({
    action: "integration.installed",
    actor: auth.email,
    target: parsed.data.catalogId,
    detail: `mode: ${result.mode}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ result }, { status: 201 });
}
