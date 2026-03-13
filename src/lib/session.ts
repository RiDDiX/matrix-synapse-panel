import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  email?: string;
  isLoggedIn: boolean;
}

const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const SESSION_COOKIE_NAME = "riddix-invite-session";

function resolveSecureCookie(): boolean {
  const explicit = process.env.COOKIE_SECURE;
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  const appUrl = process.env.APP_URL || "";
  return appUrl.startsWith("https://");
}

let _sessionConfigLogged = false;

function getSessionOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }

  const secure = resolveSecureCookie();

  if (!_sessionConfigLogged) {
    _sessionConfigLogged = true;
    const appUrl = process.env.APP_URL || "(not set)";
    const cookieSecureEnv = process.env.COOKIE_SECURE || "(auto)";
    console.log(
      `[auth] Session config: cookie=${SESSION_COOKIE_NAME}, secure=${secure}, sameSite=lax, ` +
      `APP_URL=${appUrl}, COOKIE_SECURE=${cookieSecureEnv}, NODE_ENV=${process.env.NODE_ENV}`
    );
    if (!secure && process.env.NODE_ENV === "production") {
      console.warn(
        "[auth] WARNING: Secure cookies are DISABLED in production. " +
        "Set APP_URL to an https:// URL or set COOKIE_SECURE=true if you terminate TLS at a reverse proxy."
      );
    }
  }

  return {
    password: secret,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      secure,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, getSessionOptions());
  if (!session.isLoggedIn) {
    session.isLoggedIn = defaultSession.isLoggedIn;
  }
  return session;
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}
