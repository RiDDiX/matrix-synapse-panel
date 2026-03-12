import { describe, it, expect } from "vitest";
import { getCatalog, getCatalogEntry, getCatalogByType, searchCatalog } from "@/lib/integrations/catalog";

describe("Integration Catalog", () => {
  it("returns all catalog entries", () => {
    const catalog = getCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(3);
    const ids = catalog.map((e) => e.id);
    expect(ids).toContain("mautrix-whatsapp");
    expect(ids).toContain("mautrix-signal");
    expect(ids).toContain("mautrix-telegram");
  });

  it("returns a specific entry by id", () => {
    const entry = getCatalogEntry("mautrix-whatsapp");
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("WhatsApp Bridge");
    expect(entry!.type).toBe("bridge");
    expect(entry!.maturity).toBe("stable");
    expect(entry!.deploymentModes).toContain("managed");
    expect(entry!.deploymentModes).toContain("guided");
  });

  it("returns undefined for unknown id", () => {
    expect(getCatalogEntry("nonexistent")).toBeUndefined();
  });

  it("filters by type", () => {
    const bridges = getCatalogByType("bridge");
    expect(bridges.length).toBeGreaterThanOrEqual(3);
    bridges.forEach((e) => expect(e.type).toBe("bridge"));

    const bots = getCatalogByType("bot");
    expect(bots.length).toBe(0);
  });

  it("searches by name", () => {
    const results = searchCatalog("whatsapp");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].id).toBe("mautrix-whatsapp");
  });

  it("searches by tag", () => {
    const results = searchCatalog("puppeting");
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty for no matches", () => {
    expect(searchCatalog("zzz_nonexistent_zzz")).toHaveLength(0);
  });

  describe("WhatsApp bridge entry", () => {
    const entry = getCatalogEntry("mautrix-whatsapp")!;

    it("has required secrets", () => {
      const keys = entry.requiredSecrets.map((s) => s.key);
      expect(keys).toContain("as_token");
      expect(keys).toContain("hs_token");
      entry.requiredSecrets.forEach((s) => {
        expect(s.sensitive).toBe(true);
        expect(s.label).toBeTruthy();
        expect(s.description).toBeTruthy();
      });
    });

    it("has config fields", () => {
      expect(entry.configFields.length).toBeGreaterThan(0);
      const keys = entry.configFields.map((f) => f.key);
      expect(keys).toContain("homeserver_address");
      expect(keys).toContain("homeserver_domain");
      expect(keys).toContain("bridge_port");
    });

    it("has infra requirements", () => {
      expect(entry.infraRequirements.length).toBeGreaterThan(0);
      const ids = entry.infraRequirements.map((r) => r.id);
      expect(ids).toContain("docker");
      expect(ids).toContain("network");
    });

    it("has synapse changes", () => {
      expect(entry.requiredSynapseChanges.length).toBe(1);
      expect(entry.requiredSynapseChanges[0].type).toBe("appservice_registration");
      expect(entry.requiredSynapseChanges[0].generatable).toBe(true);
      expect(entry.requiredSynapseChanges[0].automatable).toBe(false);
    });

    it("has risk notes", () => {
      expect(entry.riskNotes.length).toBeGreaterThan(0);
    });

    it("has correct docker image", () => {
      expect(entry.dockerImage).toBe("dock.mau.dev/mautrix/whatsapp:latest");
      expect(entry.defaultPort).toBe(29318);
    });

    it("has health check config", () => {
      expect(entry.healthcheckStrategy).toBe("http");
      expect(entry.healthcheckEndpoint).toBe("/_matrix/mau/live");
    });
  });

  describe("Signal bridge entry", () => {
    const entry = getCatalogEntry("mautrix-signal")!;

    it("is beta maturity", () => {
      expect(entry.maturity).toBe("beta");
    });

    it("has correct default port", () => {
      expect(entry.defaultPort).toBe(29328);
    });
  });

  describe("Telegram bridge entry", () => {
    const entry = getCatalogEntry("mautrix-telegram")!;

    it("requires telegram API credentials", () => {
      const keys = entry.requiredSecrets.map((s) => s.key);
      expect(keys).toContain("telegram_api_id");
      expect(keys).toContain("telegram_api_hash");
    });

    it("has correct default port", () => {
      expect(entry.defaultPort).toBe(29317);
    });
  });
});
