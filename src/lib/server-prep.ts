/**
 * Synapse Server Preparation Engine.
 *
 * Generates deployment-ready configuration assets for new Synapse homeservers:
 * - homeserver.yaml
 * - docker-compose.yaml
 * - .env template
 * - post-generation checklist
 *
 * This is a PREPARATION tool, not a provisioning tool.
 * It generates files; the administrator deploys them manually.
 * The dashboard does not magically start Synapse processes.
 *
 * All generated config keys are real, documented Synapse configuration options:
 * https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServerPrepConfig {
  serverName: string;
  publicBaseUrl: string;
  bindPort: number;

  database: "sqlite" | "postgresql";
  postgresHost?: string;
  postgresPort?: number;
  postgresDb?: string;
  postgresUser?: string;
  postgresPassword?: string;

  mediaStorePath: string;
  signingKeyPath: string;

  enableRegistration: boolean;
  registrationRequiresToken: boolean;

  trustedKeyServers: string[];
  reverseProxy: boolean;
  tlsTermination: "reverse_proxy" | "synapse" | "none";

  appserviceConfigDir?: string;

  logLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR";
  logFile?: string;

  enableTurn: boolean;
  turnUris?: string[];
  turnSharedSecret?: string;

  enableSmtp: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  smtpRequireTls?: boolean;

  maxUploadSize: string;
  urlPreviewEnabled: boolean;

  dataDir: string;
  containerName: string;
  networkName: string;
}

export interface ServerPrepResult {
  homeserverYaml: string;
  composeYaml: string;
  envTemplate: string;
  checklist: string[];
  warnings: string[];
}

export interface ServerPrepValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function getDefaultPrepConfig(): ServerPrepConfig {
  return {
    serverName: "example.com",
    publicBaseUrl: "https://matrix.example.com",
    bindPort: 8008,
    database: "postgresql",
    postgresHost: "db",
    postgresPort: 5432,
    postgresDb: "synapse",
    postgresUser: "synapse",
    postgresPassword: "",
    mediaStorePath: "/data/media_store",
    signingKeyPath: "/data/signing.key",
    enableRegistration: false,
    registrationRequiresToken: true,
    trustedKeyServers: ["matrix.org"],
    reverseProxy: true,
    tlsTermination: "reverse_proxy",
    appserviceConfigDir: "/data/appservices",
    logLevel: "INFO",
    enableTurn: false,
    enableSmtp: false,
    maxUploadSize: "50M",
    urlPreviewEnabled: true,
    dataDir: "./synapse-data",
    containerName: "synapse",
    networkName: "matrix-net",
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validatePrepConfig(config: ServerPrepConfig): ServerPrepValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.serverName || config.serverName === "example.com") {
    errors.push("server_name must be set to your actual domain (e.g. yourdomain.com).");
  }

  if (!config.publicBaseUrl || config.publicBaseUrl.includes("example.com")) {
    errors.push("public_baseurl must be a real URL pointing to your Synapse instance.");
  }

  if (config.publicBaseUrl && !config.publicBaseUrl.startsWith("https://") && config.tlsTermination !== "none") {
    warnings.push("public_baseurl should use https:// in production.");
  }

  if (config.database === "postgresql") {
    if (!config.postgresPassword) {
      errors.push("PostgreSQL password must not be empty.");
    }
    if (!config.postgresHost) {
      errors.push("PostgreSQL host is required.");
    }
  }

  if (config.database === "sqlite") {
    warnings.push("SQLite is not recommended for production. Use PostgreSQL for any server with more than a few users.");
  }

  if (config.enableRegistration && !config.registrationRequiresToken) {
    warnings.push("Open registration without token requirement may lead to spam/abuse.");
  }

  if (config.enableTurn && (!config.turnUris || config.turnUris.length === 0)) {
    errors.push("TURN is enabled but no TURN URIs are configured.");
  }

  if (config.enableSmtp && !config.smtpHost) {
    errors.push("SMTP is enabled but no SMTP host is configured.");
  }

  if (config.reverseProxy && config.tlsTermination === "synapse") {
    warnings.push("If using a reverse proxy, TLS should typically be terminated at the proxy, not Synapse.");
  }

  if (config.bindPort < 1 || config.bindPort > 65535) {
    errors.push("Bind port must be between 1 and 65535.");
  }

  if (config.appserviceConfigDir) {
    warnings.push("Ensure the appservice config directory exists and contains valid appservice registration YAML files before starting Synapse.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// homeserver.yaml generation
// ---------------------------------------------------------------------------

export function generateHomeserverYaml(config: ServerPrepConfig): string {
  const lines: string[] = [];

  lines.push("# Synapse homeserver configuration");
  lines.push(`# Generated for: ${config.serverName}`);
  lines.push(`# Ref: https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html`);
  lines.push("");
  lines.push(`server_name: "${config.serverName}"`);
  lines.push(`public_baseurl: "${config.publicBaseUrl}"`);
  lines.push(`pid_file: /data/homeserver.pid`);
  lines.push("");

  // Listeners
  lines.push("listeners:");
  lines.push("  - port: " + config.bindPort);
  lines.push("    tls: false");
  lines.push("    type: http");
  if (config.reverseProxy) {
    lines.push("    x_forwarded: true");
  }
  lines.push("    resources:");
  lines.push("      - names: [client, federation]");
  lines.push("        compress: false");
  lines.push("");

  // Database
  if (config.database === "postgresql") {
    lines.push("database:");
    lines.push("  name: psycopg2");
    lines.push("  args:");
    lines.push(`    host: "${config.postgresHost}"`);
    lines.push(`    port: ${config.postgresPort ?? 5432}`);
    lines.push(`    database: "${config.postgresDb ?? "synapse"}"`);
    lines.push(`    user: "${config.postgresUser ?? "synapse"}"`);
    lines.push(`    password: "\${POSTGRES_PASSWORD}"`);
    lines.push("    cp_min: 5");
    lines.push("    cp_max: 10");
  } else {
    lines.push("database:");
    lines.push("  name: sqlite3");
    lines.push("  args:");
    lines.push("    database: /data/homeserver.db");
  }
  lines.push("");

  // Media
  lines.push(`media_store_path: "${config.mediaStorePath}"`);
  lines.push(`max_upload_size: "${config.maxUploadSize}"`);
  lines.push(`url_preview_enabled: ${config.urlPreviewEnabled}`);
  if (config.urlPreviewEnabled) {
    lines.push("url_preview_ip_range_blacklist:");
    lines.push("  - '127.0.0.0/8'");
    lines.push("  - '10.0.0.0/8'");
    lines.push("  - '172.16.0.0/12'");
    lines.push("  - '192.168.0.0/16'");
    lines.push("  - '100.64.0.0/10'");
    lines.push("  - '192.0.0.0/24'");
    lines.push("  - '169.254.0.0/16'");
    lines.push("  - '198.51.100.0/24'");
    lines.push("  - '203.0.113.0/24'");
    lines.push("  - '224.0.0.0/4'");
    lines.push("  - '::1/128'");
    lines.push("  - 'fe80::/10'");
    lines.push("  - 'fc00::/7'");
    lines.push("  - '2001:db8::/32'");
    lines.push("  - 'ff00::/8'");
    lines.push("  - 'fec0::/10'");
  }
  lines.push("");

  // Signing key
  lines.push(`signing_key_path: "${config.signingKeyPath}"`);
  lines.push("");

  // Registration
  lines.push(`enable_registration: ${config.enableRegistration}`);
  if (config.enableRegistration && config.registrationRequiresToken) {
    lines.push("registration_requires_token: true");
  }
  lines.push("");

  // Trusted key servers
  lines.push("trusted_key_servers:");
  for (const server of config.trustedKeyServers) {
    lines.push(`  - server_name: "${server}"`);
  }
  lines.push("");

  // Logging
  lines.push("log_config: \"/data/log.config\"");
  lines.push("");

  // Appservice
  if (config.appserviceConfigDir) {
    lines.push(`app_service_config_files: []`);
    lines.push(`# Place appservice registration YAML files in ${config.appserviceConfigDir}`);
    lines.push(`# and add their paths to app_service_config_files above.`);
    lines.push("");
  }

  // TURN
  if (config.enableTurn && config.turnUris && config.turnUris.length > 0) {
    lines.push("turn_uris:");
    for (const uri of config.turnUris) {
      lines.push(`  - "${uri}"`);
    }
    if (config.turnSharedSecret) {
      lines.push(`turn_shared_secret: "\${TURN_SHARED_SECRET}"`);
    }
    lines.push("turn_user_lifetime: 86400000");
    lines.push("");
  }

  // SMTP
  if (config.enableSmtp && config.smtpHost) {
    lines.push("email:");
    lines.push(`  smtp_host: "${config.smtpHost}"`);
    lines.push(`  smtp_port: ${config.smtpPort ?? 587}`);
    if (config.smtpUser) lines.push(`  smtp_user: "\${SMTP_USER}"`);
    if (config.smtpPassword) lines.push(`  smtp_pass: "\${SMTP_PASSWORD}"`);
    lines.push(`  require_transport_security: ${config.smtpRequireTls ?? true}`);
    if (config.smtpFrom) lines.push(`  notif_from: "${config.smtpFrom}"`);
    lines.push("");
  }

  // Suppress key-share requests warning
  lines.push("suppress_key_server_warning: true");
  lines.push("");

  // Report stats
  lines.push("report_stats: false");
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// log.config generation
// ---------------------------------------------------------------------------

export function generateLogConfig(config: ServerPrepConfig): string {
  return `version: 1

formatters:
  precise:
    format: '%(asctime)s - %(name)s - %(lineno)d - %(levelname)s - %(request)s - %(message)s'

handlers:
  console:
    class: logging.StreamHandler
    formatter: precise

loggers:
  synapse.storage.SQL:
    level: WARNING

root:
  level: ${config.logLevel}
  handlers: [console]

disable_existing_loggers: false
`;
}

// ---------------------------------------------------------------------------
// docker-compose.yaml generation
// ---------------------------------------------------------------------------

export function generateComposeYaml(config: ServerPrepConfig): string {
  const lines: string[] = [];

  lines.push("# Docker Compose for Synapse homeserver");
  lines.push(`# Server: ${config.serverName}`);
  lines.push(`# Generated by RiDDiX Matrix Control`);
  lines.push("");
  lines.push("services:");
  lines.push(`  ${config.containerName}:`);
  lines.push("    image: matrixdotorg/synapse:latest");
  lines.push(`    container_name: ${config.containerName}`);
  lines.push("    restart: unless-stopped");
  lines.push("    env_file: .env");
  lines.push("    volumes:");
  lines.push(`      - ${config.dataDir}:/data`);
  lines.push("    ports:");
  lines.push(`      - "127.0.0.1:${config.bindPort}:${config.bindPort}"`);

  if (config.database === "postgresql") {
    lines.push("    depends_on:");
    lines.push("      db:");
    lines.push("        condition: service_healthy");
  }

  lines.push("    networks:");
  lines.push(`      - ${config.networkName}`);
  lines.push("    healthcheck:");
  lines.push(`      test: ["CMD-SHELL", "curl -fSs http://localhost:${config.bindPort}/health || exit 1"]`);
  lines.push("      interval: 30s");
  lines.push("      timeout: 10s");
  lines.push("      retries: 3");
  lines.push("      start_period: 40s");
  lines.push("");

  if (config.database === "postgresql") {
    lines.push("  db:");
    lines.push("    image: postgres:16-alpine");
    lines.push("    container_name: synapse-db");
    lines.push("    restart: unless-stopped");
    lines.push("    env_file: .env");
    lines.push("    environment:");
    lines.push("      POSTGRES_DB: ${POSTGRES_DB}");
    lines.push("      POSTGRES_USER: ${POSTGRES_USER}");
    lines.push("      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}");
    lines.push("      POSTGRES_INITDB_ARGS: \"--encoding=UTF8 --lc-collate=C --lc-ctype=C\"");
    lines.push("    volumes:");
    lines.push("      - postgres-data:/var/lib/postgresql/data");
    lines.push("    networks:");
    lines.push(`      - ${config.networkName}`);
    lines.push("    healthcheck:");
    lines.push("      test: [\"CMD-SHELL\", \"pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}\"]");
    lines.push("      interval: 10s");
    lines.push("      timeout: 5s");
    lines.push("      retries: 5");
    lines.push("");
  }

  lines.push("networks:");
  lines.push(`  ${config.networkName}:`);
  lines.push("    driver: bridge");
  lines.push("");

  if (config.database === "postgresql") {
    lines.push("volumes:");
    lines.push("  postgres-data:");
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// .env template generation
// ---------------------------------------------------------------------------

export function generateEnvTemplate(config: ServerPrepConfig): string {
  const lines: string[] = [];

  lines.push("# Environment variables for Synapse deployment");
  lines.push(`# Server: ${config.serverName}`);
  lines.push("");
  lines.push("# Synapse");
  lines.push(`SYNAPSE_SERVER_NAME=${config.serverName}`);
  lines.push(`SYNAPSE_REPORT_STATS=no`);
  lines.push("");

  if (config.database === "postgresql") {
    lines.push("# PostgreSQL");
    lines.push(`POSTGRES_DB=${config.postgresDb ?? "synapse"}`);
    lines.push(`POSTGRES_USER=${config.postgresUser ?? "synapse"}`);
    lines.push(`POSTGRES_PASSWORD=CHANGE_ME_STRONG_DB_PASSWORD`);
    lines.push("");
  }

  if (config.enableTurn && config.turnSharedSecret) {
    lines.push("# TURN");
    lines.push("TURN_SHARED_SECRET=CHANGE_ME_TURN_SECRET");
    lines.push("");
  }

  if (config.enableSmtp) {
    lines.push("# SMTP");
    if (config.smtpUser) lines.push(`SMTP_USER=${config.smtpUser}`);
    if (config.smtpPassword) lines.push("SMTP_PASSWORD=CHANGE_ME_SMTP_PASSWORD");
    lines.push("");
  }

  lines.push("# UID/GID for Synapse container (match your host)");
  lines.push("UID=1000");
  lines.push("GID=1000");
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Checklist generation
// ---------------------------------------------------------------------------

export function generateChecklist(config: ServerPrepConfig): string[] {
  const items: string[] = [];

  items.push("Review and customize homeserver.yaml for your environment.");
  items.push("Replace all CHANGE_ME placeholders in the .env file with real secrets.");

  if (config.database === "postgresql") {
    items.push("Set a strong, unique PostgreSQL password in .env.");
  }

  items.push(`Create the data directory: mkdir -p ${config.dataDir}`);
  items.push(`Copy homeserver.yaml into ${config.dataDir}/homeserver.yaml`);
  items.push(`Copy log.config into ${config.dataDir}/log.config`);

  items.push("Generate a signing key: docker run --rm -v $(pwd)/synapse-data:/data -e SYNAPSE_SERVER_NAME=" + config.serverName + " -e SYNAPSE_REPORT_STATS=no matrixdotorg/synapse:latest generate");

  if (config.reverseProxy) {
    items.push("Configure your reverse proxy (nginx/Caddy/Traefik) to forward traffic to 127.0.0.1:" + config.bindPort + ".");
    items.push("Ensure /_matrix/* and /_synapse/* paths are forwarded.");
    items.push("Set up TLS certificates (Let's Encrypt / ACME recommended).");
  }

  items.push("Start the stack: docker compose up -d");
  items.push("Check logs: docker compose logs -f " + config.containerName);
  items.push(`Verify the server is running: curl http://localhost:${config.bindPort}/_matrix/client/versions`);

  if (config.enableRegistration && config.registrationRequiresToken) {
    items.push("Create registration tokens via the dashboard after registering this server.");
  }

  if (config.appserviceConfigDir) {
    items.push(`Create appservice config directory: mkdir -p ${config.dataDir}/appservices`);
    items.push("Add appservice registration files and reference them in homeserver.yaml app_service_config_files.");
  }

  items.push("Register this homeserver in the RiDDiX Matrix Control dashboard under Servers.");
  items.push("Perform admin login to obtain an access token for the dashboard to manage this server.");

  return items;
}

// ---------------------------------------------------------------------------
// Full generation
// ---------------------------------------------------------------------------

export function generateServerPrep(config: ServerPrepConfig): ServerPrepResult {
  const validation = validatePrepConfig(config);

  return {
    homeserverYaml: generateHomeserverYaml(config),
    composeYaml: generateComposeYaml(config),
    envTemplate: generateEnvTemplate(config),
    checklist: generateChecklist(config),
    warnings: [...validation.warnings, ...validation.errors],
  };
}
