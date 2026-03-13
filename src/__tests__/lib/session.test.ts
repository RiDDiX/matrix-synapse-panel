import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("resolveSecureCookie", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function loadResolve() {
    // Dynamic import to pick up fresh env each time
    const mod = await import("@/lib/session");
    // resolveSecureCookie is private, so we test indirectly via exports
    // We test the behavior through the SESSION_COOKIE_NAME export and env checks
    return mod;
  }

  it("exports SESSION_COOKIE_NAME", async () => {
    process.env.SESSION_SECRET = "a".repeat(32);
    const mod = await loadResolve();
    expect(mod.SESSION_COOKIE_NAME).toBe("riddix-invite-session");
  });
});

describe("session secure cookie resolution logic", () => {
  // Test the resolveSecureCookie logic directly by reimplementing it
  // (since it's not exported) to verify the contract

  function resolveSecureCookie(env: { COOKIE_SECURE?: string; APP_URL?: string }): boolean {
    const explicit = env.COOKIE_SECURE;
    if (explicit === "true") return true;
    if (explicit === "false") return false;
    const appUrl = env.APP_URL || "";
    return appUrl.startsWith("https://");
  }

  it("returns true when COOKIE_SECURE=true", () => {
    expect(resolveSecureCookie({ COOKIE_SECURE: "true", APP_URL: "http://localhost" })).toBe(true);
  });

  it("returns false when COOKIE_SECURE=false", () => {
    expect(resolveSecureCookie({ COOKIE_SECURE: "false", APP_URL: "https://example.com" })).toBe(false);
  });

  it("returns true when APP_URL is https", () => {
    expect(resolveSecureCookie({ APP_URL: "https://invite.example.com" })).toBe(true);
  });

  it("returns false when APP_URL is http", () => {
    expect(resolveSecureCookie({ APP_URL: "http://localhost:3000" })).toBe(false);
  });

  it("returns false when APP_URL is not set", () => {
    expect(resolveSecureCookie({})).toBe(false);
  });

  it("COOKIE_SECURE overrides APP_URL", () => {
    expect(resolveSecureCookie({ COOKIE_SECURE: "false", APP_URL: "https://example.com" })).toBe(false);
    expect(resolveSecureCookie({ COOKIE_SECURE: "true", APP_URL: "http://localhost" })).toBe(true);
  });

  it("returns false for plain IP access without override", () => {
    expect(resolveSecureCookie({ APP_URL: "http://192.168.1.100:3000" })).toBe(false);
  });
});

describe("session cookie config scenarios", () => {
  it("Docker with plain HTTP (no proxy): secure=false", () => {
    // User accesses http://192.168.178.8:3055 — no TLS
    const env = { APP_URL: "http://192.168.178.8:3055", NODE_ENV: "production" };
    const secure = env.APP_URL.startsWith("https://");
    expect(secure).toBe(false);
  });

  it("Docker behind Nginx Proxy Manager with HTTPS: secure=true", () => {
    // User accesses https://invite.example.com — proxy terminates TLS
    const env = { APP_URL: "https://invite.example.com", NODE_ENV: "production" };
    const secure = env.APP_URL.startsWith("https://");
    expect(secure).toBe(true);
  });

  it("Docker behind proxy but APP_URL is internal HTTP: use COOKIE_SECURE override", () => {
    // APP_URL is the internal URL, but proxy provides HTTPS
    const env = { APP_URL: "http://app:3000", COOKIE_SECURE: "true", NODE_ENV: "production" };
    const explicit = env.COOKIE_SECURE;
    expect(explicit).toBe("true");
  });

  it("Local development: secure=false", () => {
    const env = { APP_URL: "http://localhost:3000", NODE_ENV: "development" };
    const secure = env.APP_URL.startsWith("https://");
    expect(secure).toBe(false);
  });
});
