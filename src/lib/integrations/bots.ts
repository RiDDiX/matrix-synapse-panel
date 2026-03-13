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

export interface BotHealthResult {
  ok: boolean;
  displayName: string;
  localpart: string | null;
  matrixUserId: string | null;
  enabled: boolean;
  status: string;
  hasToken: boolean;
  tokenValid: boolean | null;
  tokenUserId: string | null;
  rooms: { roomId: string; roomAlias: string | null; assigned: boolean; joined: boolean }[];
  errors: string[];
  detail?: string;
}

export async function getBotHealth(id: string, conn?: { internalUrl: string; adminToken: string; serverName: string }): Promise<BotHealthResult> {
  const bot = await db.botDefinition.findUnique({
    where: { id },
    include: { rooms: true },
  });

  if (!bot) {
    return {
      ok: false, displayName: "Unknown", localpart: null, matrixUserId: null,
      enabled: false, status: "not_found", hasToken: false, tokenValid: null,
      tokenUserId: null, rooms: [], errors: ["Bot not found"], detail: "Bot not found",
    };
  }

  const hasToken = !!(bot.accessTokenEnc && bot.accessTokenIv && bot.accessTokenTag);
  const matrixUserId = bot.localpart && conn?.serverName ? `@${bot.localpart}:${conn.serverName}` : (bot.matrixUserId ?? null);
  const errors: string[] = [];

  let tokenValid: boolean | null = null;
  let tokenUserId: string | null = null;

  if (!bot.enabled) {
    errors.push("Bot is not activated");
  }

  if (!hasToken) {
    errors.push("No access token configured");
  } else if (conn) {
    try {
      const { whoami } = await import("@/lib/synapse");
      const plainToken = decryptSecret(bot.accessTokenEnc!, bot.accessTokenIv!, bot.accessTokenTag!);
      const identity = await whoami(plainToken, conn.internalUrl);
      if (identity) {
        tokenValid = true;
        tokenUserId = identity.user_id;
        if (matrixUserId && identity.user_id !== matrixUserId) {
          errors.push(`Token user mismatch: token belongs to ${identity.user_id} but bot expects ${matrixUserId}`);
        }
      } else {
        tokenValid = false;
        errors.push("Access token is invalid or expired (whoami failed)");
      }
    } catch (e) {
      errors.push(`Token validation failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  const roomResults: BotHealthResult["rooms"] = [];
  if (conn && matrixUserId) {
    for (const room of bot.rooms) {
      let joined = false;
      try {
        const { isUserInRoom } = await import("@/lib/synapse");
        joined = await isUserInRoom(room.roomId, matrixUserId, conn);
      } catch {
        // membership check failed — treat as not joined
      }
      roomResults.push({
        roomId: room.roomId,
        roomAlias: room.roomAlias,
        assigned: room.active,
        joined,
      });
      if (room.active && !joined) {
        errors.push(`Bot is not joined to room ${room.roomAlias || room.roomId}`);
      }
    }
  } else {
    for (const room of bot.rooms) {
      roomResults.push({
        roomId: room.roomId,
        roomAlias: room.roomAlias,
        assigned: room.active,
        joined: false,
      });
    }
  }

  const allRoomsJoined = roomResults.length > 0 && roomResults.every((r) => !r.assigned || r.joined);
  const isOk = bot.enabled && hasToken && (tokenValid ?? false) && allRoomsJoined;

  return {
    ok: isOk,
    displayName: bot.displayName,
    localpart: bot.localpart,
    matrixUserId,
    enabled: bot.enabled,
    status: bot.status,
    hasToken,
    tokenValid,
    tokenUserId,
    rooms: roomResults,
    errors,
    detail: errors.length > 0 ? errors[0] : (isOk ? "Healthy" : "Unknown issue"),
  };
}
