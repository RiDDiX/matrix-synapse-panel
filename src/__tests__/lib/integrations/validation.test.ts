import { describe, it, expect } from "vitest";
import {
  installIntegrationSchema,
  integrationConfigSchema,
  integrationSecretSchema,
  createBotSchema,
  updateBotSchema,
  botRoomAssignmentSchema,
  botFeatureSchema,
} from "@/lib/validation";

describe("installIntegrationSchema", () => {
  it("accepts valid catalogId", () => {
    expect(installIntegrationSchema.safeParse({ catalogId: "mautrix-whatsapp" }).success).toBe(true);
  });

  it("rejects empty catalogId", () => {
    expect(installIntegrationSchema.safeParse({ catalogId: "" }).success).toBe(false);
  });

  it("rejects missing catalogId", () => {
    expect(installIntegrationSchema.safeParse({}).success).toBe(false);
  });
});

describe("integrationConfigSchema", () => {
  it("accepts valid config object", () => {
    expect(integrationConfigSchema.safeParse({ config: { key: "value" } }).success).toBe(true);
  });

  it("accepts nested config", () => {
    expect(integrationConfigSchema.safeParse({ config: { a: { b: 1 }, c: [1, 2] } }).success).toBe(true);
  });

  it("rejects missing config", () => {
    expect(integrationConfigSchema.safeParse({}).success).toBe(false);
  });
});

describe("integrationSecretSchema", () => {
  it("accepts valid key and value", () => {
    expect(integrationSecretSchema.safeParse({ key: "as_token", value: "abc123" }).success).toBe(true);
  });

  it("rejects empty key", () => {
    expect(integrationSecretSchema.safeParse({ key: "", value: "abc" }).success).toBe(false);
  });

  it("rejects empty value", () => {
    expect(integrationSecretSchema.safeParse({ key: "k", value: "" }).success).toBe(false);
  });
});

describe("createBotSchema", () => {
  it("accepts valid bot creation", () => {
    const result = createBotSchema.safeParse({
      templateId: "welcome",
      displayName: "My Welcome Bot",
    });
    expect(result.success).toBe(true);
  });

  it("accepts with optional localpart", () => {
    const result = createBotSchema.safeParse({
      templateId: "welcome",
      displayName: "My Bot",
      localpart: "mybot",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid localpart chars", () => {
    const result = createBotSchema.safeParse({
      templateId: "welcome",
      displayName: "My Bot",
      localpart: "My Bot!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing displayName", () => {
    expect(createBotSchema.safeParse({ templateId: "welcome" }).success).toBe(false);
  });

  it("rejects missing templateId", () => {
    expect(createBotSchema.safeParse({ displayName: "Bot" }).success).toBe(false);
  });
});

describe("updateBotSchema", () => {
  it("accepts partial updates", () => {
    expect(updateBotSchema.safeParse({ displayName: "New Name" }).success).toBe(true);
    expect(updateBotSchema.safeParse({ config: { k: "v" } }).success).toBe(true);
    expect(updateBotSchema.safeParse({}).success).toBe(true);
  });
});

describe("botRoomAssignmentSchema", () => {
  it("accepts valid room ID", () => {
    const result = botRoomAssignmentSchema.safeParse({
      roomId: "!abc123:example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects room ID not starting with !", () => {
    expect(botRoomAssignmentSchema.safeParse({ roomId: "#room:example.com" }).success).toBe(false);
  });

  it("accepts optional roomAlias", () => {
    const result = botRoomAssignmentSchema.safeParse({
      roomId: "!abc:example.com",
      roomAlias: "#general:example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("botFeatureSchema", () => {
  it("accepts valid feature toggle", () => {
    const result = botFeatureSchema.safeParse({
      featureKey: "command_handling",
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults scope to global", () => {
    const result = botFeatureSchema.safeParse({
      featureKey: "command_handling",
      enabled: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe("global");
    }
  });

  it("accepts room scope with scopeId", () => {
    const result = botFeatureSchema.safeParse({
      featureKey: "room_responses",
      enabled: true,
      scope: "room",
      scopeId: "!abc:example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing featureKey", () => {
    expect(botFeatureSchema.safeParse({ enabled: true }).success).toBe(false);
  });

  it("rejects non-boolean enabled", () => {
    expect(botFeatureSchema.safeParse({ featureKey: "k", enabled: "yes" }).success).toBe(false);
  });
});
