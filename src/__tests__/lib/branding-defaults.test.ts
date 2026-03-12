import { describe, it, expect } from "vitest";
import {
  BRANDING_DEFAULTS,
  ALLOWED_ASSET_TYPES,
  MAX_ASSET_SIZE,
  MAX_FAVICON_SIZE,
  ASSET_PURPOSES,
  LAYOUT_PRESETS,
  BORDER_RADIUS_OPTIONS,
} from "@/lib/branding-defaults";

describe("BRANDING_DEFAULTS", () => {
  it("provides all required default fields", () => {
    expect(BRANDING_DEFAULTS.appTitle).toBeTruthy();
    expect(BRANDING_DEFAULTS.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(BRANDING_DEFAULTS.layoutPreset).toBe("centered");
    expect(BRANDING_DEFAULTS.borderRadius).toBe("md");
  });

  it("has valid hex colors for all color defaults", () => {
    const colorFields = [
      "primaryColor", "secondaryColor", "accentColor",
      "backgroundColor", "panelColor", "textColor",
    ] as const;
    for (const field of colorFields) {
      expect(BRANDING_DEFAULTS[field]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("ALLOWED_ASSET_TYPES", () => {
  it("includes common image types", () => {
    expect(ALLOWED_ASSET_TYPES["image/png"]).toBeDefined();
    expect(ALLOWED_ASSET_TYPES["image/jpeg"]).toBeDefined();
    expect(ALLOWED_ASSET_TYPES["image/webp"]).toBeDefined();
  });

  it("does not allow SVG (XSS risk)", () => {
    expect(ALLOWED_ASSET_TYPES["image/svg+xml"]).toBeUndefined();
  });
});

describe("asset size limits", () => {
  it("favicon limit is smaller than general limit", () => {
    expect(MAX_FAVICON_SIZE).toBeLessThan(MAX_ASSET_SIZE);
  });

  it("general limit is 2MB", () => {
    expect(MAX_ASSET_SIZE).toBe(2 * 1024 * 1024);
  });
});

describe("ASSET_PURPOSES", () => {
  it("contains expected purposes", () => {
    expect(ASSET_PURPOSES).toContain("logo");
    expect(ASSET_PURPOSES).toContain("favicon");
    expect(ASSET_PURPOSES).toContain("hero");
    expect(ASSET_PURPOSES).toContain("background");
  });
});

describe("LAYOUT_PRESETS", () => {
  it("has at least 3 presets", () => {
    expect(LAYOUT_PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it("includes centered as default", () => {
    expect(LAYOUT_PRESETS.find((p) => p.value === "centered")).toBeDefined();
  });
});

describe("BORDER_RADIUS_OPTIONS", () => {
  it("includes md option", () => {
    expect(BORDER_RADIUS_OPTIONS.find((o) => o.value === "md")).toBeDefined();
  });
});
