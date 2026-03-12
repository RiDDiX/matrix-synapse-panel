import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  const email = session.email;

  if (email) {
    await logAudit({ action: "admin.logout", actor: email });
  }

  session.destroy();
  return NextResponse.json({ ok: true });
}
