import type { CatalogEntry } from "../../types";

export const gmessagesBridge: CatalogEntry = {
  id: "mautrix-gmessages",
  name: "Google Messages Bridge",
  type: "bridge",
  description: "Bridge Google Messages (RCS/SMS) to Matrix rooms using mautrix-gmessages.",
  longDescription:
    "mautrix-gmessages is a Matrix-Google Messages puppeting bridge. It connects via the Google Messages " +
    "web pairing protocol and bridges SMS, MMS, and RCS messages to Matrix. " +
    "Requires QR code pairing with an Android phone running Google Messages. " +
    "Runs as an external Application Service registered with Synapse.",
  icon: "Smartphone",
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
      id: "android_phone",
      label: "Android Phone with Google Messages",
      description: "An Android phone with Google Messages installed is required for QR code pairing.",
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
      defaultValue: 29336,
      section: "Network",
    },
  ],
  healthcheckStrategy: "http",
  healthcheckEndpoint: "/_matrix/mau/live",
  riskNotes: [
    "Google may disconnect the web pairing session; re-pairing may be needed.",
    "RCS features depend on carrier support and Google Messages version.",
    "Only one web pairing session per phone number is supported.",
  ],
  compatibilityNotes: [
    "Requires Synapse with Application Service support enabled.",
    "Works with Synapse 1.70+.",
    "Requires an Android phone with Google Messages as the default SMS app.",
  ],
  documentationUrl: "https://docs.mau.fi/bridges/go/gmessages/",
  sourceUrl: "https://github.com/mautrix/gmessages",
  dockerImage: "dock.mau.dev/mautrix/gmessages:latest",
  defaultPort: 29336,
  defaultVersion: "latest",
  tags: ["bridge", "google-messages", "sms", "rcs", "mautrix", "puppeting", "android"],
};
