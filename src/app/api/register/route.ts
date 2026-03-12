import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/synapse";
import { logAudit } from "@/lib/audit";
import { registrationSchema } from "@/lib/validation";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 15);

  const rl = checkRateLimit(`register:${ip}`, { windowMs, maxRequests });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const { username, password, token, displayName } = parsed.data;

  await logAudit({
    action: "registration.attempt",
    target: username,
    ip,
  });

  const result = await registerUser(username, password, token, displayName);

  if (result.success) {
    await logAudit({
      action: "registration.success",
      target: result.userId ?? username,
      ip,
    });

    return NextResponse.json({
      success: true,
      userId: result.userId,
      homeserver: process.env.SYNAPSE_PUBLIC_URL,
    });
  }

  await logAudit({
    action: "registration.failure",
    target: username,
    detail: result.errorCode ?? "unknown",
    ip,
  });

  const statusMap: Record<string, number> = {
    M_USER_IN_USE: 409,
    M_INVALID_USERNAME: 400,
    M_WEAK_PASSWORD: 400,
    M_FORBIDDEN: 403,
    M_LIMIT_EXCEEDED: 429,
    M_UNKNOWN_TOKEN: 403,
    M_UNAUTHORIZED: 403,
    MSC3861_INCOMPATIBLE: 501,
    TOKEN_FLOW_UNAVAILABLE: 501,
    UNSUPPORTED_STAGE: 501,
    ADDITIONAL_STAGES_REQUIRED: 501,
    NO_SESSION: 502,
  };

  const status = statusMap[result.errorCode ?? ""] ?? 400;
  return NextResponse.json({ error: result.error, errorCode: result.errorCode }, { status });
}
