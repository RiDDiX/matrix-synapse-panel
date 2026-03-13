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
  adminApiBaseUrl: string | null;
  adminApiFailureClass: string | null;
  loginFlowsAvailable: boolean;
  passwordLoginAvailable: boolean;
  loginFlows: string[];
  roomApiAvailable: boolean;
  adminVerificationPossible: boolean;
  threadSupportAvailable: boolean;
  errors: string[];
}

export interface DashboardStats {
  totalTokens: number;
  validTokens: number;
  expiredTokens: number;
  exhaustedTokens: number;
  disabledTokens: number;
  recentRegistrations: number;
  totalUsers: number;
  totalBots: number;
  activeBots: number;
  totalIntegrations: number;
  activeIntegrations: number;
}

export type AuditAction =
  | "server.created"
  | "server.updated"
  | "server.enabled"
  | "server.disabled"
  | "server.deleted"
  | "server.default.changed"
  | "server.token.rotated"
  | "server.diagnostics.run"
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
  | "branding.deleted"
  | "integration.installed"
  | "integration.updated"
  | "integration.enabled"
  | "integration.disabled"
  | "integration.restarted"
  | "integration.upgraded"
  | "integration.uninstalled"
  | "integration.secret.rotated"
  | "integration.diagnostics.failure"
  | "bridge.paired"
  | "bridge.pairing.failed"
  | "bot.created"
  | "bot.updated"
  | "bot.activated"
  | "bot.deactivated"
  | "bot.deleted"
  | "bot.room.assigned"
  | "bot.room.unassigned"
  | "bot.feature.updated"
  | "user.created"
  | "user.modified"
  | "user.deactivated"
  | "user.reactivated"
  | "user.deleted"
  | "admin.matrix.login"
  | "admin.matrix.login.failed"
  | "admin.token.refreshed"
  | "room.created"
  | "room.message.sent"
  | "room.state.updated"
  | "room.member.invited"
  | "room.member.kicked"
  | "room.member.banned"
  | "room.member.unbanned"
  | "room.alias.set"
  | "room.alias.deleted"
  | "room.upgraded"
  | "room.joined"
  | "room.left"
  | "server.prep.generated"
  | "media.quarantined"
  | "media.unquarantined"
  | "media.deleted"
  | "media.protected"
  | "media.unprotected"
  | "media.bulk.deleted"
  | "federation.connection.reset"
  | "event_report.deleted"
  | "room.history.purged"
  | "background_updates.toggled"
  | "background_updates.job.started"
  | "user.ratelimit.set"
  | "user.ratelimit.deleted"
  | "export.generated"
  | "space.created"
  | "space.child.added"
  | "space.child.removed";
