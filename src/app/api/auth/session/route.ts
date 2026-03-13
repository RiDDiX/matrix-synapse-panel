import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const hasCookie = cookieStore.has(SESSION_COOKIE_NAME);

  const session = await getSession();
  if (!session.isLoggedIn) {
    if (!hasCookie) {
      console.log("[auth] Session check: no session cookie received — likely a Secure cookie mismatch (check APP_URL / COOKIE_SECURE)");
    } else {
      console.log("[auth] Session check: cookie present but session invalid or expired");
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email: session.email });
}
