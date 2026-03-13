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
  CLIENT_VERSIONS,
  CLIENT_REGISTER,
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

  return result;
}
