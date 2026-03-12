export type IntegrationType = "bridge" | "bot" | "synapse_module" | "external_service";

export type IntegrationStatus =
  | "available"
  | "installing"
  | "installed"
  | "configured"
  | "enabled"
  | "running"
  | "degraded"
  | "failed"
  | "waiting_for_pairing"
  | "disabled"
  | "uninstalling";

export type DeploymentMode = "managed" | "guided";

export type MaturityLevel = "stable" | "beta" | "experimental" | "deprecated";

export type HealthcheckStrategy = "http" | "tcp" | "exec" | "none";

export type CapabilityMode = "managed" | "guided";

export interface SecretDefinition {
  key: string;
  label: string;
  description: string;
  required: boolean;
  sensitive: boolean;
  envVar?: string;
  defaultValue?: string;
}

export interface SynapseChangeDefinition {
  type: "appservice_registration" | "config_addition" | "module_install";
  description: string;
  automatable: boolean;
  generatable: boolean;
}

export interface InfraRequirement {
  id: string;
  label: string;
  description: string;
  checkCommand?: string;
  required: boolean;
}

export interface ConfigField {
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean" | "url" | "select" | "textarea" | "port";
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    patternMessage?: string;
  };
  section?: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
  type: IntegrationType;
  description: string;
  longDescription?: string;
  icon?: string;
  maturity: MaturityLevel;
  deploymentModes: DeploymentMode[];
  requiredSecrets: SecretDefinition[];
  requiredSynapseChanges: SynapseChangeDefinition[];
  infraRequirements: InfraRequirement[];
  configFields: ConfigField[];
  healthcheckStrategy: HealthcheckStrategy;
  healthcheckEndpoint?: string;
  riskNotes: string[];
  compatibilityNotes: string[];
  documentationUrl?: string;
  sourceUrl?: string;
  dockerImage?: string;
  defaultPort?: number;
  defaultVersion?: string;
  tags: string[];
}

export interface EnvironmentCapabilities {
  mode: CapabilityMode;
  dockerAvailable: boolean;
  dockerComposeAvailable: boolean;
  synapseConfigWritable: boolean;
  appserviceDirWritable: boolean;
  networkReachable: boolean;
  dataDir: string;
  reasons: string[];
}

export interface IntegrationHealthResult {
  ok: boolean;
  status: IntegrationStatus;
  detail?: string;
  responseTimeMs?: number;
  checkedAt: string;
}

export interface GeneratedFile {
  filename: string;
  content: string;
  description: string;
  targetPath?: string;
  type: "docker_compose" | "appservice_registration" | "config" | "env" | "instructions";
}

export interface InstallResult {
  success: boolean;
  mode: CapabilityMode;
  generatedFiles: GeneratedFile[];
  nextSteps: string[];
  error?: string;
}

export interface DiagnosticsSnapshot {
  synapseConnectivity: boolean;
  appserviceRegistrationOk: boolean;
  filesystemWritable: boolean;
  dockerAvailable: boolean;
  dockerComposeAvailable: boolean;
  capabilityMode: CapabilityMode;
  envVarsPresent: string[];
  envVarsMissing: string[];
  integrationHealth: Record<string, IntegrationHealthResult>;
  botHealth: Record<string, { ok: boolean; detail?: string }>;
  errors: string[];
  checkedAt: string;
}
