import { NextRequest, NextResponse } from "next/server";
import { getAssetById, readAssetFile } from "@/lib/branding";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const asset = await getAssetById(id);

  if (!asset) {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = await readAssetFile(asset);
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
