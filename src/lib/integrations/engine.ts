import { db } from "../db";
import { randomBytes } from "crypto";
import { mkdir, writeFile, readFile, unlink, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { encryptSecret, decryptSecret } from "./crypto";
import { getCatalogEntry } from "./catalog";
import { detectCapabilities, getIntegrationsDir } from "./environment";
import type {
  CatalogEntry,
  InstallResult,
  GeneratedFile,
  IntegrationHealthResult,
  IntegrationStatus,
  CapabilityMode,
} from "./types";

function generateToken(length = 64): string {
  return randomBytes(length).toString("hex").slice(0, length);
}

async function ensureIntegrationDir(integrationId: string): Promise<string> {
  const dir = join(getIntegrationsDir(), integrationId);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function listInstalledIntegrations() {
  return db.installedIntegration.findMany({
    include: { secrets: { select: { id: true, key: true, rotatedAt: true, createdAt: true } }, configs: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInstalledIntegration(id: string) {
  return db.installedIntegration.findUnique({
    where: { id },
    include: { secrets: { select: { id: true, key: true, rotatedAt: true, createdAt: true } }, configs: true },
  });
}

export async function installIntegration(
  catalogId: string,
  actor: string
): Promise<InstallResult> {
  const entry = getCatalogEntry(catalogId);
  if (!entry) {
    return { success: false, mode: "guided", generatedFiles: [], nextSteps: [], error: "Unknown catalog entry" };
  }

  const caps = await detectCapabilities();
  const mode: CapabilityMode = entry.deploymentModes.includes(caps.mode) ? caps.mode : "guided";

  const existing = await db.installedIntegration.findFirst({
    where: { catalogId },
  });
  if (existing) {
    return { success: false, mode, generatedFiles: [], nextSteps: [], error: "Integration already installed" };
  }

  const integration = await db.installedIntegration.create({
    data: {
      catalogId,
      name: entry.name,
      type: entry.type,
      deploymentMode: mode,
      status: "installing",
      enabled: false,
      version: entry.defaultVersion ?? "latest",
      installedBy: actor,
      healthEndpoint: entry.healthcheckEndpoint ?? null,
      networkName: "portal",
    },
  });

  const generatedFiles: GeneratedFile[] = [];
  const nextSteps: string[] = [];

  const asToken = generateToken();
  const hsToken = generateToken();

  for (const secretDef of entry.requiredSecrets) {
    let value: string;
    if (secretDef.key === "as_token") value = asToken;
    else if (secretDef.key === "hs_token") value = hsToken;
    else value = secretDef.defaultValue ?? "";

    if (value) {
      const enc = encryptSecret(value);
      await db.integrationSecret.create({
        data: {
          integrationId: integration.id,
          key: secretDef.key,
          encryptedValue: enc.encrypted,
          iv: enc.iv,
          tag: enc.tag,
        },
      });
    }
  }

  for (const change of entry.requiredSynapseChanges) {
    if (change.type === "appservice_registration" && change.generatable) {
      const regYaml = generateAppserviceRegistration(entry, asToken, hsToken);
      generatedFiles.push({
        filename: `${entry.id}-registration.yaml`,
        content: regYaml,
        description: "Application Service registration file for Synapse",
        targetPath: `appservices/${entry.id}-registration.yaml`,
        type: "appservice_registration",
      });

      await db.installedIntegration.update({
        where: { id: integration.id },
        data: { appserviceId: entry.id, appserviceFile: `${entry.id}-registration.yaml` },
      });

      nextSteps.push(
        `Copy ${entry.id}-registration.yaml to your Synapse appservice directory.`,
        `Add the file path to app_service_config_files in homeserver.yaml.`,
        `Restart Synapse to load the new appservice registration.`
      );
    }
  }

  if (entry.dockerImage) {
    const composeFragment = generateDockerCompose(entry, integration.id);
    generatedFiles.push({
      filename: `docker-compose.${entry.id}.yml`,
      content: composeFragment,
      description: "Docker Compose service definition for the integration",
      type: "docker_compose",
    });

    if (mode === "guided") {
      nextSteps.push(
        `Review the generated docker-compose.${entry.id}.yml file.`,
        `Merge it into your existing docker-compose.yml or run it alongside.`,
        `Ensure the bridge container can reach Synapse on the configured network.`
      );
    }
  }

  const dir = await ensureIntegrationDir(integration.id);
  for (const file of generatedFiles) {
    await writeFile(join(dir, file.filename), file.content, "utf-8");
  }

  const newStatus: IntegrationStatus = mode === "managed" ? "installed" : "installed";
  await db.installedIntegration.update({
    where: { id: integration.id },
    data: { status: newStatus, deploymentMode: mode },
  });

  if (nextSteps.length === 0) {
    nextSteps.push("Integration installed. Configure it via the settings page.");
  }

  return { success: true, mode, generatedFiles, nextSteps };
}

export async function updateIntegrationConfig(
  integrationId: string,
  configJson: Record<string, unknown>,
  actor: string
): Promise<void> {
  const existing = await db.installedIntegration.findUnique({ where: { id: integrationId } });
  if (!existing) throw new Error("Integration not found");

  const latestConfig = await db.integrationConfig.findFirst({
    where: { integrationId },
    orderBy: { version: "desc" },
  });

  const nextVersion = (latestConfig?.version ?? 0) + 1;

  await db.integrationConfig.create({
    data: {
      integrationId,
      version: nextVersion,
      configJson: JSON.stringify(configJson),
      createdBy: actor,
    },
  });

  await db.installedIntegration.update({
    where: { id: integrationId },
    data: {
      configJson: JSON.stringify(configJson),
      status: "configured",
    },
  });
}

export async function enableIntegration(integrationId: string): Promise<void> {
  await db.installedIntegration.update({
    where: { id: integrationId },
    data: { enabled: true, status: "enabled" },
  });
}

export async function disableIntegration(integrationId: string): Promise<void> {
  await db.installedIntegration.update({
    where: { id: integrationId },
    data: { enabled: false, status: "disabled" },
  });
}

export async function uninstallIntegration(integrationId: string): Promise<void> {
  const integration = await db.installedIntegration.findUnique({ where: { id: integrationId } });
  if (!integration) throw new Error("Integration not found");

  await db.installedIntegration.update({
    where: { id: integrationId },
    data: { status: "uninstalling" },
  });

  const dir = join(getIntegrationsDir(), integrationId);
  if (existsSync(dir)) {
    const files = await readdir(dir);
    for (const f of files) {
      await unlink(join(dir, f)).catch(() => {});
    }
    await unlink(dir).catch(() => {});
  }

  await db.installedIntegration.delete({ where: { id: integrationId } });
}

export async function checkIntegrationHealth(integrationId: string): Promise<IntegrationHealthResult> {
  const integration = await db.installedIntegration.findUnique({ where: { id: integrationId } });
  if (!integration) {
    return { ok: false, status: "failed", detail: "Integration not found", checkedAt: new Date().toISOString() };
  }

  const entry = getCatalogEntry(integration.catalogId);
  if (!entry || entry.healthcheckStrategy === "none" || !integration.healthEndpoint) {
    return {
      ok: integration.enabled,
      status: integration.status as IntegrationStatus,
      detail: "No healthcheck configured",
      checkedAt: new Date().toISOString(),
    };
  }

  if (entry.healthcheckStrategy === "http") {
    const port = entry.defaultPort ?? 8080;
    const containerName = integration.containerName ?? `${entry.id}-${integration.id.slice(0, 8)}`;
    const url = `http://${containerName}:${port}${integration.healthEndpoint}`;

    const start = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
      const responseTimeMs = Date.now() - start;
      const ok = res.ok;
      const newStatus: IntegrationStatus = ok ? "running" : "degraded";

      await db.installedIntegration.update({
        where: { id: integrationId },
        data: { lastHealthAt: new Date(), lastHealthOk: ok, status: newStatus },
      });

      return { ok, status: newStatus, responseTimeMs, checkedAt: new Date().toISOString() };
    } catch (e) {
      await db.installedIntegration.update({
        where: { id: integrationId },
        data: { lastHealthAt: new Date(), lastHealthOk: false, status: "failed", statusDetail: e instanceof Error ? e.message : "Health check failed" },
      });

      return {
        ok: false,
        status: "failed",
        detail: e instanceof Error ? e.message : "Health check failed",
        checkedAt: new Date().toISOString(),
      };
    }
  }

  return {
    ok: false,
    status: integration.status as IntegrationStatus,
    detail: `Unsupported healthcheck strategy: ${entry.healthcheckStrategy}`,
    checkedAt: new Date().toISOString(),
  };
}

export async function setIntegrationSecret(
  integrationId: string,
  key: string,
  plaintext: string
): Promise<void> {
  const enc = encryptSecret(plaintext);

  await db.integrationSecret.upsert({
    where: { integrationId_key: { integrationId, key } },
    create: {
      integrationId,
      key,
      encryptedValue: enc.encrypted,
      iv: enc.iv,
      tag: enc.tag,
    },
    update: {
      encryptedValue: enc.encrypted,
      iv: enc.iv,
      tag: enc.tag,
      rotatedAt: new Date(),
    },
  });
}

export async function getIntegrationSecretDecrypted(
  integrationId: string,
  key: string
): Promise<string | null> {
  const secret = await db.integrationSecret.findUnique({
    where: { integrationId_key: { integrationId, key } },
  });
  if (!secret) return null;
  return decryptSecret(secret.encryptedValue, secret.iv, secret.tag);
}

export async function getGeneratedFiles(integrationId: string): Promise<GeneratedFile[]> {
  const dir = join(getIntegrationsDir(), integrationId);
  if (!existsSync(dir)) return [];

  const filenames = await readdir(dir);
  const files: GeneratedFile[] = [];

  for (const filename of filenames) {
    const content = await readFile(join(dir, filename), "utf-8");
    let type: GeneratedFile["type"] = "config";
    if (filename.includes("docker-compose")) type = "docker_compose";
    else if (filename.includes("registration")) type = "appservice_registration";

    files.push({ filename, content, description: "", type });
  }

  return files;
}

function generateAppserviceRegistration(
  entry: CatalogEntry,
  asToken: string,
  hsToken: string
): string {
  const port = entry.defaultPort ?? 8080;
  const id = entry.id;

  return [
    `id: ${id}`,
    `url: http://${id}:${port}`,
    `as_token: ${asToken}`,
    `hs_token: ${hsToken}`,
    `sender_localpart: ${id}bot`,
    `rate_limited: false`,
    `namespaces:`,
    `  users:`,
    `    - exclusive: true`,
    `      regex: "@${id}_.*:.*"`,
    `  aliases:`,
    `    - exclusive: true`,
    `      regex: "#${id}_.*:.*"`,
    ``,
  ].join("\n");
}

function generateDockerCompose(entry: CatalogEntry, integrationId: string): string {
  const port = entry.defaultPort ?? 8080;
  const shortId = integrationId.slice(0, 8);

  return [
    `# Docker Compose fragment for ${entry.name}`,
    `# Merge this into your existing docker-compose.yml`,
    `services:`,
    `  ${entry.id}:`,
    `    image: ${entry.dockerImage}`,
    `    container_name: ${entry.id}-${shortId}`,
    `    restart: unless-stopped`,
    `    volumes:`,
    `      - ${entry.id}_data:/data`,
    `    networks:`,
    `      - portal`,
    `    healthcheck:`,
    entry.healthcheckStrategy === "http" && entry.healthcheckEndpoint
      ? `      test: ["CMD", "curl", "-f", "http://localhost:${port}${entry.healthcheckEndpoint}"]`
      : `      test: ["CMD", "true"]`,
    `      interval: 30s`,
    `      timeout: 10s`,
    `      retries: 3`,
    ``,
    `volumes:`,
    `  ${entry.id}_data:`,
    ``,
  ].join("\n");
}
