import { describe, it, expect } from "vitest";
import { BOT_TEMPLATES, BOT_FEATURES, getBotTemplate } from "@/lib/integrations/catalog/bot-templates";

describe("Bot Templates", () => {
  it("has at least 5 templates", () => {
    expect(BOT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("each template has required fields", () => {
    for (const tpl of BOT_TEMPLATES) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(tpl.icon).toBeTruthy();
      expect(Array.isArray(tpl.defaultFeatures)).toBe(true);
      expect(Array.isArray(tpl.configFields)).toBe(true);
      expect(Array.isArray(tpl.capabilities)).toBe(true);
      expect(typeof tpl.threadAware).toBe("boolean");
    }
  });

  it("all template IDs are unique", () => {
    const ids = BOT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all default features reference valid feature keys", () => {
    const validKeys = BOT_FEATURES.map((f) => f.key);
    for (const tpl of BOT_TEMPLATES) {
      for (const feat of tpl.defaultFeatures) {
        expect(validKeys).toContain(feat);
      }
    }
  });

  it("getBotTemplate returns correct template", () => {
    const welcome = getBotTemplate("welcome");
    expect(welcome).toBeDefined();
    expect(welcome!.name).toBe("Welcome Bot");
  });

  it("getBotTemplate returns undefined for unknown id", () => {
    expect(getBotTemplate("nonexistent")).toBeUndefined();
  });
});

describe("Bot Features", () => {
  it("has at least 8 features", () => {
    expect(BOT_FEATURES.length).toBeGreaterThanOrEqual(8);
  });

  it("each feature has key, label, description", () => {
    for (const feat of BOT_FEATURES) {
      expect(feat.key).toBeTruthy();
      expect(feat.label).toBeTruthy();
      expect(feat.description).toBeTruthy();
    }
  });

  it("all feature keys are unique", () => {
    const keys = BOT_FEATURES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes essential features", () => {
    const keys = BOT_FEATURES.map((f) => f.key);
    expect(keys).toContain("command_handling");
    expect(keys).toContain("webhook_notifications");
    expect(keys).toContain("moderation_actions");
    expect(keys).toContain("thread_replies");
  });
});

describe("Specific templates", () => {
  it("welcome bot has welcome_message config field", () => {
    const tpl = getBotTemplate("welcome")!;
    const keys = tpl.configFields.map((f) => f.key);
    expect(keys).toContain("welcome_message");
  });

  it("moderation bot has banned_words and action_on_violation", () => {
    const tpl = getBotTemplate("moderation")!;
    const keys = tpl.configFields.map((f) => f.key);
    expect(keys).toContain("banned_words");
    expect(keys).toContain("action_on_violation");
  });

  it("webhook relay has webhook_path and allowed_sources", () => {
    const tpl = getBotTemplate("webhook_relay")!;
    const keys = tpl.configFields.map((f) => f.key);
    expect(keys).toContain("webhook_path");
    expect(keys).toContain("allowed_sources");
  });

  it("custom bot is thread-aware", () => {
    const tpl = getBotTemplate("custom")!;
    expect(tpl.threadAware).toBe(true);
  });

  it("keyword responder is thread-aware", () => {
    const tpl = getBotTemplate("keyword_responder")!;
    expect(tpl.threadAware).toBe(true);
    expect(tpl.threadAwareNote).toBeTruthy();
  });
});
