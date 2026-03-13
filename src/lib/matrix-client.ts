/**
 * Matrix Client-Server API service layer.
 *
 * All functions in this module use the official Matrix Client-Server API
 * (https://spec.matrix.org/latest/client-server-api/).
 *
 * Room operations are performed as the authenticated Matrix identity,
 * NOT as a Synapse server admin. Power-level and permission rules apply.
 *
 * The Synapse Admin API is used only in synapse.ts for true server-admin operations.
 */

import {
  CLIENT_LOGIN,
  CLIENT_LOGIN_FLOWS,
  CLIENT_WHOAMI,
  CLIENT_CREATE_ROOM,
  CLIENT_JOINED_ROOMS,
  clientRoomMessages,
  clientSendEvent,
  clientSendStateEvent,
  clientGetStateEvent,
  clientRoomState,
  clientRoomMembers,
  clientJoinedMembers,
  clientJoinRoom,
  clientLeaveRoom,
  clientInviteUser,
  clientKickUser,
  clientBanUser,
  clientUnbanUser,
  clientRoomAlias,
  clientUpgradeRoom,
  clientGetEvent,
  clientRelations,
  buildUrl,
} from "./synapse-endpoints";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatrixClientConnection {
  baseUrl: string;
  accessToken: string;
}

export interface MatrixLoginFlow {
  type: string;
}

export interface MatrixLoginFlowsResponse {
  flows: MatrixLoginFlow[];
}

export interface MatrixLoginResult {
  user_id: string;
  access_token: string;
  device_id: string;
  home_server?: string;
}

export interface MatrixWhoamiResult {
  user_id: string;
  device_id?: string;
  is_guest?: boolean;
}

export interface MatrixRoomCreateParams {
  name?: string;
  topic?: string;
  room_alias_name?: string;
  visibility?: "public" | "private";
  preset?: "private_chat" | "public_chat" | "trusted_private_chat";
  invite?: string[];
  is_direct?: boolean;
  creation_content?: Record<string, unknown>;
  initial_state?: Array<{ type: string; state_key?: string; content: Record<string, unknown> }>;
  power_level_content_override?: Record<string, unknown>;
  room_version?: string;
}

export interface MatrixRoomCreateResult {
  room_id: string;
}

export interface MatrixStateEvent {
  type: string;
  state_key: string;
  content: Record<string, unknown>;
  sender: string;
  origin_server_ts: number;
  event_id: string;
}

export interface MatrixRoomEvent {
  type: string;
  content: Record<string, unknown>;
  sender: string;
  origin_server_ts: number;
  event_id: string;
  room_id?: string;
  unsigned?: Record<string, unknown>;
}

export interface MatrixMemberEvent {
  type: string;
  state_key: string;
  content: {
    membership: "join" | "invite" | "leave" | "ban" | "knock";
    displayname?: string;
    avatar_url?: string;
    reason?: string;
  };
  sender: string;
  origin_server_ts: number;
  event_id: string;
}

export interface MatrixMessagesResponse {
  start: string;
  end?: string;
  chunk: MatrixRoomEvent[];
  state?: MatrixStateEvent[];
}

export interface MatrixJoinedMembersResponse {
  joined: Record<string, { display_name?: string; avatar_url?: string }>;
}

export interface MatrixRelationsResponse {
  chunk: MatrixRoomEvent[];
  next_batch?: string;
  prev_batch?: string;
}

export class MatrixApiError extends Error {
  constructor(
    public status: number,
    public errcode: string,
    public override message: string
  ) {
    super(message);
    this.name = "MatrixApiError";
  }
}

// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------

function authHeaders(conn: MatrixClientConnection): HeadersInit {
  return {
    Authorization: `Bearer ${conn.accessToken}`,
    "Content-Type": "application/json",
  };
}

async function matrixRequest<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(baseUrl, path);
  const res = await fetch(url, { ...init, cache: "no-store" });

  if (!res.ok) {
    let body: { errcode?: string; error?: string } | null = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON error
    }
    throw new MatrixApiError(
      res.status,
      body?.errcode ?? "M_UNKNOWN",
      body?.error ?? `Matrix API returned ${res.status}`
    );
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Login & Identity
// ---------------------------------------------------------------------------

