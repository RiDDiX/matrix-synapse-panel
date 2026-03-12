import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, redactSecret } from "@/lib/integrations/crypto";

beforeAll(() => {
  process.env.SESSION_SECRET = "a]3Fj!kL9#mNpQ2rStUvWxYz0123456789abcdef";
});

describe("encryptSecret / decryptSecret", () => {
  it("encrypts and decrypts a value correctly", () => {
    const plaintext = "syt_mytoken_abc123";
    const { encrypted, iv, tag } = encryptSecret(plaintext);

    expect(encrypted).toBeTruthy();
    expect(iv).toBeTruthy();
    expect(tag).toBeTruthy();
    expect(encrypted).not.toBe(plaintext);

    const decrypted = decryptSecret(encrypted, iv, tag);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "same-secret-value";
    const a = encryptSecret(plaintext);
    const b = encryptSecret(plaintext);

    expect(a.encrypted).not.toBe(b.encrypted);
    expect(a.iv).not.toBe(b.iv);

    expect(decryptSecret(a.encrypted, a.iv, a.tag)).toBe(plaintext);
    expect(decryptSecret(b.encrypted, b.iv, b.tag)).toBe(plaintext);
  });

  it("fails to decrypt with wrong IV", () => {
    const { encrypted, tag } = encryptSecret("test-value");
    const wrongIv = Buffer.from("0000000000000000").toString("base64");

    expect(() => decryptSecret(encrypted, wrongIv, tag)).toThrow();
  });

  it("fails to decrypt with wrong tag", () => {
    const { encrypted, iv } = encryptSecret("test-value");
    const wrongTag = Buffer.from("0000000000000000").toString("base64");

    expect(() => decryptSecret(encrypted, iv, wrongTag)).toThrow();
  });

  it("handles empty string", () => {
    const { encrypted, iv, tag } = encryptSecret("");
    const decrypted = decryptSecret(encrypted, iv, tag);
    expect(decrypted).toBe("");
  });

  it("handles long strings", () => {
    const long = "x".repeat(10000);
    const { encrypted, iv, tag } = encryptSecret(long);
    expect(decryptSecret(encrypted, iv, tag)).toBe(long);
  });

  it("handles unicode", () => {
    const unicode = "🔐 Secret Wërt with ñ and 中文";
    const { encrypted, iv, tag } = encryptSecret(unicode);
    expect(decryptSecret(encrypted, iv, tag)).toBe(unicode);
  });
});

describe("redactSecret", () => {
  it("fully redacts short values", () => {
    expect(redactSecret("abc")).toBe("****");
    expect(redactSecret("12345678")).toBe("****");
  });

  it("shows first and last 4 chars for longer values", () => {
    expect(redactSecret("syt_abcdefghijk")).toBe("syt_****hijk");
  });

  it("handles exactly 9 characters", () => {
    expect(redactSecret("123456789")).toBe("1234****6789");
  });
});
