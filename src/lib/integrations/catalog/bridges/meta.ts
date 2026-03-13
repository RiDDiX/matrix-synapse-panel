import type { CatalogEntry } from "../../types";

export const metaBridge: CatalogEntry = {
  id: "mautrix-meta",
  name: "Meta Bridge (Facebook & Instagram)",
  type: "bridge",
  description: "Bridge Facebook Messenger and Instagram DMs to Matrix rooms using mautrix-meta.",
  longDescription:
    "mautrix-meta is a unified Matrix bridge for Meta platforms. It connects to Facebook Messenger " +
    "and Instagram Direct via the Meta API and bridges messages, reactions, media, read receipts, and typing notifications. " +
    "Replaces the older mautrix-facebook and mautrix-instagram bridges. " +
    "Supports both Messenger and Instagram modes in a single deployment. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "Facebook",
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
      id: "meta_internet",
      label: "Internet Access",
      description: "The bridge needs internet access to connect to Meta's servers.",
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
      defaultValue: 29319,
      section: "Network",
    },
    {
      key: "meta_mode",
      label: "Meta Platform Mode",
      description: "Which Meta platform to bridge.",
      type: "select",
      required: true,
      defaultValue: "facebook",
      options: [
        { label: "Facebook Messenger", value: "facebook" },
        { label: "Instagram Direct", value: "instagram" },
      ],
      section: "Platform",
    },
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/_matrix/mau/live",
  riskNotes: [
    "Meta may ban or restrict accounts using unofficial API access.",
    "Cookie-based authentication may expire and require re-login.",
    "Facebook/Instagram terms of service prohibit automated access; use at your own risk.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Replaces the older mautrix-facebook and mautrix-instagram bridges.",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/go/meta/",
  sourceUrl: "https://github.com/mautrix/meta",
  dockerImage: "dock.mau.dev/mautrix/meta:latest",
  defaultPort: 29319,
  defaultVersion: "latest",
  tags: ["bridge", "facebook", "instagram", "messenger", "meta", "mautrix", "puppeting", "social"],
};
