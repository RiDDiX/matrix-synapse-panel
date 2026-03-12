import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { detectCapabilities } from "@/lib/integrations/environment";
import { listInstalledIntegrations, checkIntegrationHealth } from "@/lib/integrations/engine";
import { listBots, getBotHealth } from "@/lib/integrations/bots";
import type { DiagnosticsSnapshot, IntegrationHealthResult } from "@/lib/integrations/types";
import { getServerConnectionById } from "@/lib/servers";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const caps = await detectCapabilities();
  const integrations = await listInstalledIntegrations(serverId);
  const bots = await listBots(serverId);

  const integrationHealth: Record<string, IntegrationHealthResult> = {};
  for (const integration of integrations) {
    if (integration.enabled) {
      integrationHealth[integration.id] = await checkIntegrationHealth(integration.id);
    }
  }

  const botHealth: Record<string, { ok: boolean; detail?: string }> = {};
  for (const bot of bots) {
    if (bot.enabled) {
      const health = await getBotHealth(bot.id);
      botHealth[bot.id] = health;
    }
  }

  const requiredEnvVars = [
    "DATABASE_URL",
    "SESSION_SECRET",
  ];
  const optionalEnvVars = ["SYNAPSE_CONFIG_DIR", "SYNAPSE_APPSERVICE_DIR"];

  const envVarsPresent: string[] = [];
  const envVarsMissing: string[] = [];

  for (const v of [...requiredEnvVars, ...optionalEnvVars]) {
    if (process.env[v]) {
      envVarsPresent.push(v);
    } else {
      envVarsMissing.push(v);
    }
  }

  let synapseConnectivity = false;
  try {
    const conn = await getServerConnectionById(serverId);
    if (conn) {
      const res = await fetch(`${conn.internalUrl}/_matrix/client/versions`, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      synapseConnectivity = res.ok;
    }
  } catch {
    // connectivity check failed
  }

  const snapshot: DiagnosticsSnapshot = {
    synapseConnectivity,
    appserviceRegistrationOk: caps.appserviceDirWritable,
    filesystemWritable: caps.dockerAvailable,
    dockerAvailable: caps.dockerAvailable,
    dockerComposeAvailable: caps.dockerComposeAvailable,
    capabilityMode: caps.mode,
    envVarsPresent,
    envVarsMissing,
    integrationHealth,
    botHealth,
    errors: caps.reasons.filter((r) => !r.startsWith("Running in")),
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json({ diagnostics: snapshot });
}
