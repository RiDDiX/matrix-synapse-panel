import { describe, it, expect } from "vitest";
import { getTokenStatus } from "@/lib/types";
import type { SynapseRegistrationToken } from "@/lib/types";

function makeToken(overrides: Partial<SynapseRegistrationToken> = {}): SynapseRegistrationToken {
  return {
    token: "test",
    uses_allowed: null,
    pending: 0,
    completed: 0,
    expiry_time: null,
    ...overrides,
  };
}

describe("getTokenStatus", () => {
  it("returns 'valid' for unrestricted token", () => {
    expect(getTokenStatus(makeToken())).toBe("valid");
  });

  it("returns 'disabled' when uses_allowed is 0", () => {
    expect(getTokenStatus(makeToken({ uses_allowed: 0 }))).toBe("disabled");
  });

  it("returns 'expired' when expiry_time is in the past", () => {
    expect(getTokenStatus(makeToken({ expiry_time: Date.now() - 1000 }))).toBe("expired");
  });

  it("returns 'valid' when expiry_time is in the future", () => {
    expect(getTokenStatus(makeToken({ expiry_time: Date.now() + 60_000 }))).toBe("valid");
  });

  it("returns 'exhausted' when completed equals uses_allowed", () => {
    expect(getTokenStatus(makeToken({ uses_allowed: 5, completed: 5 }))).toBe("exhausted");
  });

  it("returns 'exhausted' when completed exceeds uses_allowed", () => {
    expect(getTokenStatus(makeToken({ uses_allowed: 3, completed: 4 }))).toBe("exhausted");
  });

  it("returns 'valid' when completed is less than uses_allowed", () => {
    expect(getTokenStatus(makeToken({ uses_allowed: 10, completed: 3 }))).toBe("valid");
  });

  it("prioritizes disabled over expired", () => {
    expect(getTokenStatus(makeToken({ uses_allowed: 0, expiry_time: Date.now() - 1000 }))).toBe("disabled");
  });
});
