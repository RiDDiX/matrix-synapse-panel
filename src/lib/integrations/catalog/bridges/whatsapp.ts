import type { CatalogEntry } from "../../types";

export const whatsappBridge: CatalogEntry = {
  id: "mautrix-whatsapp",
  name: "WhatsApp Bridge",
  type: "bridge",
  description: "Bridge WhatsApp conversations to Matrix rooms using mautrix-whatsapp.",
  longDescription:
    "mautrix-whatsapp is a Matrix-WhatsApp puppeting bridge. It connects to WhatsApp via the multi-device web API " +
    "and bridges messages, media, reactions, and read receipts between WhatsApp and Matrix. " +
    "Requires QR code or phone number pairing for each WhatsApp account. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "MessageCircle",
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
  ],
  requiredSynapseChanges: [
    {
      type: "appservice_registration",
      description:
        "An Application Service registration YAML file must be added to Synapse's appservice config directory " +
        "and referenced in homeserver.yaml under app_service_config_files.",
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
      id: "whatsapp_internet",
      label: "Internet Access",
      description: "The bridge needs internet access to connect to WhatsApp servers.",
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
      defaultValue: 29318,
      section: "Network",
    },
    {
      key: "bridge_permissions",
      label: "Bridge Permissions",
      description: "MXID patterns and their permission levels (JSON object).",
      type: "textarea",
      required: false,
      defaultValue: '{"*": "relay", "@admin:example.com": "admin"}',
      section: "Permissions",
    },
    {
      key: "relay_enabled",
      label: "Relay Mode",
      description: "Allow relaying messages for users who have not logged into the bridge.",
      type: "boolean",
      required: false,
      defaultValue: false,
      section: "Features",
    },
    {
      key: "history_sync",
      label: "History Sync",
      description: "Sync message history from WhatsApp on login.",
      type: "boolean",
      required: false,
      defaultValue: true,
      section: "Features",
    },
    {
      key: "media_max_size",
      label: "Max Media Size (MB)",
      description: "Maximum file size for bridged media in megabytes.",
      type: "number",
      required: false,
      defaultValue: 50,
      validation: { min: 1, max: 500 },
      section: "Media",
    },
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/_matrix/mau/live",
  riskNotes: [
    "WhatsApp may ban accounts that use unofficial clients. Use at your own risk.",
    "Bridge requires periodic re-pairing if the WhatsApp session expires.",
    "High-volume bridging may trigger WhatsApp rate limits.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Does not support Synapse workers for appservice handling without additional config.",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/go/whatsapp/",
  sourceUrl: "https://github.com/mautrix/whatsapp",
  dockerImage: "dock.mau.dev/mautrix/whatsapp:latest",
  defaultPort: 29318,
  defaultVersion: "latest",
  tags: ["bridge", "whatsapp", "messaging", "mautrix", "puppeting"],
};
