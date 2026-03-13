import { describe, it, expect } from "vitest";
import {
  getDefaultPrepConfig,
  validatePrepConfig,
  generateHomeserverYaml,
  generateComposeYaml,
  generateEnvTemplate,
  generateChecklist,
  generateLogConfig,
  generateServerPrep,
  type ServerPrepConfig,
} from "@/lib/server-prep";

describe("getDefaultPrepConfig", () => {
  it("returns a valid default config", () => {
    const config = getDefaultPrepConfig();
    expect(config.serverName).toBe("example.com");
    expect(config.database).toBe("postgresql");
    expect(config.bindPort).toBe(8008);
    expect(config.reverseProxy).toBe(true);
  });
});

describe("validatePrepConfig", () => {
  it("rejects example.com as server name", () => {
    const config = getDefaultPrepConfig();
    const result = validatePrepConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("server_name"))).toBe(true);
  });

  it("rejects empty PostgreSQL password", () => {
    const config: ServerPrepConfig = {
      ...getDefaultPrepConfig(),
      serverName: "real.domain.com",
      publicBaseUrl: "https://matrix.real.domain.com",
    };
    const result = validatePrepConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("PostgreSQL password"))).toBe(true);
  });

  it("passes with valid config", () => {
    const config: ServerPrepConfig = {
      ...getDefaultPrepConfig(),
      serverName: "real.domain.com",
      publicBaseUrl: "https://matrix.real.domain.com",
      postgresPassword: "strong_password_123",
    };
    const result = validatePrepConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warns about SQLite in production", () => {
    const config: ServerPrepConfig = {
      ...getDefaultPrepConfig(),
      serverName: "real.domain.com",
      publicBaseUrl: "https://matrix.real.domain.com",
      database: "sqlite",
    };
    const result = validatePrepConfig(config);
    expect(result.warnings.some((w) => w.includes("SQLite"))).toBe(true);
  });

  it("warns about open registration", () => {
    const config: ServerPrepConfig = {
      ...getDefaultPrepConfig(),
      serverName: "real.domain.com",
      publicBaseUrl: "https://matrix.real.domain.com",
      postgresPassword: "strong",
      enableRegistration: true,
      registrationRequiresToken: false,
    };
    const result = validatePrepConfig(config);
    expect(result.warnings.some((w) => w.includes("spam"))).toBe(true);
  });

  it("rejects TURN enabled without URIs", () => {
    const config: ServerPrepConfig = {
      ...getDefaultPrepConfig(),
      serverName: "real.domain.com",
      publicBaseUrl: "https://matrix.real.domain.com",
      postgresPassword: "strong",
      enableTurn: true,
      turnUris: [],
    };
    const result = validatePrepConfig(config);
    expect(result.errors.some((e) => e.includes("TURN"))).toBe(true);
  });

  it("rejects SMTP enabled without host", () => {
    const config: ServerPrepConfig = {
      ...getDefaultPrepConfig(),
      serverName: "real.domain.com",
      publicBaseUrl: "https://matrix.real.domain.com",
      postgresPassword: "strong",
      enableSmtp: true,
      smtpHost: "",
    };
    const result = validatePrepConfig(config);
    expect(result.errors.some((e) => e.includes("SMTP"))).toBe(true);
  });
});

describe("generateHomeserverYaml", () => {
  const config: ServerPrepConfig = {
    ...getDefaultPrepConfig(),
    serverName: "test.example.com",
    publicBaseUrl: "https://matrix.test.example.com",
    postgresPassword: "secret",
  };

  it("contains server_name", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).toContain('server_name: "test.example.com"');
  });

  it("contains public_baseurl", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).toContain('public_baseurl: "https://matrix.test.example.com"');
  });

  it("contains PostgreSQL config for postgresql database", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).toContain("name: psycopg2");
    expect(yaml).toContain('host: "db"');
  });

  it("contains sqlite config for sqlite database", () => {
    const sqliteConfig = { ...config, database: "sqlite" as const };
    const yaml = generateHomeserverYaml(sqliteConfig);
    expect(yaml).toContain("name: sqlite3");
  });

  it("contains listener config", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).toContain("port: 8008");
    expect(yaml).toContain("x_forwarded: true");
  });

  it("contains registration config", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).toContain("enable_registration: false");
  });

  it("contains registration_requires_token when registration is enabled", () => {
    const regConfig = { ...config, enableRegistration: true, registrationRequiresToken: true };
    const yaml = generateHomeserverYaml(regConfig);
    expect(yaml).toContain("registration_requires_token: true");
  });

  it("contains trusted key servers", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).toContain('server_name: "matrix.org"');
  });

  it("contains URL preview blacklist when enabled", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).toContain("url_preview_ip_range_blacklist");
    expect(yaml).toContain("127.0.0.0/8");
  });

  it("does not contain TURN config when disabled", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).not.toContain("turn_uris");
  });

  it("contains TURN config when enabled", () => {
    const turnConfig: ServerPrepConfig = {
      ...config,
      enableTurn: true,
      turnUris: ["turn:turn.example.com:3478"],
      turnSharedSecret: "secret",
    };
    const yaml = generateHomeserverYaml(turnConfig);
    expect(yaml).toContain("turn_uris");
    expect(yaml).toContain("turn:turn.example.com:3478");
  });

  it("does not generate fantasy config keys", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).not.toContain("auto_provision");
    expect(yaml).not.toContain("managed_mode");
    expect(yaml).not.toContain("dynamic_config");
  });

  it("uses env var substitution for secrets", () => {
    const yaml = generateHomeserverYaml(config);
    expect(yaml).toContain("${POSTGRES_PASSWORD}");
  });
});