/**
 * Discover available login flows from a homeserver.
 * GET /_matrix/client/v3/login
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3login
 */
export async function getLoginFlows(baseUrl: string): Promise<MatrixLoginFlowsResponse> {
  return matrixRequest<MatrixLoginFlowsResponse>(baseUrl, CLIENT_LOGIN_FLOWS, {
    method: "GET",
  });
}

/**
 * Authenticate with a homeserver using password login.
 * POST /_matrix/client/v3/login
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3login
 *
 * This is the correct way to obtain an access token for admin operations.
 * There is no special admin-token-minting endpoint in Synapse.
 */
export async function loginWithPassword(
  baseUrl: string,
  userId: string,
  password: string,
  deviceDisplayName = "RiDDiX Matrix Control"
): Promise<MatrixLoginResult> {
  return matrixRequest<MatrixLoginResult>(baseUrl, CLIENT_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "m.login.password",
      identifier: { type: "m.id.user", user: userId },
      password,
      initial_device_display_name: deviceDisplayName,
    }),
  });
}

/**
 * Verify identity and check if the access token is valid.
 * GET /_matrix/client/v3/account/whoami
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3accountwhoami
 */
export async function matrixWhoami(conn: MatrixClientConnection): Promise<MatrixWhoamiResult> {
  return matrixRequest<MatrixWhoamiResult>(conn.baseUrl, CLIENT_WHOAMI, {
    method: "GET",
    headers: authHeaders(conn),
  });
}

// ---------------------------------------------------------------------------
// Room creation
// ---------------------------------------------------------------------------

/**
 * Create a new room.
 * POST /_matrix/client/v3/createRoom
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3createroom
 */
export async function createRoom(
  params: MatrixRoomCreateParams,
  conn: MatrixClientConnection
): Promise<MatrixRoomCreateResult> {
  return matrixRequest<MatrixRoomCreateResult>(conn.baseUrl, CLIENT_CREATE_ROOM, {
    method: "POST",
    headers: authHeaders(conn),
    body: JSON.stringify(params),
  });
}

// ---------------------------------------------------------------------------
// Room listing
// ---------------------------------------------------------------------------

/**
 * List rooms the authenticated user has joined.
 * GET /_matrix/client/v3/joined_rooms
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3joined_rooms
 */
export async function getJoinedRooms(conn: MatrixClientConnection): Promise<{ joined_rooms: string[] }> {
  return matrixRequest<{ joined_rooms: string[] }>(conn.baseUrl, CLIENT_JOINED_ROOMS, {
    method: "GET",
    headers: authHeaders(conn),
  });
}

// ---------------------------------------------------------------------------
// Room state
// ---------------------------------------------------------------------------

/**
 * Get full room state.
 * GET /_matrix/client/v3/rooms/{roomId}/state
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3roomsroomidstate
 */
export async function getRoomState(
  roomId: string,
  conn: MatrixClientConnection
): Promise<MatrixStateEvent[]> {
  return matrixRequest<MatrixStateEvent[]>(conn.baseUrl, clientRoomState(roomId), {
    method: "GET",
    headers: authHeaders(conn),
  });
}

/**
 * Get a specific state event.
 * GET /_matrix/client/v3/rooms/{roomId}/state/{eventType}/{stateKey}
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3roomsroomidstateeventtypestatekey
 */
export async function getStateEvent(
  roomId: string,
  eventType: string,
  stateKey: string,
  conn: MatrixClientConnection
): Promise<Record<string, unknown>> {
  return matrixRequest<Record<string, unknown>>(
    conn.baseUrl,
    clientGetStateEvent(roomId, eventType, stateKey),
    { method: "GET", headers: authHeaders(conn) }
  );
}

/**
 * Send a state event.
 * PUT /_matrix/client/v3/rooms/{roomId}/state/{eventType}/{stateKey}
 * Ref: https://spec.matrix.org/latest/client-server-api/#put_matrixclientv3roomsroomidstateeventtypestatekey
 */
