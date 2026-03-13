import type {
  SynapseRegistrationToken,
  SynapseError,
  UiaResponse,
  RegistrationResult,
  DiagnosticsResult,
} from "./types";
import {
  ADMIN_REGISTRATION_TOKENS,
  ADMIN_REGISTRATION_TOKENS_NEW,
  adminRegistrationToken,
  adminUserEndpoint,
  adminUserLogin,
  ADMIN_USERS,
  adminDeactivateUser,
  ADMIN_ROOMS,
  adminJoinRoom,
  adminRoomMembers,
  adminLeaveRoom,
  CLIENT_VERSIONS,
  CLIENT_REGISTER,
  CLIENT_WHOAMI,
  CLIENT_LOGIN,
  clientTokenValidity,
  buildUrl,
  classifyFailure,
} from "./synapse-endpoints";

export interface SynapseConnection {
  internalUrl: string;
  adminToken: string;
}

function getDefaultConnection(): SynapseConnection {
  return {
    internalUrl: process.env.SYNAPSE_INTERNAL_URL ?? "http://localhost:8008",
    adminToken: process.env.SYNAPSE_ADMIN_ACCESS_TOKEN ?? "",
  };
}

function adminHeaders(conn: SynapseConnection): HeadersInit {
  if (!conn.adminToken) throw new Error("Admin token is not configured for this server");
  return {
    Authorization: `Bearer ${conn.adminToken}`,
    "Content-Type": "application/json",
  };
}

async function synapseRequest<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, { ...init, cache: "no-store" });

  if (!res.ok) {
    let body: SynapseError | null = null;
    try {
      body = (await res.json()) as SynapseError;
    } catch {
      // non-JSON error
    }
    throw new SynapseApiError(
      res.status,
      body?.errcode ?? "M_UNKNOWN",
      body?.error ?? `Synapse returned ${res.status}`
    );
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export class SynapseApiError extends Error {
  constructor(
    public status: number,
    public errcode: string,
    public override message: string
  ) {
    super(message);
    this.name = "SynapseApiError";
  }
}

// --- Token management (Admin API) ---

export async function listTokens(conn?: SynapseConnection): Promise<SynapseRegistrationToken[]> {
  const c = conn ?? getDefaultConnection();
  const data = await synapseRequest<{ registration_tokens: SynapseRegistrationToken[] }>(
    c.internalUrl,
    ADMIN_REGISTRATION_TOKENS,
    { method: "GET", headers: adminHeaders(c) }
  );
  return data.registration_tokens;
}

export async function getToken(token: string, conn?: SynapseConnection): Promise<SynapseRegistrationToken> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<SynapseRegistrationToken>(
    c.internalUrl,
    adminRegistrationToken(token),
    { method: "GET", headers: adminHeaders(c) }
  );
}

export async function createToken(params: {
  token?: string;
  uses_allowed?: number | null;
  expiry_time?: number | null;
  length?: number;
}, conn?: SynapseConnection): Promise<SynapseRegistrationToken> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<SynapseRegistrationToken>(
    c.internalUrl,
    ADMIN_REGISTRATION_TOKENS_NEW,
    {
      method: "POST",
      headers: adminHeaders(c),
      body: JSON.stringify(params),
    }
  );
}

export async function updateToken(
  token: string,
  params: { uses_allowed?: number | null; expiry_time?: number | null },
  conn?: SynapseConnection
): Promise<SynapseRegistrationToken> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<SynapseRegistrationToken>(
    c.internalUrl,
    adminRegistrationToken(token),
    {
      method: "PUT",
      headers: adminHeaders(c),
      body: JSON.stringify(params),
    }
  );
}

export async function deleteToken(token: string, conn?: SynapseConnection): Promise<void> {
  const c = conn ?? getDefaultConnection();
  await synapseRequest<Record<string, never>>(
    c.internalUrl,
    adminRegistrationToken(token),
    { method: "DELETE", headers: adminHeaders(c) }
  );
}

// --- Token validation (public, no admin token) ---

export async function validateToken(token: string, conn?: SynapseConnection): Promise<boolean> {
  const c = conn ?? getDefaultConnection();
  const url = buildUrl(c.internalUrl, clientTokenValidity(token));
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { valid: boolean };
  return data.valid === true;
}

// --- Registration (public, multi-stage UIA) ---

