import { describe, it, expect } from "vitest";
import { getCatalog, getCatalogEntry, getCatalogByType, searchCatalog } from "@/lib/integrations/catalog";

describe("Integration Catalog", () => {
  it("returns all catalog entries", () => {
    const catalog = getCatalog();
    expect(catalog.length).toBe(10);
    const ids = catalog.map((e) => e.id);
    expect(ids).toContain("mautrix-whatsapp");
    expect(ids).toContain("mautrix-signal");
    expect(ids).toContain("mautrix-telegram");
    expect(ids).toContain("mautrix-slack");
    expect(ids).toContain("mautrix-discord");
    expect(ids).toContain("mautrix-gmessages");
    expect(ids).toContain("mautrix-meta");
    expect(ids).toContain("mautrix-googlechat");
    expect(ids).toContain("matrix-appservice-irc");
    expect(ids).toContain("mautrix-twitter");
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
    expect(bridges.length).toBe(10);
    bridges.forEach((e) => expect(e.type).toBe("bridge"));

    const bots = getCatalogByType("bot");
    expect(bots.length).toBe(0);
  });

  it("searches by name", () => {
    const results = searchCatalog("whatsapp");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.id).toBe("mautrix-whatsapp");
  });

  it("searches by tag", () => {
    const results = searchCatalog("puppeting");
    expect(results.length).toBeGreaterThanOrEqual(7);
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
      expect(entry.requiredSynapseChanges[0]?.type).toBe("appservice_registration");
      expect(entry.requiredSynapseChanges[0]?.generatable).toBe(true);
      expect(entry.requiredSynapseChanges[0]?.automatable).toBe(false);
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

  describe("Slack bridge entry", () => {
    const entry = getCatalogEntry("mautrix-slack")!;

    it("is stable maturity", () => {
      expect(entry).toBeDefined();
      expect(entry.name).toBe("Slack Bridge");
      expect(entry.maturity).toBe("stable");
    });

    it("has correct docker image and port", () => {
      expect(entry.dockerImage).toBe("dock.mau.dev/mautrix/slack:latest");
      expect(entry.defaultPort).toBe(29335);
    });

    it("has workspace tag", () => {
      expect(entry.tags).toContain("slack");
      expect(entry.tags).toContain("workspace");
    });
  });

  describe("Discord bridge entry", () => {
    const entry = getCatalogEntry("mautrix-discord")!;

    it("is beta maturity", () => {
      expect(entry).toBeDefined();
      expect(entry.name).toBe("Discord Bridge");
      expect(entry.maturity).toBe("beta");
    });

    it("has correct docker image and port", () => {
      expect(entry.dockerImage).toBe("dock.mau.dev/mautrix/discord:latest");
      expect(entry.defaultPort).toBe(29334);
    });
  });

  describe("Google Messages bridge entry", () => {
    const entry = getCatalogEntry("mautrix-gmessages")!;

    it("is beta maturity", () => {
      expect(entry).toBeDefined();
      expect(entry.name).toBe("Google Messages Bridge");
      expect(entry.maturity).toBe("beta");
    });

    it("has correct docker image and port", () => {
      expect(entry.dockerImage).toBe("dock.mau.dev/mautrix/gmessages:latest");
      expect(entry.defaultPort).toBe(29336);
    });

    it("requires android phone", () => {
      const ids = entry.infraRequirements.map((r) => r.id);
      expect(ids).toContain("android_phone");
    });
  });

  describe("Meta bridge entry", () => {
    const entry = getCatalogEntry("mautrix-meta")!;

    it("is beta maturity", () => {
      expect(entry).toBeDefined();
      expect(entry.name).toBe("Meta Bridge (Facebook & Instagram)");
      expect(entry.maturity).toBe("beta");
    });

    it("has correct docker image and port", () => {
      expect(entry.dockerImage).toBe("dock.mau.dev/mautrix/meta:latest");
      expect(entry.defaultPort).toBe(29319);
    });

    it("has platform mode config field", () => {
      const field = entry.configFields.find((f) => f.key === "meta_mode");
      expect(field).toBeDefined();
      expect(field!.type).toBe("select");
      expect(field!.options).toHaveLength(2);
    });

    it("has facebook and instagram tags", () => {
      expect(entry.tags).toContain("facebook");
      expect(entry.tags).toContain("instagram");
    });
  });

  describe("Google Chat bridge entry", () => {
    const entry = getCatalogEntry("mautrix-googlechat")!;

    it("is beta maturity", () => {
      expect(entry).toBeDefined();
      expect(entry.name).toBe("Google Chat Bridge");
      expect(entry.maturity).toBe("beta");
    });

    it("has correct docker image and port", () => {
      expect(entry.dockerImage).toBe("dock.mau.dev/mautrix/googlechat:latest");
      expect(entry.defaultPort).toBe(29320);
    });

    it("requires google account", () => {
      const ids = entry.infraRequirements.map((r) => r.id);
      expect(ids).toContain("google_account");
    });
  });

  describe("IRC bridge entry", () => {
    const entry = getCatalogEntry("matrix-appservice-irc")!;

    it("is stable maturity", () => {
      expect(entry).toBeDefined();
      expect(entry.name).toBe("IRC Bridge");
      expect(entry.maturity).toBe("stable");
    });

    it("has correct docker image and port", () => {
      expect(entry.dockerImage).toBe("matrixdotorg/matrix-appservice-irc:latest");
      expect(entry.defaultPort).toBe(9999);
    });

    it("has IRC-specific config fields", () => {
      const keys = entry.configFields.map((f) => f.key);
      expect(keys).toContain("irc_server");
      expect(keys).toContain("irc_port");
      expect(keys).toContain("irc_ssl");
    });

    it("uses different health endpoint", () => {
      expect(entry.healthcheckEndpoint).toBe("/healthz");
    });
  });

  describe("Twitter bridge entry", () => {
    const entry = getCatalogEntry("mautrix-twitter")!;

    it("is beta maturity", () => {
      expect(entry).toBeDefined();
      expect(entry.name).toBe("Twitter/X Bridge");
      expect(entry.maturity).toBe("beta");
    });

    it("has correct docker image and port", () => {
      expect(entry.dockerImage).toBe("dock.mau.dev/mautrix/twitter:latest");
      expect(entry.defaultPort).toBe(29327);
    });
  });

  describe("all entries have required structure", () => {
    const catalog = getCatalog();

    it.each(catalog.map((e) => [e.id, e]))("entry %s has valid structure", (_id, entry) => {
      expect(entry.name).toBeTruthy();
      expect(entry.type).toBe("bridge");
      expect(["stable", "beta", "experimental", "deprecated"]).toContain(entry.maturity);
      expect(entry.deploymentModes.length).toBeGreaterThan(0);
      expect(entry.requiredSecrets.length).toBeGreaterThanOrEqual(2);
      expect(entry.requiredSynapseChanges.length).toBeGreaterThan(0);
      expect(entry.infraRequirements.length).toBeGreaterThan(0);
      expect(entry.configFields.length).toBeGreaterThan(0);
      expect(entry.healthcheckStrategy).toBeTruthy();
      expect(entry.riskNotes.length).toBeGreaterThan(0);
      expect(entry.compatibilityNotes.length).toBeGreaterThan(0);
      expect(entry.dockerImage).toBeTruthy();
      expect(entry.defaultPort).toBeGreaterThan(0);
      expect(entry.tags.length).toBeGreaterThan(0);
      expect(entry.documentationUrl).toBeTruthy();
      expect(entry.sourceUrl).toBeTruthy();
    });

    it("has no duplicate IDs", () => {
      const ids = catalog.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has no duplicate ports", () => {
      const ports = catalog.map((e) => e.defaultPort).filter(Boolean);
      expect(new Set(ports).size).toBe(ports.length);
    });
  });
});
