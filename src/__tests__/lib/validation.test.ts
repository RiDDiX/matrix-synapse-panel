import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registrationSchema,
  brandingUpdateSchema,
  createTokenSchema,
  createServerSchema,
  updateServerSchema,
  rotateServerTokenSchema,
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
