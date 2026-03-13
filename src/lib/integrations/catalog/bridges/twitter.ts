import type { CatalogEntry } from "../../types";

export const twitterBridge: CatalogEntry = {
  id: "mautrix-twitter",
  name: "Twitter/X Bridge",
  type: "bridge",
  description: "Bridge Twitter/X Direct Messages to Matrix rooms using mautrix-twitter.",
  longDescription:
    "mautrix-twitter is a Matrix-Twitter puppeting bridge. It connects to Twitter (now X) " +
    "and bridges Direct Messages, group conversations, reactions, and media to Matrix rooms. " +
    "Requires Twitter account authentication via cookies. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "AtSign",
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
      id: "twitter_internet",
      label: "Internet Access",
      description: "The bridge needs internet access to connect to Twitter/X servers.",
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
      defaultValue: 29327,
      section: "Network",
    },
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/_matrix/mau/live",
  riskNotes: [
    "Twitter/X may suspend accounts using unofficial API access.",
    "Cookie-based authentication expires periodically and requires re-login.",
    "Twitter/X API changes may break bridge functionality without notice.",
    "Only Direct Messages are bridged; public tweets and timelines are not supported.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Requires Python 3.10+ runtime in the container.",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/python/twitter/",
  sourceUrl: "https://github.com/mautrix/twitter",
  dockerImage: "dock.mau.dev/mautrix/twitter:latest",
  defaultPort: 29327,
  defaultVersion: "latest",
  tags: ["bridge", "twitter", "x", "messaging", "mautrix", "puppeting", "social"],
};
