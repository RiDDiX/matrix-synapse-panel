import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registrationSchema,
  brandingUpdateSchema,
  createTokenSchema,
  createServerSchema,
  updateServerSchema,
  rotateServerTokenSchema,
  createUserSchema,
  modifyUserSchema,
  adminMatrixLoginSchema,
  createRoomSchema,
  sendMessageSchema,
  roomMemberActionSchema,
  roomAliasSchema,
  serverPrepSchema,
} from "@/lib/validation";

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({ email: "admin@example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "notanemail", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registrationSchema", () => {
  const valid = {
    username: "alice",
    password: "securepass",
    confirmPassword: "securepass",
    token: "abc123",
  };

  it("accepts valid registration", () => {
    expect(registrationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects password mismatch", () => {
    const result = registrationSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(result.success).toBe(false);
  });

  it("rejects uppercase username", () => {
    const result = registrationSchema.safeParse({ ...valid, username: "Alice" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registrationSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects empty token", () => {
    const result = registrationSchema.safeParse({ ...valid, token: "" });
    expect(result.success).toBe(false);
  });
});

describe("createTokenSchema", () => {
  it("accepts empty input for defaults", () => {
    expect(createTokenSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid token characters", () => {
    const result = createTokenSchema.safeParse({ token: "bad token!" });
    expect(result.success).toBe(false);
  });

  it("accepts valid custom token", () => {
    const result = createTokenSchema.safeParse({ token: "my-token_v2.0~test" });
    expect(result.success).toBe(true);
  });
});

describe("brandingUpdateSchema", () => {
  it("accepts valid hex colors", () => {
    const result = brandingUpdateSchema.safeParse({ primaryColor: "#ff6600" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex colors", () => {
    const result = brandingUpdateSchema.safeParse({ primaryColor: "red" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid layout preset", () => {
    const result = brandingUpdateSchema.safeParse({ layoutPreset: "unknown" });
    expect(result.success).toBe(false);
  });

  it("accepts valid layout preset", () => {
    const result = brandingUpdateSchema.safeParse({ layoutPreset: "split" });
    expect(result.success).toBe(true);
  });

  it("accepts null values for optional fields", () => {
    const result = brandingUpdateSchema.safeParse({
      appTitle: null,
      primaryColor: null,
      borderRadius: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects URLs that are not valid", () => {
    const result = brandingUpdateSchema.safeParse({ privacyPolicyUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts valid URLs", () => {
    const result = brandingUpdateSchema.safeParse({
      privacyPolicyUrl: "https://example.com/privacy",
    });
    expect(result.success).toBe(true);
  });

  it("transforms empty string URLs to null", () => {
    const result = brandingUpdateSchema.safeParse({ privacyPolicyUrl: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.privacyPolicyUrl).toBeNull();
    }
  });

  it("rejects oversized text fields", () => {
    const result = brandingUpdateSchema.safeParse({ appTitle: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe("createServerSchema", () => {
  const valid = {
    name: "My Homeserver",
    slug: "my-homeserver",
    serverName: "example.com",
    internalUrl: "http://synapse:8008",
    publicUrl: "https://matrix.example.com",
    adminToken: "syt_admin_token_here",
  };

  it("accepts valid server creation", () => {
    expect(createServerSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts with optional fields", () => {
    const result = createServerSchema.safeParse({
      ...valid,
      notes: "Production server",
      publicDomain: "matrix.example.com",
      routePrefix: "/matrix",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const { name: _, ...rest } = valid;
    expect(createServerSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing slug", () => {
    const { slug: _, ...rest } = valid;
    expect(createServerSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid slug characters", () => {
    expect(createServerSchema.safeParse({ ...valid, slug: "My Server!" }).success).toBe(false);
  });

  it("rejects uppercase slug", () => {
    expect(createServerSchema.safeParse({ ...valid, slug: "MyServer" }).success).toBe(false);
  });

  it("accepts hyphenated slug", () => {
    expect(createServerSchema.safeParse({ ...valid, slug: "my-cool-server-1" }).success).toBe(true);
  });

  it("rejects invalid internalUrl", () => {
    expect(createServerSchema.safeParse({ ...valid, internalUrl: "not-a-url" }).success).toBe(false);
  });

  it("rejects invalid publicUrl", () => {
    expect(createServerSchema.safeParse({ ...valid, publicUrl: "not-a-url" }).success).toBe(false);
  });

  it("rejects empty adminToken", () => {
    expect(createServerSchema.safeParse({ ...valid, adminToken: "" }).success).toBe(false);
  });

  it("rejects missing serverName", () => {
    const { serverName: _, ...rest } = valid;
    expect(createServerSchema.safeParse(rest).success).toBe(false);
  });
});

describe("updateServerSchema", () => {
  it("accepts empty update (no fields)", () => {
    expect(updateServerSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial name update", () => {
    expect(updateServerSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });

  it("accepts partial slug update", () => {
    expect(updateServerSchema.safeParse({ slug: "new-slug" }).success).toBe(true);
  });

  it("rejects invalid slug in update", () => {
    expect(updateServerSchema.safeParse({ slug: "INVALID!" }).success).toBe(false);
  });

  it("accepts nullable optional fields", () => {
    const result = updateServerSchema.safeParse({
      notes: null,
      publicDomain: null,
      routePrefix: null,
      brandingProfileId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL in update", () => {
    expect(updateServerSchema.safeParse({ internalUrl: "bad" }).success).toBe(false);
  });
});

describe("rotateServerTokenSchema", () => {
  it("accepts valid token", () => {
    expect(rotateServerTokenSchema.safeParse({ adminToken: "syt_new_token" }).success).toBe(true);
  });

  it("rejects empty token", () => {
    expect(rotateServerTokenSchema.safeParse({ adminToken: "" }).success).toBe(false);
  });

  it("rejects missing token", () => {
    expect(rotateServerTokenSchema.safeParse({}).success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("accepts valid input", () => {
    const result = createUserSchema.safeParse({ localpart: "alice", password: "securepass123" });
    expect(result.success).toBe(true);
  });

  it("accepts with displayname and admin flag", () => {
    const result = createUserSchema.safeParse({
      localpart: "bob",
      password: "securepass123",
      displayname: "Bob Smith",
      admin: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty localpart", () => {
    expect(createUserSchema.safeParse({ localpart: "", password: "securepass123" }).success).toBe(false);
  });

  it("rejects uppercase localpart", () => {
    expect(createUserSchema.safeParse({ localpart: "Alice", password: "securepass123" }).success).toBe(false);
  });

  it("rejects short password", () => {
    expect(createUserSchema.safeParse({ localpart: "alice", password: "short" }).success).toBe(false);
  });

  it("rejects missing password", () => {
    expect(createUserSchema.safeParse({ localpart: "alice" }).success).toBe(false);
  });

  it("allows dots, underscores, hyphens, equals, slashes in localpart", () => {
    expect(createUserSchema.safeParse({ localpart: "my.user_name-2/x=y", password: "securepass123" }).success).toBe(true);
  });

  it("rejects special chars in localpart", () => {
    expect(createUserSchema.safeParse({ localpart: "alice@home", password: "securepass123" }).success).toBe(false);
  });
});

describe("modifyUserSchema", () => {
  it("accepts empty object (no changes)", () => {
    expect(modifyUserSchema.safeParse({}).success).toBe(true);
  });

  it("accepts password change", () => {
    expect(modifyUserSchema.safeParse({ password: "newpassword123" }).success).toBe(true);
  });

  it("accepts displayname change", () => {
    expect(modifyUserSchema.safeParse({ displayname: "New Name" }).success).toBe(true);
  });

  it("accepts admin flag change", () => {
    expect(modifyUserSchema.safeParse({ admin: true }).success).toBe(true);
  });

  it("accepts locked flag change", () => {
    expect(modifyUserSchema.safeParse({ locked: true }).success).toBe(true);
  });

  it("rejects short password", () => {
    expect(modifyUserSchema.safeParse({ password: "short" }).success).toBe(false);
  });
});

describe("adminMatrixLoginSchema", () => {
  it("accepts valid Matrix user ID and password", () => {
    const result = adminMatrixLoginSchema.safeParse({ userId: "@admin:example.com", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects userId without @ prefix", () => {
    expect(adminMatrixLoginSchema.safeParse({ userId: "admin:example.com", password: "secret" }).success).toBe(false);
  });

  it("rejects userId without colon separator", () => {
    expect(adminMatrixLoginSchema.safeParse({ userId: "@admin", password: "secret" }).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(adminMatrixLoginSchema.safeParse({ userId: "@admin:example.com", password: "" }).success).toBe(false);
  });

  it("rejects missing userId", () => {
    expect(adminMatrixLoginSchema.safeParse({ password: "secret" }).success).toBe(false);
  });
});

describe("createRoomSchema", () => {
  it("accepts minimal room creation (no fields required)", () => {
    const result = createRoomSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts full room creation", () => {
    const result = createRoomSchema.safeParse({
      name: "General",
      topic: "General discussion",
      room_alias_name: "general",
      visibility: "public",
      preset: "public_chat",
      invite: ["@user:example.com"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid visibility", () => {
    expect(createRoomSchema.safeParse({ visibility: "hidden" }).success).toBe(false);
  });

  it("rejects invalid preset", () => {
    expect(createRoomSchema.safeParse({ preset: "secret_chat" }).success).toBe(false);
  });

  it("rejects invalid invite user IDs", () => {
    expect(createRoomSchema.safeParse({ invite: ["notamatrixid"] }).success).toBe(false);
  });

  it("accepts valid invite user IDs", () => {
    expect(createRoomSchema.safeParse({ invite: ["@alice:example.com", "@bob:other.org"] }).success).toBe(true);
  });
});

describe("sendMessageSchema", () => {
  it("accepts text message", () => {
    const result = sendMessageSchema.safeParse({ body: "Hello world" });
    expect(result.success).toBe(true);
  });

  it("accepts message with custom msgtype", () => {
    const result = sendMessageSchema.safeParse({ msgtype: "m.notice", body: "Notice" });
    expect(result.success).toBe(true);
  });

  it("accepts HTML formatted message", () => {
    const result = sendMessageSchema.safeParse({
      body: "Hello",
      format: "org.matrix.custom.html",
      formatted_body: "<b>Hello</b>",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    expect(sendMessageSchema.safeParse({ body: "" }).success).toBe(false);
  });
});

describe("roomMemberActionSchema", () => {
  it("accepts valid user_id", () => {
    const result = roomMemberActionSchema.safeParse({ user_id: "@user:example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts user_id with reason", () => {
    const result = roomMemberActionSchema.safeParse({ user_id: "@user:example.com", reason: "Spam" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid user_id", () => {
    expect(roomMemberActionSchema.safeParse({ user_id: "user" }).success).toBe(false);
  });

  it("rejects missing user_id", () => {
    expect(roomMemberActionSchema.safeParse({}).success).toBe(false);
  });
});

describe("roomAliasSchema", () => {
  it("accepts valid room alias", () => {
    const result = roomAliasSchema.safeParse({ alias: "#general:example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects alias without # prefix", () => {
    expect(roomAliasSchema.safeParse({ alias: "general:example.com" }).success).toBe(false);
  });

  it("rejects alias without colon separator", () => {
    expect(roomAliasSchema.safeParse({ alias: "#general" }).success).toBe(false);
  });

  it("accepts alias with room_id", () => {
    const result = roomAliasSchema.safeParse({ alias: "#general:example.com", room_id: "!abc:example.com" });
    expect(result.success).toBe(true);
  });
});

describe("serverPrepSchema", () => {
  it("accepts valid minimal config", () => {
    const result = serverPrepSchema.safeParse({
      serverName: "example.com",
      publicBaseUrl: "https://matrix.example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing serverName", () => {
    expect(serverPrepSchema.safeParse({ publicBaseUrl: "https://matrix.example.com" }).success).toBe(false);
  });

  it("rejects invalid publicBaseUrl", () => {
    expect(serverPrepSchema.safeParse({ serverName: "example.com", publicBaseUrl: "notaurl" }).success).toBe(false);
  });

  it("applies defaults for optional fields", () => {
    const result = serverPrepSchema.safeParse({
      serverName: "example.com",
      publicBaseUrl: "https://matrix.example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bindPort).toBe(8008);
      expect(result.data.database).toBe("postgresql");
      expect(result.data.logLevel).toBe("INFO");
      expect(result.data.containerName).toBe("synapse");
    }
  });

  it("rejects invalid database type", () => {
    expect(serverPrepSchema.safeParse({
      serverName: "example.com",
      publicBaseUrl: "https://matrix.example.com",
      database: "mysql",
    }).success).toBe(false);
  });

  it("rejects invalid log level", () => {
    expect(serverPrepSchema.safeParse({
      serverName: "example.com",
      publicBaseUrl: "https://matrix.example.com",
      logLevel: "TRACE",
    }).success).toBe(false);
  });

  it("accepts full config with all options", () => {
    const result = serverPrepSchema.safeParse({
      serverName: "my.server.com",
      publicBaseUrl: "https://matrix.my.server.com",
      bindPort: 8448,
      database: "postgresql",
      postgresHost: "db",
      postgresPort: 5432,
      postgresDb: "synapse",
      postgresUser: "synapse",
      postgresPassword: "strong",
      enableRegistration: true,
      registrationRequiresToken: true,
      enableTurn: true,
      turnUris: ["turn:turn.example.com:3478"],
      turnSharedSecret: "secret",
      enableSmtp: true,
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpUser: "user",
      smtpPassword: "pass",
      smtpFrom: "Matrix <noreply@example.com>",
      smtpRequireTls: true,
      logLevel: "WARNING",
    });
    expect(result.success).toBe(true);
  });
});