export async function sendStateEvent(
  roomId: string,
  eventType: string,
  stateKey: string,
  content: Record<string, unknown>,
  conn: MatrixClientConnection
): Promise<{ event_id: string }> {
  return matrixRequest<{ event_id: string }>(
    conn.baseUrl,
    clientSendStateEvent(roomId, eventType, stateKey),
    {
      method: "PUT",
      headers: authHeaders(conn),
      body: JSON.stringify(content),
    }
  );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Get room messages (paginated).
 * GET /_matrix/client/v3/rooms/{roomId}/messages
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3roomsroomidmessages
 */
export async function getRoomMessages(
  roomId: string,
  params: {
    from?: string;
    to?: string;
    dir?: "b" | "f";
    limit?: number;
    filter?: string;
  },
  conn: MatrixClientConnection
): Promise<MatrixMessagesResponse> {
  const query = new URLSearchParams();
  if (params.dir) query.set("dir", params.dir);
  else query.set("dir", "b");
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.filter) query.set("filter", params.filter);

  const qs = query.toString();
  const path = qs ? `${clientRoomMessages(roomId)}?${qs}` : clientRoomMessages(roomId);

  return matrixRequest<MatrixMessagesResponse>(conn.baseUrl, path, {
    method: "GET",
    headers: authHeaders(conn),
  });
}

/**
 * Send a message event (e.g. m.room.message).
 * PUT /_matrix/client/v3/rooms/{roomId}/send/{eventType}/{txnId}
 * Ref: https://spec.matrix.org/latest/client-server-api/#put_matrixclientv3roomsroomidsendeventtypetxnid
 */
export async function sendMessage(
  roomId: string,
  content: Record<string, unknown>,
  conn: MatrixClientConnection,
  eventType = "m.room.message"
): Promise<{ event_id: string }> {
  const txnId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return matrixRequest<{ event_id: string }>(
    conn.baseUrl,
    clientSendEvent(roomId, eventType, txnId),
    {
      method: "PUT",
      headers: authHeaders(conn),
      body: JSON.stringify(content),
    }
  );
}

/**
 * Send a threaded reply using the official m.thread relation.
 *
 * Thread semantics per spec: https://spec.matrix.org/v1.11/client-server-api/#threading
 * A threaded reply includes m.relates_to with rel_type = "m.thread"
 * and a thread root event_id. Optionally includes an "m.in_reply_to"
 * for the specific message being replied to within the thread.
 *
 * There is NO "create empty thread" API. A thread begins when the first
 * reply references a root event with rel_type "m.thread".
 */
export async function sendThreadedReply(
  roomId: string,
  threadRootEventId: string,
  content: Record<string, unknown>,
  replyToEventId?: string,
  conn?: MatrixClientConnection
): Promise<{ event_id: string }> {
  if (!conn) throw new Error("MatrixClientConnection is required");

  const body: Record<string, unknown> = {
    ...content,
    "m.relates_to": {
      rel_type: "m.thread",
      event_id: threadRootEventId,
      is_falling_back: !replyToEventId,
      "m.in_reply_to": {
        event_id: replyToEventId ?? threadRootEventId,
      },
    },
  };

  return sendMessage(roomId, body, conn);
}

/**
 * Get a single event by ID.
 * GET /_matrix/client/v3/rooms/{roomId}/event/{eventId}
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3roomsroomideventeventid
 */
export async function getEvent(
  roomId: string,
  eventId: string,
  conn: MatrixClientConnection
): Promise<MatrixRoomEvent> {
  return matrixRequest<MatrixRoomEvent>(conn.baseUrl, clientGetEvent(roomId, eventId), {
    method: "GET",
    headers: authHeaders(conn),
  });
}

// ---------------------------------------------------------------------------
// Thread listing
// ---------------------------------------------------------------------------

/**
 * List thread roots in a room using the /messages endpoint with a thread filter.
 *
 * Per the Matrix spec, threads are NOT a separate API object. Thread roots
 * are discovered by filtering messages. The homeserver must support threading
 * (MSC3440, stable since Matrix v1.4).
 *
 * Ref: https://spec.matrix.org/v1.11/client-server-api/#threading
 *
 * The filter uses the "org.matrix.msc3856.threads" related_by_rel_types
 * to retrieve only events that are thread roots.
 */