describe("generateComposeYaml", () => {
  const config: ServerPrepConfig = {
    ...getDefaultPrepConfig(),
    serverName: "test.example.com",
    publicBaseUrl: "https://matrix.test.example.com",
    postgresPassword: "secret",
  };

  it("contains synapse service", () => {
    const yaml = generateComposeYaml(config);
    expect(yaml).toContain("matrixdotorg/synapse:latest");
    expect(yaml).toContain(`container_name: ${config.containerName}`);
  });

  it("contains PostgreSQL service for postgresql database", () => {
    const yaml = generateComposeYaml(config);
    expect(yaml).toContain("postgres:16-alpine");
    expect(yaml).toContain("POSTGRES_DB");
  });

  it("does not contain PostgreSQL for sqlite database", () => {
    const sqliteConfig = { ...config, database: "sqlite" as const };
    const yaml = generateComposeYaml(sqliteConfig);
    expect(yaml).not.toContain("postgres");
  });

  it("binds to localhost", () => {
    const yaml = generateComposeYaml(config);
    expect(yaml).toContain("127.0.0.1:");
  });

  it("contains healthcheck", () => {
    const yaml = generateComposeYaml(config);
    expect(yaml).toContain("healthcheck");
    expect(yaml).toContain("/health");
  });

  it("contains env_file reference", () => {
    const yaml = generateComposeYaml(config);
    expect(yaml).toContain("env_file: .env");
  });

  it("uses custom network name", () => {
    const yaml = generateComposeYaml(config);
    expect(yaml).toContain(config.networkName);
  });
});

describe("generateEnvTemplate", () => {
  const config: ServerPrepConfig = {
    ...getDefaultPrepConfig(),
    serverName: "test.example.com",
    postgresPassword: "secret",
  };

  it("contains CHANGE_ME placeholder for password", () => {
    const env = generateEnvTemplate(config);
    expect(env).toContain("CHANGE_ME");
  });

  it("contains server name", () => {
    const env = generateEnvTemplate(config);
    expect(env).toContain("test.example.com");
  });

  it("contains PostgreSQL vars for postgresql database", () => {
    const env = generateEnvTemplate(config);
    expect(env).toContain("POSTGRES_DB=");
    expect(env).toContain("POSTGRES_USER=");
  });

  it("does not contain PostgreSQL vars for sqlite", () => {
    const sqliteConfig = { ...config, database: "sqlite" as const };
    const env = generateEnvTemplate(sqliteConfig);
    expect(env).not.toContain("POSTGRES_DB");
  });
});

describe("generateLogConfig", () => {
  it("contains the configured log level", () => {
    const config = getDefaultPrepConfig();
    const logConfig = generateLogConfig(config);
    expect(logConfig).toContain("level: INFO");
  });

  it("contains console handler", () => {
    const config = getDefaultPrepConfig();
    const logConfig = generateLogConfig(config);
    expect(logConfig).toContain("class: logging.StreamHandler");
  });
});

describe("generateChecklist", () => {
  it("returns non-empty checklist", () => {
    const config = getDefaultPrepConfig();
    const checklist = generateChecklist(config);
    expect(checklist.length).toBeGreaterThan(0);
  });

  it("includes data directory creation", () => {
    const config = getDefaultPrepConfig();
    const checklist = generateChecklist(config);
    expect(checklist.some((c) => c.includes("mkdir"))).toBe(true);
  });

  it("includes docker compose up", () => {
    const config = getDefaultPrepConfig();
    const checklist = generateChecklist(config);
    expect(checklist.some((c) => c.includes("docker compose up"))).toBe(true);
  });

  it("includes reverse proxy note when enabled", () => {
    const config = { ...getDefaultPrepConfig(), reverseProxy: true };
    const checklist = generateChecklist(config);
    expect(checklist.some((c) => c.includes("reverse proxy"))).toBe(true);
  });

  it("includes registration token note when token-based", () => {
    const config = { ...getDefaultPrepConfig(), enableRegistration: true, registrationRequiresToken: true };
    const checklist = generateChecklist(config);
    expect(checklist.some((c) => c.includes("registration token"))).toBe(true);
  });
});

describe("generateServerPrep", () => {
  it("returns all output fields", () => {
    const config: ServerPrepConfig = {
      ...getDefaultPrepConfig(),
      serverName: "test.example.com",
      publicBaseUrl: "https://matrix.test.example.com",
      postgresPassword: "strong",
    };
    const result = generateServerPrep(config);
    expect(result.homeserverYaml).toBeTruthy();
    expect(result.composeYaml).toBeTruthy();
    expect(result.envTemplate).toBeTruthy();
    expect(result.checklist.length).toBeGreaterThan(0);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
