import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { getProfileById, publishProfile, sanitizeProfile } from "@/lib/branding";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requirePermission("branding.write");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const existing = await getProfileById(id);
  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const profile = await publishProfile(id);

  await logAudit({
    action: "branding.published",
    actor: auth.email,
    target: id,
    detail: `version: ${profile.version}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ profile: sanitizeProfile(profile) });
}
