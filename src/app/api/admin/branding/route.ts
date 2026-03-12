import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { listProfiles, createProfile, sanitizeProfile } from "@/lib/branding";
import { brandingCreateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const profiles = await listProfiles();
  return NextResponse.json({ profiles: profiles.map(sanitizeProfile) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = brandingCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const profile = await createProfile(parsed.data.name);

  await logAudit({
    action: "branding.created",
    actor: auth.email,
    target: profile.id,
    detail: `name: ${parsed.data.name}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ profile: sanitizeProfile(profile) }, { status: 201 });
}
