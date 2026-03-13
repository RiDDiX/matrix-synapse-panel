import type { CatalogEntry } from "../../types";

export const slackBridge: CatalogEntry = {
  id: "mautrix-slack",
  name: "Slack Bridge",
  type: "bridge",
  description: "Bridge Slack workspaces to Matrix rooms using mautrix-slack.",
  longDescription:
    "mautrix-slack is a Matrix-Slack puppeting bridge. It connects to Slack via the Slack API " +
    "and bridges messages, threads, reactions, files, and edits between Slack channels and Matrix rooms. " +
    "Supports both user-token (puppeting) and bot-token modes. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "Hash",
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
      id: "slack_workspace",
      label: "Slack Workspace Access",
      description: "Users must have access to the Slack workspace they want to bridge.",
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
      defaultValue: 29335,
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
    "Slack may revoke tokens for apps that violate their terms of service.",
    "User-token mode requires each user to authenticate individually.",
    "Slack API rate limits apply; high-volume channels may experience delays.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Supports Slack Enterprise Grid workspaces.",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/go/slack/",
  sourceUrl: "https://github.com/mautrix/slack",
  dockerImage: "dock.mau.dev/mautrix/slack:latest",
  defaultPort: 29335,
  defaultVersion: "latest",
  tags: ["bridge", "slack", "messaging", "mautrix", "puppeting", "workspace"],
};