export async function registerUser(
  username: string,
  password: string,
  token: string,
  displayName?: string,
  conn?: SynapseConnection
): Promise<RegistrationResult> {
  const c = conn ?? getDefaultConnection();
  const baseUrl = c.internalUrl;
  const registerUrl = `${baseUrl}/_matrix/client/v3/register`;

  // Step 1: Initiate registration to get session and required flows
  const initRes = await fetch(registerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  if (initRes.status === 200) {
    // Unlikely but handle direct success
    const data = (await initRes.json()) as { user_id: string };
    return { success: true, userId: data.user_id };
  }

  if (initRes.status !== 401) {
    const err = await parseErrorResponse(initRes);
    return { success: false, error: err.message, errorCode: err.errcode };
  }

  const uia = (await initRes.json()) as UiaResponse;
  const session = uia.session;

  if (!session) {
    return { success: false, error: "Server did not return a UIA session", errorCode: "NO_SESSION" };
  }

  // Determine required stages
  const flows = uia.flows ?? [];
  const tokenFlow = flows.find((f) =>
    f.stages.includes("m.login.registration_token")
  );

  if (!tokenFlow) {
    // Check if MSC3861 or delegated auth might be in play
    const hasOidc = flows.some((f) =>
      f.stages.some((s) => s.includes("org.matrix.msc3861") || s.includes("m.login.sso"))
    );
    if (hasOidc) {
      return {
        success: false,
        error: "This homeserver uses delegated authentication (MSC3861/OIDC). Token-based registration is not compatible with this mode.",
        errorCode: "MSC3861_INCOMPATIBLE",
      };
    }
    return {
      success: false,
      error: "Token-based registration is not available on this homeserver. Ensure registration_requires_token is enabled in Synapse config.",
      errorCode: "TOKEN_FLOW_UNAVAILABLE",
    };
  }

  // Step 2: Complete each required stage
  const completedStages: string[] = uia.completed ?? [];
  const remainingStages = tokenFlow.stages.filter((s) => !completedStages.includes(s));

  let lastResponse: Response | null = null;

  for (const stage of remainingStages) {
    const auth = buildAuthForStage(stage, session, token);
    if (!auth) {
      return {
        success: false,
        error: `Unsupported registration stage: ${stage}`,
        errorCode: "UNSUPPORTED_STAGE",
      };
    }

    const body: Record<string, unknown> = {
      auth,
      username,
      password,
    };

    if (displayName) {
      body.initial_device_display_name = displayName;
    }

    lastResponse = await fetch(registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (lastResponse.status === 200) {
      const data = (await lastResponse.json()) as { user_id: string };
      return { success: true, userId: data.user_id };
    }

    if (lastResponse.status !== 401) {
      const err = await parseErrorResponse(lastResponse);
      return { success: false, error: err.message, errorCode: err.errcode };
    }
  }

  // If we exhausted stages and still got 401
  if (lastResponse && lastResponse.status === 401) {
    const remaining = (await lastResponse.json()) as UiaResponse;
    const leftStages = (remaining.flows?.[0]?.stages ?? []).filter(
      (s) => !(remaining.completed ?? []).includes(s)
    );
    if (leftStages.length > 0) {
      return {
        success: false,
        error: `Additional registration stages required: ${leftStages.join(", ")}. This portal does not yet support these stages.`,
        errorCode: "ADDITIONAL_STAGES_REQUIRED",
      };
    }
  }

  return { success: false, error: "Registration failed unexpectedly", errorCode: "UNKNOWN" };
}

function buildAuthForStage(
  stage: string,
  session: string,
  token: string
): Record<string, unknown> | null {
  switch (stage) {
    case "m.login.registration_token":
      return { type: "m.login.registration_token", token, session };
    case "m.login.dummy":
      return { type: "m.login.dummy", session };
    case "m.login.terms":
      return { type: "m.login.terms", session };
    default:
      return null;
  }
}

async function parseErrorResponse(res: Response): Promise<{ errcode: string; message: string }> {
  try {
    const body = (await res.json()) as SynapseError;
    return { errcode: body.errcode ?? "M_UNKNOWN", message: mapSynapseError(body) };
  } catch {
    return { errcode: "M_UNKNOWN", message: `Unexpected error (HTTP ${res.status})` };
  }
}

function mapSynapseError(err: SynapseError): string {
  switch (err.errcode) {
    case "M_USER_IN_USE":
      return "This username is already taken.";
    case "M_INVALID_USERNAME":
      return "The username contains invalid characters.";
    case "M_EXCLUSIVE":
      return "This username is reserved by the server.";
    case "M_WEAK_PASSWORD":
      return err.error || "The password is too weak. Please choose a stronger password.";
    case "M_FORBIDDEN":
      return "Registration is not permitted.";
    case "M_LIMIT_EXCEEDED":
      return "Too many requests. Please try again later.";
    case "M_UNKNOWN_TOKEN":
    case "M_UNAUTHORIZED":
      return "The invitation code is invalid or has expired.";
    default:
      return err.error || "An unexpected error occurred.";
  }
}

// --- Bot user provisioning (Admin API) ---

export interface SynapseUserInfo {
  name: string;
  displayname?: string;
  admin?: boolean;
  deactivated?: boolean;
}

/**
 * Create or ensure a Synapse user exists via PUT /_synapse/admin/v2/users/{userId}.
 * If the user already exists, it updates the display name only.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#create-or-modify-account
 */
export async function ensureBotUser(
  userId: string,
  displayName: string,
  conn?: SynapseConnection
): Promise<SynapseUserInfo> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<SynapseUserInfo>(
    c.internalUrl,
    adminUserEndpoint(userId),
    {
      method: "PUT",
      headers: adminHeaders(c),
      body: JSON.stringify({
        displayname: displayName,
        admin: false,
        deactivated: false,
      }),
    }
  );
}

/**
 * Get an access token for a user via POST /_synapse/admin/v1/users/{userId}/login.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#login-as-a-user
 */
export async function loginAsUser(
  userId: string,
  conn?: SynapseConnection
): Promise<string> {
  const c = conn ?? getDefaultConnection();
  const data = await synapseRequest<{ access_token: string }>(
    c.internalUrl,
    adminUserLogin(userId),
    {
      method: "POST",
      headers: adminHeaders(c),
      body: JSON.stringify({}),
    }
  );
  return data.access_token;
}

// --- Room listing (Admin API) ---

export interface SynapseRoom {
  room_id: string;
  name: string | null;
  canonical_alias: string | null;
  joined_members: number;
  topic: string | null;
  avatar: string | null;
  join_rules: string | null;
  guest_access: string | null;
  room_type: string | null;
}

/**
 * List rooms from Synapse via GET /_synapse/admin/v1/rooms.
 * Supports pagination and search.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/rooms.html
 */
export async function listRooms(
  params: { limit?: number; from?: number; search_term?: string; order_by?: string; dir?: string } = {},
  conn?: SynapseConnection
): Promise<{ rooms: SynapseRoom[]; total_rooms: number; next_batch?: number }> {
  const c = conn ?? getDefaultConnection();
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.from !== undefined) query.set("from", String(params.from));
  if (params.search_term) query.set("search_term", params.search_term);
  if (params.order_by) query.set("order_by", params.order_by);
  if (params.dir) query.set("dir", params.dir);

  const qs = query.toString();
  const path = qs ? `${ADMIN_ROOMS}?${qs}` : ADMIN_ROOMS;

  return synapseRequest<{ rooms: SynapseRoom[]; total_rooms: number; next_batch?: number }>(
    c.internalUrl,
    path,
    { method: "GET", headers: adminHeaders(c) }
  );
}

