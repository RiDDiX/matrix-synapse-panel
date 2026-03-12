import { NextResponse } from "next/server";
import { getSession } from "./session";

export async function requireAdmin(): Promise<{ authorized: true; email: string } | NextResponse> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { authorized: true, email: session.email };
}
