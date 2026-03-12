import { NextResponse } from "next/server";
import { getActiveProfile, resolvePublicBranding } from "@/lib/branding";

export async function GET() {
  const profile = await getActiveProfile();
  const branding = resolvePublicBranding(profile);

  return NextResponse.json(branding, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
