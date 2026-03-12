import type { CatalogEntry } from "../../types";

export const telegramBridge: CatalogEntry = {
  id: "mautrix-telegram",
  name: "Telegram Bridge",
  type: "bridge",
  description: "Bridge Telegram conversations to Matrix rooms using mautrix-telegram.",
  longDescription:
    "mautrix-telegram is a Matrix-Telegram hybrid puppeting/relaybot bridge. It can bridge Telegram groups, " +
    "supergroups, and private chats to Matrix. Supports media, formatting, reactions, and edits. " +
    "Requires a Telegram API ID and hash. Runs as an external Application Service.",
  icon: "Send",
  maturity: "stable",
  deploymentModes: ["managed", "guided"],
  requiredSecrets: [
    {
      key: "as_token",
      label: "Application Service Token",
      description: "Token used by the bridge to authenticate with Synapse. Auto-generated during install.",
      required: true,
      sensitive: true,
    },
    {
      key: "hs_token",
      label: "Homeserver Token",
      description: "Token used by Synapse to send events to the bridge. Auto-generated during install.",
      required: true,
      sensitive: true,
    },
    {
      key: "telegram_api_id",
      label: "Telegram API ID",
      description: "Obtain from https://my.telegram.org/apps. Required for the bridge to connect to Telegram.",
      required: true,
      sensitive: true,
    },
    {
      key: "telegram_api_hash",
      label: "Telegram API Hash",
      description: "Obtain from https://my.telegram.org/apps. Required for the bridge to connect to Telegram.",
      required: true,
      sensitive: true,
    },
  ],
  requiredSynapseChanges: [
    {
      type: "appservice_registration",
      description:
        "An Application Service registration YAML file must be added to Synapse's appservice config directory.",
      automatable: false,
      generatable: true,
    },
  ],
  infraRequirements: [
    {
      id: "docker",
      label: "Docker Runtime",
      description: "Docker must be available to run the bridge container.",
      required: true,
    },
    {
      id: "network",
      label: "Network Access to Synapse",
      description: "The bridge container must be able to reach Synapse's internal URL.",
      required: true,
    },
    {
      id: "telegram_api",
      label: "Telegram API Credentials",
      description: "A Telegram API ID and Hash must be obtained from https://my.telegram.org/apps.",
      required: true,
    },
  ],
  configFields: [
    {
      key: "homeserver_address",
      label: "Homeserver Address",
      description: "Internal Synapse URL reachable from the bridge container.",
      type: "url",
      required: true,
      section: "Homeserver",
    },
    {
      key: "homeserver_domain",
      label: "Homeserver Domain",
      description: "The server_name of your Synapse instance.",
      type: "string",
      required: true,
      section: "Homeserver",
    },
    {
      key: "bridge_port",
      label: "Bridge Port",
      description: "Port the bridge listens on for appservice transactions.",
      type: "port",
      required: true,
      defaultValue: 29317,
      section: "Network",
    },
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/_matrix/mau/live",
  riskNotes: [
    "Telegram may restrict API access for abusive usage patterns.",
    "Requires valid Telegram API credentials.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Requires Python 3.9+ runtime in the container.",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/python/telegram/",
  sourceUrl: "https://github.com/mautrix/telegram",
  dockerImage: "dock.mau.dev/mautrix/telegram:latest",
  defaultPort: 29317,
  defaultVersion: "latest",
  tags: ["bridge", "telegram", "messaging", "mautrix", "puppeting", "relay"],
};
