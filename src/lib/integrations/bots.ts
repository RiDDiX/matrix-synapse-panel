import { db } from "../db";
import { encryptSecret, decryptSecret } from "./crypto";
import { getBotTemplate, BOT_FEATURES } from "./catalog/bot-templates";
import type { BotDefinition, BotRoomAssignment, BotFeatureFlag } from "@prisma/client";

export type BotWithRelations = BotDefinition & {
  rooms: BotRoomAssignment[];
  features: BotFeatureFlag[];
};

export type SafeBot = Omit<BotWithRelations, "accessTokenEnc" | "accessTokenIv" | "accessTokenTag">;

export function sanitizeBot(bot: BotWithRelations): SafeBot {
  const { accessTokenEnc: _e, accessTokenIv: _i, accessTokenTag: _t, ...safe } = bot;
  void _e; void _i; void _t;
  return safe;
}

export async function listBots(serverId: string): Promise<SafeBot[]> {
  const bots = await db.botDefinition.findMany({
    where: { serverId },
    include: { rooms: true, features: true },
    orderBy: { createdAt: "desc" },
  });
  return bots.map(sanitizeBot);
}

export async function getBotById(id: string): Promise<BotWithRelations | null> {
  return db.botDefinition.findUnique({
    where: { id },
    include: { rooms: true, features: true },
  });
}

export async function createBot(params: {
  templateId: string;
  displayName: string;
  serverId: string;
  localpart?: string;
  avatarUrl?: string;
  configJson?: Record<string, unknown>;
  actor: string;
}): Promise<SafeBot> {
  const template = getBotTemplate(params.templateId);
  if (!template) throw new Error(`Unknown bot template: ${params.templateId}`);

  const bot = await db.botDefinition.create({
    data: {
      serverId: params.serverId,
      templateId: params.templateId,
      displayName: params.displayName,
      localpart: params.localpart || null,
      avatarUrl: params.avatarUrl || null,
      configJson: params.configJson ? JSON.stringify(params.configJson) : null,
      status: "created",
      enabled: false,
      createdBy: params.actor,
    },
    include: { rooms: true, features: true },
  });

  for (const featureKey of template.defaultFeatures) {
    await db.botFeatureFlag.create({
      data: {
        botId: bot.id,
        featureKey,
        enabled: true,
        scope: "global",
      },
    });
  }

  const fullBot = await db.botDefinition.findUniqueOrThrow({
    where: { id: bot.id },
    include: { rooms: true, features: true },
  });

  return sanitizeBot(fullBot);
}

export async function updateBot(
  id: string,
  data: {
    displayName?: string;
    avatarUrl?: string | null;
    configJson?: Record<string, unknown>;
  }
): Promise<SafeBot> {
  const updateData: Record<string, unknown> = {};
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.configJson !== undefined) updateData.configJson = JSON.stringify(data.configJson);

  const bot = await db.botDefinition.update({
    where: { id },
    data: updateData,
    include: { rooms: true, features: true },
  });

  return sanitizeBot(bot);
}

export async function deleteBot(id: string): Promise<void> {
  await db.botDefinition.delete({ where: { id } });
}

export async function activateBot(id: string): Promise<SafeBot> {
  const bot = await db.botDefinition.update({
    where: { id },
    data: { enabled: true, status: "running" },
    include: { rooms: true, features: true },
  });
  return sanitizeBot(bot);
}

export async function deactivateBot(id: string): Promise<SafeBot> {
  const bot = await db.botDefinition.update({
    where: { id },
    data: { enabled: false, status: "created" },
    include: { rooms: true, features: true },
  });
  return sanitizeBot(bot);
}

export async function setBotAccessToken(id: string, plaintext: string): Promise<void> {
  const enc = encryptSecret(plaintext);
  await db.botDefinition.update({
    where: { id },
    data: {
      accessTokenEnc: enc.encrypted,
      accessTokenIv: enc.iv,
      accessTokenTag: enc.tag,
    },
  });
}

export async function getBotAccessToken(id: string): Promise<string | null> {
  const bot = await db.botDefinition.findUnique({ where: { id } });
  if (!bot?.accessTokenEnc || !bot.accessTokenIv || !bot.accessTokenTag) return null;
  return decryptSecret(bot.accessTokenEnc, bot.accessTokenIv, bot.accessTokenTag);
}

export async function assignBotToRoom(
  botId: string,
  roomId: string,
  roomAlias?: string,
  configJson?: Record<string, unknown>
): Promise<BotRoomAssignment> {
  return db.botRoomAssignment.upsert({
    where: { botId_roomId: { botId, roomId } },
    create: {
      botId,
      roomId,
      roomAlias: roomAlias || null,
      configJson: configJson ? JSON.stringify(configJson) : null,
      active: true,
    },
    update: {
      roomAlias: roomAlias || null,
      configJson: configJson ? JSON.stringify(configJson) : null,
      active: true,
    },
  });
}

export async function unassignBotFromRoom(botId: string, roomId: string): Promise<void> {
  await db.botRoomAssignment.deleteMany({
    where: { botId, roomId },
  });
}

export async function setBotFeature(
  botId: string,
  featureKey: string,
  enabled: boolean,
  scope: string = "global",
  scopeId?: string,
  configJson?: Record<string, unknown>
): Promise<BotFeatureFlag> {
  const validFeature = BOT_FEATURES.find((f) => f.key === featureKey);
  if (!validFeature) throw new Error(`Unknown feature: ${featureKey}`);

  const existing = await db.botFeatureFlag.findFirst({
    where: { botId, featureKey, scope, scopeId: scopeId ?? null },
  });

  if (existing) {
    return db.botFeatureFlag.update({
      where: { id: existing.id },
      data: {
        enabled,
        configJson: configJson ? JSON.stringify(configJson) : null,
      },
    });
  }

  return db.botFeatureFlag.create({
    data: {
      botId,
      featureKey,
      enabled,
      scope,
      scopeId: scopeId ?? null,
      configJson: configJson ? JSON.stringify(configJson) : null,
    },
  });
}

export async function getBotHealth(id: string): Promise<{ ok: boolean; detail?: string }> {
  const bot = await db.botDefinition.findUnique({ where: { id } });
  if (!bot) return { ok: false, detail: "Bot not found" };
  if (!bot.enabled) return { ok: false, detail: "Bot is not activated" };

  return {
    ok: bot.status === "running",
    detail: bot.statusDetail ?? (bot.status === "running" ? "Bot is running" : `Status: ${bot.status}`),
  };
}
