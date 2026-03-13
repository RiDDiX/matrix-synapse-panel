import type { CatalogEntry } from "../../types";

export const googlechatBridge: CatalogEntry = {
  id: "mautrix-googlechat",
  name: "Google Chat Bridge",
  type: "bridge",
  description: "Bridge Google Chat conversations to Matrix rooms using mautrix-googlechat.",
  longDescription:
    "mautrix-googlechat is a Matrix-Google Chat puppeting bridge. It connects to Google Chat " +
    "via the Google API and bridges messages, reactions, threads, and media between Google Chat spaces " +
    "and Matrix rooms. Supports both personal Google accounts and Google Workspace accounts. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "MessageSquare",
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
      id: "google_account",
      label: "Google Account",
      description: "A Google account with Google Chat access is required for authentication.",
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
      defaultValue: 29320,
      section: "Network",
    },
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/_matrix/mau/live",
  riskNotes: [
    "Google may restrict API access for accounts exhibiting unusual activity.",
    "Authentication tokens may expire and require periodic re-authentication.",
    "Google Workspace admin policies may block third-party integrations.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Requires Python 3.10+ runtime in the container.",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/python/googlechat/",
  sourceUrl: "https://github.com/mautrix/googlechat",
  dockerImage: "dock.mau.dev/mautrix/googlechat:latest",
  defaultPort: 29320,
  defaultVersion: "latest",
  tags: ["bridge", "google-chat", "workspace", "mautrix", "puppeting", "google"],
};
