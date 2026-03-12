import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { runDiagnostics } from "@/lib/synapse";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const result = await runDiagnostics();
  return NextResponse.json(result);
}
