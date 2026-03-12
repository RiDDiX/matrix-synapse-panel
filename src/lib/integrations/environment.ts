import { existsSync } from "fs";
import { access, constants } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";
import type { EnvironmentCapabilities, CapabilityMode } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const INTEGRATIONS_DIR = join(DATA_DIR, "integrations");

export function getDataDir(): string {
  return DATA_DIR;
}

export function getIntegrationsDir(): string {
  return INTEGRATIONS_DIR;
}

async function checkWritable(dir: string): Promise<boolean> {
  try {
    await access(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function checkCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function checkSynapseConfigWritable(): Promise<boolean> {
  const configDir = process.env.SYNAPSE_CONFIG_DIR;
  if (!configDir) return false;
  return checkWritable(configDir);
}

async function checkAppserviceDirWritable(): Promise<boolean> {
  const asDir = process.env.SYNAPSE_APPSERVICE_DIR;
  if (!asDir) return false;
  return checkWritable(asDir);
}

async function checkNetworkReachable(): Promise<boolean> {
  const synapseUrl = process.env.SYNAPSE_INTERNAL_URL;
  if (!synapseUrl) return false;
  try {
    const res = await fetch(`${synapseUrl}/_matrix/client/versions`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function detectCapabilities(): Promise<EnvironmentCapabilities> {
  const reasons: string[] = [];

  const dockerAvailable = checkCommand("docker");
  const dockerComposeAvailable = checkCommand("docker") && (() => {
    try {
      execSync("docker compose version", { stdio: "ignore", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  })();

  const synapseConfigWritable = await checkSynapseConfigWritable();
  const appserviceDirWritable = await checkAppserviceDirWritable();
  const networkReachable = await checkNetworkReachable();
  const dataDirWritable = existsSync(DATA_DIR) && await checkWritable(DATA_DIR);

  if (!dockerAvailable) reasons.push("Docker CLI not found in PATH");
  if (!dockerComposeAvailable) reasons.push("Docker Compose not available");
  if (!synapseConfigWritable) reasons.push("Synapse config directory not writable or SYNAPSE_CONFIG_DIR not set");
  if (!appserviceDirWritable) reasons.push("Appservice directory not writable or SYNAPSE_APPSERVICE_DIR not set");
  if (!networkReachable) reasons.push("Cannot reach Synapse at SYNAPSE_INTERNAL_URL");
  if (!dataDirWritable) reasons.push("Data directory not writable");

  const canManage = dockerAvailable && dockerComposeAvailable && dataDirWritable;
  const mode: CapabilityMode = canManage ? "managed" : "guided";

  if (!canManage) {
    reasons.push("Running in guided mode: generate files and instructions for manual application");
  }

  return {
    mode,
    dockerAvailable,
    dockerComposeAvailable,
    synapseConfigWritable,
    appserviceDirWritable,
    networkReachable,
    dataDir: DATA_DIR,
    reasons,
  };
}