// --- Room membership management (Admin API) ---

/**
 * Force-join a user to a room via POST /_synapse/admin/v1/join/{roomIdOrAlias}.
 * Uses the admin token, not the bot's own token.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/room_membership.html
 */
export async function joinRoomAsUser(
  roomIdOrAlias: string,
  userId: string,
  conn?: SynapseConnection
): Promise<{ room_id: string }> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<{ room_id: string }>(
    c.internalUrl,
    adminJoinRoom(roomIdOrAlias),
    {
      method: "POST",
      headers: adminHeaders(c),
      body: JSON.stringify({ user_id: userId }),
    }
  );
}

/**
 * Make a user leave a room via POST /_synapse/admin/v1/leave/{roomIdOrAlias}.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/room_membership.html
 */
export async function leaveRoomAsUser(
  roomIdOrAlias: string,
  userId: string,
  conn?: SynapseConnection
): Promise<void> {
  const c = conn ?? getDefaultConnection();
  await synapseRequest<Record<string, unknown>>(
    c.internalUrl,
    adminLeaveRoom(roomIdOrAlias),
    {
      method: "POST",
      headers: adminHeaders(c),
      body: JSON.stringify({ user_id: userId }),
    }
  );
}

/**
 * Get members of a room via GET /_synapse/admin/v1/rooms/{roomId}/members.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/rooms.html#room-members-api
 */
