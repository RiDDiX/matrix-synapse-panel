import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/synapse";
import { tokenValidationSchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rl = checkRateLimit(`validate:${ip}`, { windowMs: 60_000, maxRequests: 10 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many validation requests." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = tokenValidationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const valid = await validateToken(parsed.data.token);
  return NextResponse.json({ valid });
}
