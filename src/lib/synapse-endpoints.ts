/**
 * Official Synapse and Matrix API endpoint constants.
 *
 * Admin API: https://element-hq.github.io/synapse/latest/usage/administration/admin_api/
 * Client-Server API: https://spec.matrix.org/latest/client-server-api/
 *
 * Hard rule: all admin endpoints use SYNAPSE_INTERNAL_URL (direct Synapse access).
 * Public/client endpoints may use either internal or public URL as appropriate.
 */

// --- Synapse Admin API (requires admin token, use internalUrl only) ---

export const ADMIN_REGISTRATION_TOKENS = "/_synapse/admin/v1/registration_tokens";

export function adminRegistrationToken(token: string): string {
  return `/_synapse/admin/v1/registration_tokens/${encodeURIComponent(token)}`;
}

export const ADMIN_REGISTRATION_TOKENS_NEW = "/_synapse/admin/v1/registration_tokens/new";

// User management: https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html
export function adminUserEndpoint(userId: string): string {
  return `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`;
}

// Login as user (returns access_token): https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#login-as-a-user
export function adminUserLogin(userId: string): string {
  return `/_synapse/admin/v1/users/${encodeURIComponent(userId)}/login`;
}

// List rooms: https://element-hq.github.io/synapse/latest/admin_api/rooms.html
export const ADMIN_ROOMS = "/_synapse/admin/v1/rooms";

// Force-join a user to a room: https://element-hq.github.io/synapse/latest/admin_api/room_membership.html
export function adminJoinRoom(roomIdOrAlias: string): string {
  return `/_synapse/admin/v1/join/${encodeURIComponent(roomIdOrAlias)}`;
}

// Room members: https://element-hq.github.io/synapse/latest/admin_api/rooms.html#room-members-api
export function adminRoomMembers(roomId: string): string {
  return `/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}/members`;
}

// Make user leave room: https://element-hq.github.io/synapse/latest/admin_api/room_membership.html
export const ADMIN_ROOM_LEAVE = "/_synapse/admin/v1/leave";
export function adminLeaveRoom(roomIdOrAlias: string): string {
  return `/_synapse/admin/v1/leave/${encodeURIComponent(roomIdOrAlias)}`;
}

// --- Matrix Client-Server API (public) ---

export const CLIENT_VERSIONS = "/_matrix/client/versions";
export const CLIENT_REGISTER = "/_matrix/client/v3/register";
export const CLIENT_WHOAMI = "/_matrix/client/v3/account/whoami";

export function clientTokenValidity(token: string): string {
  return `/_matrix/client/v1/register/m.login.registration_token/validity?token=${encodeURIComponent(token)}`;
}

// --- Helpers ---

export function buildUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/**
 * Classify a failed HTTP response to determine the failure source.
 * Returns a structured classification useful for diagnostics.
 */
export type FailureClass =
  | "proxy_not_forwarded"
  | "synapse_unauthorized"
  | "synapse_forbidden"
  | "synapse_not_found"
  | "synapse_error"
  | "network_error"
  | "unknown";

export function classifyFailure(status: number, body: string): { failureClass: FailureClass; message: string } {
  const isHtml = body.trimStart().startsWith("<") || body.includes("<html");
  const isNginx = body.includes("nginx") || body.includes("openresty");

  if (status === 404 && isHtml && isNginx) {
    return {
      failureClass: "proxy_not_forwarded",
      message:
        "The request returned a 404 from a reverse proxy (nginx), not from Synapse. " +
        "This usually means the Internal URL points to a public reverse proxy that does not forward /_synapse/admin/* paths. " +
        "Set Internal URL to the direct Synapse address (e.g. http://synapse:8008).",
    };
  }

  if (status === 404 && isHtml) {
    return {
      failureClass: "proxy_not_forwarded",
      message:
        "The request returned an HTML 404 page, which indicates a reverse proxy or web server — not Synapse. " +
        "Verify the Internal URL points directly to the Synapse process.",
    };
  }

  if (status === 401) {
    return {
      failureClass: "synapse_unauthorized",
      message: "Synapse returned 401 Unauthorized. The admin token may be invalid, expired, or missing.",
    };
  }

  if (status === 403) {
    return {
      failureClass: "synapse_forbidden",
      message: "Synapse returned 403 Forbidden. The token user may not have admin privileges.",
    };
  }

  if (status === 404) {
    return {
      failureClass: "synapse_not_found",
      message:
        "Synapse returned 404. The endpoint may not exist on this Synapse version. " +
        "Ensure you are running a Synapse version that supports the registration token admin API.",
    };
  }

  if (status >= 500) {
    return {
      failureClass: "synapse_error",
      message: `Synapse returned a server error (${status}). Check Synapse logs for details.`,
    };
  }

  return {
    failureClass: "unknown",
    message: `Unexpected response (HTTP ${status}).`,
  };
}