export async function getThreadRoots(
  roomId: string,
  params: { from?: string; limit?: number } = {},
  conn: MatrixClientConnection
): Promise<MatrixMessagesResponse> {
  const filter = JSON.stringify({
    lazy_load_members: true,
    related_by_rel_types: ["m.thread"],
  });
  return getRoomMessages(roomId, {
    dir: "b",
    limit: params.limit ?? 50,
    from: params.from,
    filter,
  }, conn);
}

/**
 * Get replies in a thread using the relations API.
 * GET /_matrix/client/v1/rooms/{roomId}/relations/{eventId}/m.thread
 * Ref: https://spec.matrix.org/v1.11/client-server-api/#get_matrixclientv1roomsroomidrelationseventidreltype
 */
export async function getThreadReplies(
  roomId: string,
  threadRootEventId: string,
  params: { from?: string; limit?: number; dir?: "b" | "f" } = {},
  conn: MatrixClientConnection
): Promise<MatrixRelationsResponse> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.dir) query.set("dir", params.dir);

  const qs = query.toString();
  const basePath = clientRelations(roomId, threadRootEventId, "m.thread");
  const path = qs ? `${basePath}?${qs}` : basePath;

  return matrixRequest<MatrixRelationsResponse>(conn.baseUrl, path, {
    method: "GET",
    headers: authHeaders(conn),
  });
}

// ---------------------------------------------------------------------------
// Room membership
// ---------------------------------------------------------------------------

/**
 * Get room members via Client-Server API.
 * GET /_matrix/client/v3/rooms/{roomId}/members
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3roomsroomidmembers
 */
export async function getMembers(
  roomId: string,
  conn: MatrixClientConnection,
  membership?: "join" | "invite" | "leave" | "ban" | "knock"
): Promise<{ chunk: MatrixMemberEvent[] }> {
  const query = membership ? `?membership=${membership}` : "";
  return matrixRequest<{ chunk: MatrixMemberEvent[] }>(
    conn.baseUrl,
    `${clientRoomMembers(roomId)}${query}`,
    { method: "GET", headers: authHeaders(conn) }
  );
}

/**
 * Get joined members with display names/avatars.
 * GET /_matrix/client/v3/rooms/{roomId}/joined_members
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3roomsroomidjoined_members
 */
export async function getJoinedMembers(
  roomId: string,
  conn: MatrixClientConnection
): Promise<MatrixJoinedMembersResponse> {
  return matrixRequest<MatrixJoinedMembersResponse>(
    conn.baseUrl,
    clientJoinedMembers(roomId),
    { method: "GET", headers: authHeaders(conn) }
  );
}

/**
 * Join a room.
 * POST /_matrix/client/v3/join/{roomIdOrAlias}
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3joinroomidoralias
 */
export async function joinRoom(
  roomIdOrAlias: string,
  conn: MatrixClientConnection
): Promise<{ room_id: string }> {
  return matrixRequest<{ room_id: string }>(
    conn.baseUrl,
    clientJoinRoom(roomIdOrAlias),
    { method: "POST", headers: authHeaders(conn), body: JSON.stringify({}) }
  );
}

/**
 * Leave a room.
 * POST /_matrix/client/v3/rooms/{roomId}/leave
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3roomsroomidleave
 */
export async function leaveRoom(
  roomId: string,
  conn: MatrixClientConnection,
  reason?: string
): Promise<void> {
  await matrixRequest<Record<string, unknown>>(
    conn.baseUrl,
    clientLeaveRoom(roomId),
    { method: "POST", headers: authHeaders(conn), body: JSON.stringify({ reason }) }
  );
}

/**
 * Invite a user to a room.
 * POST /_matrix/client/v3/rooms/{roomId}/invite
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3roomsroomidinvite
 */
export async function inviteUser(
  roomId: string,
  userId: string,
  conn: MatrixClientConnection,
  reason?: string
): Promise<void> {
  await matrixRequest<Record<string, unknown>>(
    conn.baseUrl,
    clientInviteUser(roomId),
    {
      method: "POST",
      headers: authHeaders(conn),
      body: JSON.stringify({ user_id: userId, reason }),
    }
  );
}

