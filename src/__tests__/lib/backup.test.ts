import { describe, it, expect } from "vitest";
import {
  generateBackupScript,
  generateRestoreScript,
  generateCronLine,
  generateBackupChecklist,
  generateBackupKit,
  generateFactoryResetScript,
  validateBackupConfig,
  type BackupConfig,
  type ResetScriptConfig,
} from "@/lib/backup";

function makeConfig(overrides: Partial<BackupConfig> = {}): BackupConfig {
  return {
    serverName: "matrix.example.com",
    deployment: "docker",
    postgresContainer: "synapse-db",
    postgresDb: "synapse",
    postgresUser: "synapse",
    configPath: "/data/synapse/config",
    mediaStorePath: "/data/synapse/media_store",
    backupDir: "/backups/synapse",
    includeMedia: true,
    retentionDays: 14,
    cronSchedule: "0 3 * * *",
    ...overrides,
  };
}

function makeResetConfig(overrides: Partial<ResetScriptConfig> = {}): ResetScriptConfig {
  return {
    serverName: "matrix.example.com",
    deployment: "docker",
    postgresContainer: "synapse-db",
    postgresDb: "synapse",
    postgresUser: "synapse",
    mediaStorePath: "/data/synapse/media_store",
    keepSigningKey: true,
    synapseService: "synapse",
    ...overrides,
  };
}

describe("validateBackupConfig", () => {
  it("accepts a valid docker config", () => {
    expect(validateBackupConfig(makeConfig())).toEqual([]);
  });

  it("requires postgresContainer for docker deployments", () => {
    const issues = validateBackupConfig(makeConfig({ postgresContainer: undefined }));
    expect(issues.some((i) => i.includes("postgresContainer"))).toBe(true);
  });

  it("requires postgresHost for native deployments", () => {
    const issues = validateBackupConfig(makeConfig({ deployment: "native", postgresHost: undefined }));
    expect(issues.some((i) => i.includes("postgresHost"))).toBe(true);
  });

  it("rejects relative paths", () => {
    const issues = validateBackupConfig(makeConfig({ backupDir: "backups" }));
    expect(issues.some((i) => i.includes("backupDir"))).toBe(true);
  });

  it("rejects malformed cron expressions", () => {
    const issues = validateBackupConfig(makeConfig({ cronSchedule: "every day" }));
    expect(issues.some((i) => i.includes("cronSchedule"))).toBe(true);
  });
});

describe("generateBackupScript", () => {
  it("dumps postgres via docker exec for docker deployments", () => {
    const script = generateBackupScript(makeConfig());
    expect(script).toContain("docker exec synapse-db pg_dump -U synapse -d synapse");
    expect(script).toContain("database.sql.gz");
  });

  it("dumps postgres directly for native deployments", () => {
    const script = generateBackupScript(
      makeConfig({ deployment: "native", postgresHost: "db.internal", postgresPort: 5433 })
    );
    expect(script).toContain("pg_dump -h db.internal -p 5433 -U synapse -d synapse");
    expect(script).not.toContain("docker exec");
  });

  it("archives the media store when includeMedia is true", () => {
    const script = generateBackupScript(makeConfig());
    expect(script).toContain("media_store.tar.gz");
  });

  it("skips the media store when includeMedia is false", () => {
    const script = generateBackupScript(makeConfig({ includeMedia: false }));
    expect(script).not.toContain("media_store.tar.gz");
    expect(script).toContain("Media store excluded");
  });

  it("archives the config directory including the signing key", () => {
    const script = generateBackupScript(makeConfig());
    expect(script).toContain("config.tar.gz");
    expect(script).toContain("/data/synapse/config");
  });

  it("applies retention via find -mtime", () => {
    const script = generateBackupScript(makeConfig({ retentionDays: 30 }));
    expect(script).toContain("-mtime +30");
  });

  it("uses bash strict mode", () => {
    expect(generateBackupScript(makeConfig())).toContain("set -euo pipefail");
  });

  it("references the official backup documentation", () => {
    expect(generateBackupScript(makeConfig())).toContain(
      "https://element-hq.github.io/synapse/latest/usage/administration/backups.html"
    );
  });
});

describe("generateRestoreScript", () => {
  it("restores the database via psql", () => {
    const script = generateRestoreScript(makeConfig());
    expect(script).toContain("gunzip -c");
    expect(script).toContain("psql -U synapse -d synapse");
  });

  it("warns about running two servers with the same identity", () => {
    const script = generateRestoreScript(makeConfig());
    expect(script).toContain("signing key");
    expect(script).toContain("Stop Synapse before restoring");
  });
});

describe("generateCronLine", () => {
  it("builds a crontab line with the configured schedule and log", () => {
    const line = generateCronLine(makeConfig());
    expect(line).toBe("0 3 * * * /backups/synapse/backup.sh >> /backups/synapse/backup.log 2>&1");
  });
});

describe("generateBackupChecklist", () => {
  it("warns about excluded media", () => {
    const checklist = generateBackupChecklist(makeConfig({ includeMedia: false }));
    expect(checklist.some((c) => c.includes("NOT included"))).toBe(true);
  });

  it("mentions pgpass for native deployments", () => {
    const checklist = generateBackupChecklist(makeConfig({ deployment: "native", postgresHost: "localhost" }));
    expect(checklist.some((c) => c.includes(".pgpass"))).toBe(true);
  });
});

describe("generateBackupKit", () => {
  it("returns all four artifacts", () => {
    const kit = generateBackupKit(makeConfig());
    expect(kit.backupScript).toContain("#!/usr/bin/env bash");
    expect(kit.restoreScript).toContain("#!/usr/bin/env bash");
    expect(kit.cronLine).toContain("backup.sh");
    expect(kit.checklist.length).toBeGreaterThan(0);
  });
});

describe("generateFactoryResetScript", () => {
  it("requires typing the server name to confirm", () => {
    const script = generateFactoryResetScript(makeResetConfig());
    expect(script).toContain('[ "${REPLY}" = "matrix.example.com" ]');
  });

  it("stops and starts synapse via docker compose for docker deployments", () => {
    const script = generateFactoryResetScript(makeResetConfig());
    expect(script).toContain("docker compose stop synapse");
    expect(script).toContain("docker compose start synapse");
  });

  it("stops and starts synapse via systemctl for native deployments", () => {
    const script = generateFactoryResetScript(
      makeResetConfig({ deployment: "native", postgresHost: "localhost", synapseService: "matrix-synapse" })
    );
    expect(script).toContain("systemctl stop matrix-synapse");
    expect(script).toContain("systemctl start matrix-synapse");
  });

  it("drops and recreates the database", () => {
    const script = generateFactoryResetScript(makeResetConfig());
    expect(script).toContain("DROP DATABASE IF EXISTS synapse;");
    expect(script).toContain("CREATE DATABASE synapse");
    expect(script).toContain("LC_COLLATE='C' LC_CTYPE='C'");
  });

  it("wipes the media store", () => {
    const script = generateFactoryResetScript(makeResetConfig());
    expect(script).toContain("rm -rf /data/synapse/media_store/*");
  });

  it("contains the federation warning", () => {
    const script = generateFactoryResetScript(makeResetConfig());
    expect(script).toContain("FEDERATION WARNING");
    expect(script).toContain("server_name");
  });

  it("warns about the signing key when keepSigningKey is false", () => {
    const script = generateFactoryResetScript(makeResetConfig({ keepSigningKey: false }));
    expect(script).toContain("keepSigningKey=false");
  });
});
