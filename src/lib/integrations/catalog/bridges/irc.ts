import type { CatalogEntry } from "../../types";

export const ircBridge: CatalogEntry = {
  id: "matrix-appservice-irc",
  name: "IRC Bridge",
  type: "bridge",
  description: "Bridge IRC channels to Matrix rooms using the official matrix-appservice-irc.",
  longDescription:
    "matrix-appservice-irc is the official Matrix-IRC bridge maintained by the Matrix.org Foundation. " +
    "It bridges IRC channels to Matrix rooms with support for nick mapping, topic sync, " +
    "join/part notifications, and PM bridging. Supports connecting to multiple IRC networks simultaneously. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "Terminal",
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
      id: "irc_network",
      label: "IRC Network Access",
      description: "The bridge must be able to connect to the target IRC network (typically port 6667 or 6697 for TLS).",
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
      defaultValue: 9999,
      section: "Network",
    },
    {
      key: "irc_server",
      label: "IRC Server Hostname",
      description: "Hostname of the IRC server to connect to (e.g., irc.libera.chat).",
      type: "string",
      required: true,
      section: "IRC",
    },
    {
      key: "irc_port",
      label: "IRC Server Port",
      description: "Port of the IRC server (6667 for plain, 6697 for TLS).",
      type: "port",
      required: true,
      defaultValue: 6697,
      section: "IRC",
    },
    {
      key: "irc_ssl",
      label: "Use TLS/SSL",
      description: "Connect to the IRC server using TLS encryption.",
      type: "boolean",
      required: false,
      defaultValue: true,
      section: "IRC",
    },
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/healthz",
  riskNotes: [
    "IRC networks may ban bridge connections if too many clients connect from the same IP.",
    "Some IRC networks require registration with NickServ before joining channels.",
    "IRC does not support message editing or reactions; these are bridged as text.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Supports connecting to multiple IRC networks from a single bridge instance.",
    "Requires a PostgreSQL or NeDB database for bridge state.",
  ],
  documentationUrl: "https://matrix-appservice-irc.readthedocs.io/",
  sourceUrl: "https://github.com/matrix-org/matrix-appservice-irc",
  dockerImage: "matrixdotorg/matrix-appservice-irc:latest",
  defaultPort: 9999,
  defaultVersion: "latest",
  tags: ["bridge", "irc", "messaging", "matrix-org", "relay", "libera", "freenode"],
};