/**
 * Kick a user from a room.
 * POST /_matrix/client/v3/rooms/{roomId}/kick
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3roomsroomidkick
 */
export async function kickUser(
  roomId: string,
  userId: string,
  conn: MatrixClientConnection,
  reason?: string
): Promise<void> {
  await matrixRequest<Record<string, unknown>>(
    conn.baseUrl,
    clientKickUser(roomId),
    {
      method: "POST",
      headers: authHeaders(conn),
      body: JSON.stringify({ user_id: userId, reason }),
    }
  );
}

/**
 * Ban a user from a room.
 * POST /_matrix/client/v3/rooms/{roomId}/ban
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3roomsroomidban
 */
export async function banUser(
  roomId: string,
  userId: string,
  conn: MatrixClientConnection,
  reason?: string
): Promise<void> {
  await matrixRequest<Record<string, unknown>>(
    conn.baseUrl,
    clientBanUser(roomId),
    {
      method: "POST",
      headers: authHeaders(conn),
      body: JSON.stringify({ user_id: userId, reason }),
    }
  );
}

/**
 * Unban a user from a room.
 * POST /_matrix/client/v3/rooms/{roomId}/unban
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3roomsroomidunban
 */
export async function unbanUser(
  roomId: string,
  userId: string,
  conn: MatrixClientConnection,
  reason?: string
): Promise<void> {
  await matrixRequest<Record<string, unknown>>(
    conn.baseUrl,
    clientUnbanUser(roomId),
    {
      method: "POST",
      headers: authHeaders(conn),
      body: JSON.stringify({ user_id: userId, reason }),
    }
  );
}

// ---------------------------------------------------------------------------
// Room aliases
// ---------------------------------------------------------------------------

/**
 * Set a room alias.
 * PUT /_matrix/client/v3/directory/room/{roomAlias}
 * Ref: https://spec.matrix.org/latest/client-server-api/#put_matrixclientv3directoryroomroomalias
 */
export async function setRoomAlias(
  alias: string,
  roomId: string,
  conn: MatrixClientConnection
): Promise<void> {
  await matrixRequest<Record<string, unknown>>(
    conn.baseUrl,
    clientRoomAlias(alias),
    {
      method: "PUT",
      headers: authHeaders(conn),
      body: JSON.stringify({ room_id: roomId }),
    }
  );
}

/**
 * Resolve a room alias to a room ID.
 * GET /_matrix/client/v3/directory/room/{roomAlias}
 * Ref: https://spec.matrix.org/latest/client-server-api/#get_matrixclientv3directoryroomroomalias
 */
export async function resolveRoomAlias(
  alias: string,
  conn: MatrixClientConnection
): Promise<{ room_id: string; servers: string[] }> {
  return matrixRequest<{ room_id: string; servers: string[] }>(
    conn.baseUrl,
    clientRoomAlias(alias),
    { method: "GET", headers: authHeaders(conn) }
  );
}

/**
 * Delete a room alias.
 * DELETE /_matrix/client/v3/directory/room/{roomAlias}
 * Ref: https://spec.matrix.org/latest/client-server-api/#delete_matrixclientv3directoryroomroomalias
 */
export async function deleteRoomAlias(
  alias: string,
  conn: MatrixClientConnection
): Promise<void> {
  await matrixRequest<Record<string, unknown>>(
    conn.baseUrl,
    clientRoomAlias(alias),
    { method: "DELETE", headers: authHeaders(conn) }
  );
}

// ---------------------------------------------------------------------------
// Room upgrade
// ---------------------------------------------------------------------------

/**
 * Upgrade a room to a new version.
 * POST /_matrix/client/v3/rooms/{roomId}/upgrade
 * Ref: https://spec.matrix.org/latest/client-server-api/#post_matrixclientv3roomsroomidupgrade
 */
export async function upgradeRoom(
  roomId: string,
  newVersion: string,
  conn: MatrixClientConnection
): Promise<{ replacement_room: string }> {
  return matrixRequest<{ replacement_room: string }>(
    conn.baseUrl,
    clientUpgradeRoom(roomId),
    {
      method: "POST",
      headers: authHeaders(conn),
      body: JSON.stringify({ new_version: newVersion }),
    }
  );
}
