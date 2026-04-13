import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { listServers, getServerById } from "@/lib/servers";

const HEALTH_TIMEOUT_MS = 4000;

async function pingServer(internalUrl: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const url = internalUrl.replace(/\/+$/, "") + "/_matrix/client/versions";
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    return { ok: res.ok, latencyMs: Date.now() - started };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - started, error: e instanceof Error ? e.message : "unreachable" };
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const servers = await listServers();
  const results = await Promise.all(
    servers.map(async (s) => {
      if (!s.enabled) return { id: s.id, ok: false, latencyMs: 0, skipped: true };
      const full = await getServerById(s.id);
      if (!full) return { id: s.id, ok: false, latencyMs: 0, error: "not found" };
      const ping = await pingServer(full.internalUrl);
      return { id: s.id, ...ping };
    })
  );

  return NextResponse.json({ health: results, checkedAt: new Date().toISOString() });
}