export async function getRoomMembers(
  roomId: string,
  conn?: SynapseConnection
): Promise<{ members: string[]; total: number }> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<{ members: string[]; total: number }>(
    c.internalUrl,
    adminRoomMembers(roomId),
    { method: "GET", headers: adminHeaders(c) }
  );
}

/**
 * Check if a specific user is a member of a room.
 */
export async function isUserInRoom(
  roomId: string,
  userId: string,
  conn?: SynapseConnection
): Promise<boolean> {
  try {
    const data = await getRoomMembers(roomId, conn);
    return data.members.includes(userId);
  } catch {
    return false;
  }
}

/**
 * Verify a bot's access token by calling GET /_matrix/client/v3/account/whoami.
 * Uses the bot's own token, not the admin token.
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3accountwhoami
 */
export async function whoami(
  botAccessToken: string,
  baseUrl: string
): Promise<{ user_id: string; device_id?: string } | null> {
  try {
    const res = await fetch(buildUrl(baseUrl, CLIENT_WHOAMI), {
      headers: {
        Authorization: `Bearer ${botAccessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// --- Diagnostics ---

export async function runDiagnostics(conn?: SynapseConnection, serverName?: string): Promise<DiagnosticsResult> {
  const c = conn ?? getDefaultConnection();
  const baseUrl = c.internalUrl;

  const result: DiagnosticsResult = {
    synapseReachable: false,
    adminApiReachable: false,
    tokenEndpointsAvailable: false,
    registrationFlowAvailable: false,
    serverName: serverName ?? process.env.SYNAPSE_SERVER_NAME ?? null,
    registrationEnabled: null,
    tokenRegistrationSupported: false,
    msc3861Detected: false,
    adminApiBaseUrl: baseUrl,
    adminApiFailureClass: null,
    loginFlowsAvailable: false,
    passwordLoginAvailable: false,
    loginFlows: [],
    roomApiAvailable: false,
    adminVerificationPossible: false,
    threadSupportAvailable: false,
    errors: [],
  };

  // 1. Check basic reachability via Client-Server API
  try {
    const versionRes = await fetch(buildUrl(baseUrl, CLIENT_VERSIONS), { cache: "no-store" });
    result.synapseReachable = versionRes.ok;
    if (!versionRes.ok) {
      result.errors.push(`Synapse version endpoint returned ${versionRes.status}`);
    }
  } catch (e) {
    result.errors.push(`Cannot reach Synapse at ${baseUrl}: ${e instanceof Error ? e.message : "unknown error"}`);
    return result;
  }

  // 2. Check admin API reachability (registration token list endpoint)
  try {
    const adminUrl = buildUrl(baseUrl, ADMIN_REGISTRATION_TOKENS);
    const tokensRes = await fetch(adminUrl, {
      headers: adminHeaders(c),
      cache: "no-store",
    });

    if (tokensRes.ok) {
      result.adminApiReachable = true;
      result.tokenEndpointsAvailable = true;
    } else {
      const body = await tokensRes.text();
      const classification = classifyFailure(tokensRes.status, body);
      result.adminApiFailureClass = classification.failureClass;

      // Admin API is "reachable" if Synapse itself responded (not a proxy intercept)
      result.adminApiReachable = classification.failureClass !== "proxy_not_forwarded" &&
        classification.failureClass !== "network_error";
      result.tokenEndpointsAvailable = false;

      result.errors.push(
        `Admin API check failed (${ADMIN_REGISTRATION_TOKENS} via ${baseUrl}): ${classification.message}`
      );
    }
  } catch (e) {
    result.adminApiFailureClass = "network_error";
    result.errors.push(
      `Admin API unreachable at ${baseUrl}: ${e instanceof Error ? e.message : "unknown error"}. ` +
      "Verify the Internal URL is correct and the Synapse process is running."
    );
  }

  // 3. Check registration flow (Client-Server API)
  try {
    const regRes = await fetch(buildUrl(baseUrl, CLIENT_REGISTER), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (regRes.status === 401) {
      // 401 from /register is expected — Synapse returns UIA challenge
      let uia: UiaResponse;
      try {
        uia = (await regRes.json()) as UiaResponse;
      } catch {
        result.errors.push("Registration endpoint returned 401 but the response was not valid JSON (UIA).");
        return result;
      }

      const flows = uia.flows ?? [];
      result.registrationFlowAvailable = flows.length > 0;
      result.registrationEnabled = true;

      result.tokenRegistrationSupported = flows.some((f) =>
        f.stages.includes("m.login.registration_token")
      );

      result.msc3861Detected = flows.some((f) =>
        f.stages.some((s) => s.includes("org.matrix.msc3861"))
      );

      if (result.msc3861Detected) {
        result.errors.push(
          "MSC3861 (delegated auth) detected. Token-based registration via this portal is incompatible with this mode."
        );
      }

      if (!result.tokenRegistrationSupported) {
        result.errors.push(
          "m.login.registration_token stage not found in registration flows. Enable registration_requires_token in Synapse config."
        );
      }
    } else if (regRes.status === 403) {
      result.registrationEnabled = false;
      result.errors.push("Registration appears to be disabled on this homeserver.");
    } else {
      result.errors.push(`Unexpected registration endpoint response: ${regRes.status}`);
    }
  } catch (e) {
    result.errors.push(`Registration flow check failed: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  // 4. Check login flows availability (Client-Server API)
  try {
    const loginRes = await fetch(buildUrl(baseUrl, CLIENT_LOGIN), { cache: "no-store" });
    if (loginRes.ok) {
      const loginData = await loginRes.json() as { flows?: Array<{ type: string }> };
      const flows = loginData.flows ?? [];
      result.loginFlowsAvailable = flows.length > 0;
      result.loginFlows = flows.map((f) => f.type);
      result.passwordLoginAvailable = flows.some((f) => f.type === "m.login.password");
    } else {
      result.errors.push(`Login flows endpoint returned ${loginRes.status}`);
    }
  } catch (e) {
    result.errors.push(`Login flows check failed: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  // 5. Check room API availability (Admin API room list)
  try {
    const roomsUrl = buildUrl(baseUrl, `${ADMIN_ROOMS}?limit=1`);
    const roomsRes = await fetch(roomsUrl, {
      headers: adminHeaders(c),
      cache: "no-store",
    });
    result.roomApiAvailable = roomsRes.ok;
    if (!roomsRes.ok) {
      result.errors.push(`Room API check failed: ${roomsRes.status}`);
    }
  } catch (e) {
    result.errors.push(`Room API check failed: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  // 6. Check admin verification (can we query a user via Admin API)
  try {
    const adminCheckUrl = buildUrl(baseUrl, ADMIN_USERS + "?limit=1");
    const adminCheckRes = await fetch(adminCheckUrl, {
      headers: adminHeaders(c),
      cache: "no-store",
    });
    result.adminVerificationPossible = adminCheckRes.ok;
    if (!adminCheckRes.ok) {
      result.errors.push(`Admin user verification endpoint returned ${adminCheckRes.status}`);
    }
  } catch (e) {
    result.errors.push(`Admin verification check failed: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  // 7. Check thread support (via server versions — threading is stable since Matrix v1.4)
  try {
    const versionsRes = await fetch(buildUrl(baseUrl, CLIENT_VERSIONS), { cache: "no-store" });
    if (versionsRes.ok) {
      const versionsData = await versionsRes.json() as { versions?: string[] };
      const versions = versionsData.versions ?? [];
      // Threading is stable since v1.4. Check if any v1.4+ version is present.
      result.threadSupportAvailable = versions.some((v) => {
        const match = v.match(/^v(\d+)\.(\d+)$/);
        if (!match || !match[1] || !match[2]) return false;
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        return major > 1 || (major === 1 && minor >= 4);
      });
      if (!result.threadSupportAvailable) {
        result.errors.push("Thread support requires Matrix v1.4+. Server versions: " + versions.join(", "));
      }
    }
  } catch {
    // Version check already done in step 1, not critical for thread check
  }

  return result;
}

// --- User management (Admin API) ---

export interface SynapseUserListEntry {
  name: string;
  displayname: string | null;
  avatar_url: string | null;
  admin: boolean;
  deactivated: boolean;
  shadow_banned: boolean;
  creation_ts: number;
  last_seen_ts: number | null;
  locked: boolean;
}

/**
 * List users from Synapse via GET /_synapse/admin/v2/users.
 * Supports pagination, search, and filtering.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#list-accounts
 */
export async function listUsers(
  params: {
    from?: number;
    limit?: number;
    user_id?: string;
    name?: string;
    guests?: boolean;
    admins?: boolean;
    deactivated?: boolean;
    order_by?: string;
    dir?: "f" | "b";
  } = {},
  conn?: SynapseConnection
): Promise<{ users: SynapseUserListEntry[]; total: number; next_token?: number }> {
  const c = conn ?? getDefaultConnection();
  const query = new URLSearchParams();
  if (params.from !== undefined) query.set("from", String(params.from));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.user_id) query.set("user_id", params.user_id);
  if (params.name) query.set("name", params.name);
  if (params.guests !== undefined) query.set("guests", String(params.guests));
  if (params.admins !== undefined) query.set("admins", String(params.admins));
  if (params.deactivated !== undefined) query.set("deactivated", String(params.deactivated));
  if (params.order_by) query.set("order_by", params.order_by);
  if (params.dir) query.set("dir", params.dir);

  const qs = query.toString();
  const path = qs ? `${ADMIN_USERS}?${qs}` : ADMIN_USERS;

  return synapseRequest<{ users: SynapseUserListEntry[]; total: number; next_token?: number }>(
    c.internalUrl,
    path,
    { method: "GET", headers: adminHeaders(c) }
  );
}

export interface SynapseUserDetail {
  name: string;
  displayname: string | null;
  avatar_url: string | null;
  admin: boolean;
  deactivated: boolean;
  shadow_banned: boolean;
  creation_ts: number;
  last_seen_ts: number | null;
  locked: boolean;
  consent_version: string | null;
  consent_server_notice_sent: string | null;
  appservice_id: string | null;
  user_type: string | null;
}

/**
 * Get a single user's details via GET /_synapse/admin/v2/users/{userId}.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#query-user-account
 */
export async function getUser(
  userId: string,
  conn?: SynapseConnection
): Promise<SynapseUserDetail> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<SynapseUserDetail>(
    c.internalUrl,
    adminUserEndpoint(userId),
    { method: "GET", headers: adminHeaders(c) }
  );
}

/**
 * Create a new user via PUT /_synapse/admin/v2/users/{userId}.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#create-or-modify-account
 */
export async function createUser(
  userId: string,
  params: {
    password: string;
    displayname?: string;
    admin?: boolean;
    locked?: boolean;
  },
  conn?: SynapseConnection
): Promise<SynapseUserDetail> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<SynapseUserDetail>(
    c.internalUrl,
    adminUserEndpoint(userId),
    {
      method: "PUT",
      headers: adminHeaders(c),
      body: JSON.stringify({
        password: params.password,
        displayname: params.displayname ?? "",
        admin: params.admin ?? false,
        locked: params.locked ?? false,
        deactivated: false,
      }),
    }
  );
}

/**
 * Modify an existing user via PUT /_synapse/admin/v2/users/{userId}.
 * Only sends the fields that need updating.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#create-or-modify-account
 */
export async function modifyUser(
  userId: string,
  params: {
    password?: string;
    displayname?: string;
    admin?: boolean;
    locked?: boolean;
    deactivated?: boolean;
  },
  conn?: SynapseConnection
): Promise<SynapseUserDetail> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<SynapseUserDetail>(
    c.internalUrl,
    adminUserEndpoint(userId),
    {
      method: "PUT",
      headers: adminHeaders(c),
      body: JSON.stringify(params),
    }
  );
}

/**
 * Deactivate a user via POST /_synapse/admin/v1/deactivate/{userId}.
 * Set erase=true to GDPR-erase all user data.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#deactivate-account
 */
export async function deactivateUser(
  userId: string,
  erase: boolean = false,
  conn?: SynapseConnection
): Promise<void> {
  const c = conn ?? getDefaultConnection();
  await synapseRequest<{ id_server_unbind_result: string }>(
    c.internalUrl,
    adminDeactivateUser(userId),
    {
      method: "POST",
      headers: adminHeaders(c),
      body: JSON.stringify({ erase }),
    }
  );
}

/**
 * Reactivate a deactivated user by setting deactivated=false via PUT /_synapse/admin/v2/users/{userId}.
 * A new password must be provided.
 * Ref: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#create-or-modify-account
 */
export async function reactivateUser(
  userId: string,
  password: string,
  conn?: SynapseConnection
): Promise<SynapseUserDetail> {
  const c = conn ?? getDefaultConnection();
  return synapseRequest<SynapseUserDetail>(
    c.internalUrl,
    adminUserEndpoint(userId),
    {
      method: "PUT",
      headers: adminHeaders(c),
      body: JSON.stringify({ deactivated: false, password }),
    }
  );
}
