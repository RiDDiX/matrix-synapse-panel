import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const rl = checkRateLimit(`login:${ip}`, { windowMs: 900_000, maxRequests: 10 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const emailRl = checkRateLimit(`login:email:${email.toLowerCase()}`, { windowMs: 900_000, maxRequests: 5 });
  if (!emailRl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: getRateLimitHeaders(emailRl) }
    );
  }

  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user) {
    console.log(`[auth] Login failed: unknown email, ip=${ip}`);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    console.log(`[auth] Login failed: bad password for ${email}, ip=${ip}`);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.isLoggedIn = true;
  await session.save();

  console.log(`[auth] Login success: ${email}, ip=${ip}`);
  await logAudit({ action: "admin.login", actor: user.email, ip });

  return NextResponse.json({ ok: true });
}
