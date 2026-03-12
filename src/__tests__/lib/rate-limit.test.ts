import { describe, it, expect } from "vitest";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const config = { windowMs: 60_000, maxRequests: 3 };

    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding the limit", () => {
    const key = `test-block-${Date.now()}`;
    const config = { windowMs: 60_000, maxRequests: 2 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const r3 = checkRateLimit(key, config);

    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("uses separate counters per key", () => {
    const config = { windowMs: 60_000, maxRequests: 1 };

    const r1 = checkRateLimit(`key-a-${Date.now()}`, config);
    const r2 = checkRateLimit(`key-b-${Date.now()}`, config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("returns a future resetAt timestamp", () => {
    const key = `test-reset-${Date.now()}`;
    const config = { windowMs: 30_000, maxRequests: 5 };

    const result = checkRateLimit(key, config);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("getRateLimitHeaders", () => {
  it("includes Retry-After when blocked", () => {
    const headers = getRateLimitHeaders({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 10_000,
    });

    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(headers["Retry-After"]).toBeDefined();
    expect(Number(headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("omits Retry-After when allowed", () => {
    const headers = getRateLimitHeaders({
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 60_000,
    });

    expect(headers["X-RateLimit-Remaining"]).toBe("5");
    expect(headers["Retry-After"]).toBeUndefined();
  });
});
