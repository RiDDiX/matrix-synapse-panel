import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { deleteAsset, getAssetById } from "@/lib/branding";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const asset = await getAssetById(id);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  await deleteAsset(id);

  await logAudit({
    action: "branding.asset.deleted",
    actor: auth.email,
    target: id,
    detail: `purpose: ${asset.purpose}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
