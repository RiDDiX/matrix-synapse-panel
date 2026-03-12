export interface SynapseRegistrationToken {
  token: string;
  uses_allowed: number | null;
  pending: number;
  completed: number;
  expiry_time: number | null;
}

export interface TokenWithMeta extends SynapseRegistrationToken {
  label?: string | null;
  note?: string | null;
}

export type TokenStatus = "valid" | "expired" | "exhausted" | "disabled";

export function getTokenStatus(token: SynapseRegistrationToken): TokenStatus {
  if (token.uses_allowed === 0) return "disabled";
  if (token.expiry_time && token.expiry_time < Date.now()) return "expired";
  if (token.uses_allowed !== null && token.completed >= token.uses_allowed) return "exhausted";
  return "valid";
}

export interface SynapseError {
  errcode: string;
  error: string;
}

export interface RegistrationRequest {
  username: string;
  password: string;
  displayName?: string;
  token: string;
}

export interface UiaFlow {
  stages: string[];
}

export interface UiaResponse {
  flows?: UiaFlow[];
  params?: Record<string, unknown>;
  session?: string;
  completed?: string[];
}

export interface RegistrationResult {
  success: boolean;
  userId?: string;
  error?: string;
  errorCode?: string;
}

export interface DiagnosticsResult {
  synapseReachable: boolean;
  adminApiReachable: boolean;
  tokenEndpointsAvailable: boolean;
  registrationFlowAvailable: boolean;
  serverName: string | null;
  registrationEnabled: boolean | null;
  tokenRegistrationSupported: boolean;
  msc3861Detected: boolean;
  errors: string[];
}

export interface DashboardStats {
  totalTokens: number;
  validTokens: number;
  expiredTokens: number;
  exhaustedTokens: number;
  disabledTokens: number;
  recentRegistrations: number;
}

export type AuditAction =
  | "token.created"
  | "token.updated"
  | "token.disabled"
  | "token.deleted"
  | "registration.attempt"
  | "registration.success"
  | "registration.failure"
  | "admin.login"
  | "admin.logout"
  | "branding.updated"
  | "branding.published"
  | "branding.reset"
  | "branding.asset.uploaded"
  | "branding.asset.deleted"
  | "branding.created"
  | "branding.deleted";
