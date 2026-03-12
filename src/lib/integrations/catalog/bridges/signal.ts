import type { CatalogEntry } from "../../types";

export const signalBridge: CatalogEntry = {
  id: "mautrix-signal",
  name: "Signal Bridge",
  type: "bridge",
  description: "Bridge Signal conversations to Matrix rooms using mautrix-signal.",
  longDescription:
    "mautrix-signal is a Matrix-Signal puppeting bridge. It connects to Signal via signald or the built-in " +
    "Signal client and bridges messages, media, reactions, and read receipts. " +
    "Requires linking as a secondary device for each Signal account. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "Shield",
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
      defaultValue: 29328,
      section: "Network",
    },
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/_matrix/mau/live",
  riskNotes: [
    "Signal may restrict accounts using unofficial clients.",
    "Bridge requires re-linking if the Signal session expires.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/go/signal/",
  sourceUrl: "https://github.com/mautrix/signal",
  dockerImage: "dock.mau.dev/mautrix/signal:latest",
  defaultPort: 29328,
  defaultVersion: "latest",
  tags: ["bridge", "signal", "messaging", "mautrix", "puppeting"],
};
