import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { validateAssetUpload, storeAsset, getProfileById, sanitizeAsset } from "@/lib/branding";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";
import { ASSET_PURPOSES, type AssetPurpose } from "@/lib/branding-defaults";

export async function POST(request: NextRequest) {
  const auth = await requirePermission("branding.write");
  if (auth instanceof NextResponse) return auth;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const profileId = formData.get("profileId") as string | null;
  const purpose = formData.get("purpose") as string | null;

  if (!file || !profileId || !purpose) {
    return NextResponse.json({ error: "Missing file, profileId, or purpose" }, { status: 400 });
  }

  if (!ASSET_PURPOSES.includes(purpose as AssetPurpose)) {
    return NextResponse.json({ error: "Invalid asset purpose" }, { status: 400 });
  }

  const profile = await getProfileById(profileId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const validation = validateAssetUpload(file, purpose as AssetPurpose);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const asset = await storeAsset(profileId, purpose as AssetPurpose, file);

  await logAudit({
    action: "branding.asset.uploaded",
    actor: auth.email,
    target: asset.id,
    detail: `purpose: ${purpose}, type: ${file.type}, size: ${file.size}`,
    ip: getClientIp(request),
  });

  return NextResponse.json({ asset: sanitizeAsset(asset) }, { status: 201 });
}
