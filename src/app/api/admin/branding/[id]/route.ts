import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { getProfileById, updateProfile, deleteProfile, resetProfile, sanitizeProfile } from "@/lib/branding";
import { brandingUpdateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const profile = await getProfileById(id);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: sanitizeProfile(profile) });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission("branding.write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const existing = await getProfileById(id);
  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = brandingUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const profile = await updateProfile(id, parsed.data);
  const changedFields = Object.keys(parsed.data).join(", ");

  await logAudit({
    action: "branding.updated",
    actor: auth.email,
    target: id,
    detail: `fields: ${changedFields}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ profile: sanitizeProfile(profile) });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission("branding.write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const existing = await getProfileById(id);
  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (existing.isActive) {
    return NextResponse.json({ error: "Cannot delete the active profile" }, { status: 409 });
  }

  await deleteProfile(id);

  await logAudit({
    action: "branding.deleted",
    actor: auth.email,
    target: id,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission("branding.write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "reset") {
    const profile = await resetProfile(id);
    await logAudit({
      action: "branding.reset",
      actor: auth.email,
      target: id,
      ip: getClientIp(request),
    });
    return NextResponse.json({ profile: sanitizeProfile(profile) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
