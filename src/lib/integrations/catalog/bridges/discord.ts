import type { CatalogEntry } from "../../types";

export const discordBridge: CatalogEntry = {
  id: "mautrix-discord",
  name: "Discord Bridge",
  type: "bridge",
  description: "Bridge Discord servers and DMs to Matrix rooms using mautrix-discord.",
  longDescription:
    "mautrix-discord is a Matrix-Discord puppeting bridge. It connects to Discord via the Discord API " +
    "and bridges messages, threads, reactions, attachments, embeds, and voice channel notifications. " +
    "Supports user-token puppeting for full conversation history. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "Gamepad2",
  maturity: "beta",
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
      id: "discord_internet",
      label: "Internet Access",
      description: "The bridge needs internet access to connect to Discord's API servers.",
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
      defaultValue: 29334,
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
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/_matrix/mau/live",
  riskNotes: [
    "Discord may ban accounts using self-botting (user tokens). Use at your own risk.",
    "Bot-token mode has limited access compared to user-token puppeting.",
    "Discord API rate limits apply; large servers may experience bridging delays.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Thread bridging requires Matrix thread support (MSC3440).",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/go/discord/",
  sourceUrl: "https://github.com/mautrix/discord",
  dockerImage: "dock.mau.dev/mautrix/discord:latest",
  defaultPort: 29334,
  defaultVersion: "latest",
  tags: ["bridge", "discord", "messaging", "mautrix", "puppeting", "gaming"],
};
