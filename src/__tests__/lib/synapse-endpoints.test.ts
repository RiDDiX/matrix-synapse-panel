import { describe, it, expect } from "vitest";
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
  adminRoomDetail,
  adminDeleteRoom,
  adminDeleteRoomV2,
  adminRoomDeleteStatus,
  ADMIN_PURGE_MEDIA_CACHE,
  adminRoomState,
  adminRoomMedia,
  adminUserMedia,
  adminQuarantineMedia,
  adminQuarantineRoomMedia,
  adminQuarantineUserMedia,
  adminUnquarantineMedia,
  adminDeleteMedia,
  adminDeleteMediaByDate,
  adminProtectMedia,
  adminUnprotectMedia,
  ADMIN_FEDERATION_DESTINATIONS,
  adminFederationDestination,
  adminFederationDestinationRooms,
  adminFederationResetConnection,
  ADMIN_EVENT_REPORTS,
  adminEventReport,
  adminDeleteEventReport,
  adminPurgeHistory,
  adminPurgeHistoryStatus,
  ADMIN_BACKGROUND_UPDATES_STATUS,
  ADMIN_BACKGROUND_UPDATES_ENABLED,
  ADMIN_BACKGROUND_UPDATES_START_JOB,
  adminUserRateLimit,
  ADMIN_STATISTICS_USERS_MEDIA,
  CLIENT_VERSIONS,
  CLIENT_REGISTER,
  CLIENT_WHOAMI,
  CLIENT_LOGIN,
  CLIENT_LOGIN_FLOWS,
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
  clientTokenValidity,
  buildUrl,
  classifyFailure,
} from "@/lib/synapse-endpoints";

describe("endpoint constants", () => {
  it("ADMIN_REGISTRATION_TOKENS is the official path", () => {
    expect(ADMIN_REGISTRATION_TOKENS).toBe("/_synapse/admin/v1/registration_tokens");
  });

  it("ADMIN_REGISTRATION_TOKENS_NEW is the official path", () => {
    expect(ADMIN_REGISTRATION_TOKENS_NEW).toBe("/_synapse/admin/v1/registration_tokens/new");
  });

  it("CLIENT_VERSIONS is the official path", () => {
    expect(CLIENT_VERSIONS).toBe("/_matrix/client/versions");
  });

  it("CLIENT_REGISTER is the official path", () => {
    expect(CLIENT_REGISTER).toBe("/_matrix/client/v3/register");
  });

  it("ADMIN_USERS is the official path", () => {
    expect(ADMIN_USERS).toBe("/_synapse/admin/v2/users");
  });

  it("ADMIN_ROOMS is the official path", () => {
    expect(ADMIN_ROOMS).toBe("/_synapse/admin/v1/rooms");
  });

  it("CLIENT_WHOAMI is the official path", () => {
    expect(CLIENT_WHOAMI).toBe("/_matrix/client/v3/account/whoami");
  });

  it("CLIENT_LOGIN is the official path", () => {
    expect(CLIENT_LOGIN).toBe("/_matrix/client/v3/login");
  });

  it("CLIENT_CREATE_ROOM is the official path", () => {
    expect(CLIENT_CREATE_ROOM).toBe("/_matrix/client/v3/createRoom");
  });

  it("CLIENT_JOINED_ROOMS is the official path", () => {
    expect(CLIENT_JOINED_ROOMS).toBe("/_matrix/client/v3/joined_rooms");
  });

  it("no endpoint uses old /_matrix/client/.../admin paths", () => {
    const allPaths = [
      ADMIN_REGISTRATION_TOKENS,
      ADMIN_REGISTRATION_TOKENS_NEW,
      ADMIN_USERS,
      ADMIN_ROOMS,
      CLIENT_VERSIONS,
      CLIENT_REGISTER,
      CLIENT_WHOAMI,
      CLIENT_LOGIN,
      CLIENT_CREATE_ROOM,
      CLIENT_JOINED_ROOMS,
      adminRegistrationToken("test"),
      adminUserEndpoint("@bot:example.com"),
      adminUserLogin("@bot:example.com"),
      adminDeactivateUser("@user:example.com"),
      adminJoinRoom("!room:example.com"),
      adminRoomMembers("!room:example.com"),
      adminLeaveRoom("!room:example.com"),
      adminRoomDetail("!room:example.com"),
      adminRoomState("!room:example.com"),
      clientTokenValidity("test"),
      clientRoomMessages("!room:example.com"),
      clientSendEvent("!room:example.com", "m.room.message", "txn1"),
      clientSendStateEvent("!room:example.com", "m.room.name", ""),
      clientRoomState("!room:example.com"),
      clientRoomMembers("!room:example.com"),
      clientJoinedMembers("!room:example.com"),
      clientJoinRoom("!room:example.com"),
      clientLeaveRoom("!room:example.com"),
      clientInviteUser("!room:example.com"),
      clientKickUser("!room:example.com"),
      clientBanUser("!room:example.com"),
      clientUnbanUser("!room:example.com"),
      clientRoomAlias("#test:example.com"),
      clientUpgradeRoom("!room:example.com"),
      clientGetEvent("!room:example.com", "$event"),
      clientRelations("!room:example.com", "$event"),
    ];
    for (const p of allPaths) {
      expect(p).not.toContain("/_matrix/client/v1/admin");
      expect(p).not.toContain("/_matrix/client/v3/admin");
    }
  });
});

describe("adminRegistrationToken", () => {
  it("builds correct path for a simple token", () => {
    expect(adminRegistrationToken("abc123")).toBe("/_synapse/admin/v1/registration_tokens/abc123");
  });

  it("encodes special characters", () => {
    expect(adminRegistrationToken("a/b+c")).toBe("/_synapse/admin/v1/registration_tokens/a%2Fb%2Bc");
  });
});

describe("clientTokenValidity", () => {
  it("builds correct path with token query param", () => {
    const path = clientTokenValidity("mytoken");
    expect(path).toBe("/_matrix/client/v1/register/m.login.registration_token/validity?token=mytoken");
  });

  it("encodes special characters in token", () => {
    const path = clientTokenValidity("a&b=c");
    expect(path).toContain("token=a%26b%3Dc");
  });
});

describe("buildUrl", () => {
  it("joins base URL and path", () => {
    expect(buildUrl("http://synapse:8008", "/_synapse/admin/v1/registration_tokens"))
      .toBe("http://synapse:8008/_synapse/admin/v1/registration_tokens");
  });

  it("strips trailing slashes from base URL", () => {
    expect(buildUrl("http://synapse:8008/", "/_synapse/admin/v1/registration_tokens"))
      .toBe("http://synapse:8008/_synapse/admin/v1/registration_tokens");
  });

  it("handles multiple trailing slashes", () => {
    expect(buildUrl("http://synapse:8008///", "/test"))
      .toBe("http://synapse:8008/test");
  });
});

describe("classifyFailure", () => {
  it("classifies nginx HTML 404 as proxy_not_forwarded", () => {
    const body = '<html>\n<head><title>404 Not Found</title></head>\n<body>\n<center><h1>404 Not Found</h1></center>\n<hr><center>nginx</center>\n</body>\n</html>';
    const result = classifyFailure(404, body);
    expect(result.failureClass).toBe("proxy_not_forwarded");
    expect(result.message).toContain("reverse proxy");
    expect(result.message).toContain("nginx");
  });

  it("classifies openresty HTML 404 as proxy_not_forwarded", () => {
    const body = '<html><head><title>404</title></head><body><center>openresty</center></body></html>';
    const result = classifyFailure(404, body);
    expect(result.failureClass).toBe("proxy_not_forwarded");
  });

  it("classifies generic HTML 404 as proxy_not_forwarded", () => {
    const body = '<html><body>Not Found</body></html>';
    const result = classifyFailure(404, body);
    expect(result.failureClass).toBe("proxy_not_forwarded");
  });

  it("classifies JSON 404 as synapse_not_found", () => {
    const body = '{"errcode":"M_UNRECOGNIZED","error":"Unrecognized request"}';
    const result = classifyFailure(404, body);
    expect(result.failureClass).toBe("synapse_not_found");
  });

  it("classifies 401 as synapse_unauthorized", () => {
    const body = '{"errcode":"M_MISSING_TOKEN","error":"Missing access token"}';
    const result = classifyFailure(401, body);
    expect(result.failureClass).toBe("synapse_unauthorized");
  });

  it("classifies 403 as synapse_forbidden", () => {
    const body = '{"errcode":"M_FORBIDDEN","error":"You are not a server admin"}';
    const result = classifyFailure(403, body);
    expect(result.failureClass).toBe("synapse_forbidden");
  });

  it("classifies 500 as synapse_error", () => {
    const body = '{"errcode":"M_UNKNOWN","error":"Internal server error"}';
    const result = classifyFailure(500, body);
    expect(result.failureClass).toBe("synapse_error");
  });

  it("classifies 502 as synapse_error", () => {
    const result = classifyFailure(502, "Bad Gateway");
    expect(result.failureClass).toBe("synapse_error");
  });

  it("classifies unexpected status as unknown", () => {
    const result = classifyFailure(418, "I am a teapot");
    expect(result.failureClass).toBe("unknown");
  });

  it("never returns empty message", () => {
    for (const status of [401, 403, 404, 500, 418]) {
      const result = classifyFailure(status, "");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

describe("adminUserEndpoint", () => {
  it("builds correct path for a user ID", () => {
    expect(adminUserEndpoint("@bot:example.com")).toBe("/_synapse/admin/v2/users/%40bot%3Aexample.com");
  });

  it("encodes special characters", () => {
    const path = adminUserEndpoint("@my/bot:example.com");
    expect(path).toContain("%2F");
    expect(path).toMatch(/^\/\_synapse\/admin\/v2\/users\//);
  });
});

describe("adminUserLogin", () => {
  it("builds correct path for a user ID", () => {
    expect(adminUserLogin("@bot:example.com")).toBe("/_synapse/admin/v1/users/%40bot%3Aexample.com/login");
  });
});

describe("adminDeactivateUser", () => {
  it("builds correct path for a user ID", () => {
    expect(adminDeactivateUser("@user:example.com")).toBe("/_synapse/admin/v1/deactivate/%40user%3Aexample.com");
  });
});

describe("adminJoinRoom", () => {
  it("builds correct path for a room ID", () => {
    expect(adminJoinRoom("!room:example.com")).toBe("/_synapse/admin/v1/join/!room%3Aexample.com");
  });

  it("builds correct path for a room alias", () => {
    expect(adminJoinRoom("#general:example.com")).toBe("/_synapse/admin/v1/join/%23general%3Aexample.com");
  });
});

describe("adminRoomMembers", () => {
  it("builds correct path for a room ID", () => {
    expect(adminRoomMembers("!room:example.com")).toBe("/_synapse/admin/v1/rooms/!room%3Aexample.com/members");
  });
});

describe("adminLeaveRoom", () => {
  it("builds correct path for a room ID", () => {
    expect(adminLeaveRoom("!room:example.com")).toBe("/_synapse/admin/v1/leave/!room%3Aexample.com");
  });
});

describe("Client-Server API room endpoints", () => {
  it("clientRoomMessages builds correct path", () => {
    expect(clientRoomMessages("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/messages");
  });

  it("clientSendEvent builds correct path with event type and txn ID", () => {
    expect(clientSendEvent("!room:example.com", "m.room.message", "txn1"))
      .toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/send/m.room.message/txn1");
  });

  it("clientSendStateEvent builds correct path", () => {
    expect(clientSendStateEvent("!room:example.com", "m.room.name", ""))
      .toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/state/m.room.name/");
  });

  it("clientGetStateEvent builds correct path with state key", () => {
    expect(clientGetStateEvent("!room:example.com", "m.room.member", "@user:example.com"))
      .toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/state/m.room.member/%40user%3Aexample.com");
  });

  it("clientRoomState builds correct path", () => {
    expect(clientRoomState("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/state");
  });

  it("clientRoomMembers builds correct path", () => {
    expect(clientRoomMembers("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/members");
  });

  it("clientJoinedMembers builds correct path", () => {
    expect(clientJoinedMembers("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/joined_members");
  });

  it("clientJoinRoom builds correct path", () => {
    expect(clientJoinRoom("!room:example.com")).toBe("/_matrix/client/v3/join/!room%3Aexample.com");
  });

  it("clientLeaveRoom builds correct path", () => {
    expect(clientLeaveRoom("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/leave");
  });

  it("clientInviteUser builds correct path", () => {
    expect(clientInviteUser("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/invite");
  });

  it("clientKickUser builds correct path", () => {
    expect(clientKickUser("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/kick");
  });

  it("clientBanUser builds correct path", () => {
    expect(clientBanUser("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/ban");
  });

  it("clientUnbanUser builds correct path", () => {
    expect(clientUnbanUser("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/unban");
  });

  it("clientRoomAlias builds correct path", () => {
    expect(clientRoomAlias("#test:example.com")).toBe("/_matrix/client/v3/directory/room/%23test%3Aexample.com");
  });

  it("clientUpgradeRoom builds correct path", () => {
    expect(clientUpgradeRoom("!room:example.com")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/upgrade");
  });

  it("clientGetEvent builds correct path", () => {
    expect(clientGetEvent("!room:example.com", "$event1")).toBe("/_matrix/client/v3/rooms/!room%3Aexample.com/event/%24event1");
  });
});

describe("clientRelations", () => {
  it("builds base path without relType", () => {
    expect(clientRelations("!room:example.com", "$event1"))
      .toBe("/_matrix/client/v1/rooms/!room%3Aexample.com/relations/%24event1");
  });

  it("builds path with relType", () => {
    expect(clientRelations("!room:example.com", "$event1", "m.thread"))
      .toBe("/_matrix/client/v1/rooms/!room%3Aexample.com/relations/%24event1/m.thread");
  });

  it("builds path with relType and eventType", () => {
    expect(clientRelations("!room:example.com", "$event1", "m.thread", "m.room.message"))
      .toBe("/_matrix/client/v1/rooms/!room%3Aexample.com/relations/%24event1/m.thread/m.room.message");
  });
});

describe("Synapse Admin room detail endpoints", () => {
  it("adminRoomDetail builds correct path", () => {
    expect(adminRoomDetail("!room:example.com")).toBe("/_synapse/admin/v1/rooms/!room%3Aexample.com");
  });

  it("adminDeleteRoom builds correct path", () => {
    expect(adminDeleteRoom("!room:example.com")).toBe("/_synapse/admin/v1/rooms/!room%3Aexample.com");
  });

  it("adminRoomState builds correct path", () => {
    expect(adminRoomState("!room:example.com")).toBe("/_synapse/admin/v1/rooms/!room%3Aexample.com/state");
  });
});

describe("Media admin endpoints", () => {
  it("adminRoomMedia builds correct path", () => {
    expect(adminRoomMedia("!room:example.com")).toBe("/_synapse/admin/v1/room/!room%3Aexample.com/media");
  });

  it("adminUserMedia builds correct path", () => {
    expect(adminUserMedia("@user:example.com")).toBe("/_synapse/admin/v1/users/%40user%3Aexample.com/media");
  });

  it("adminQuarantineMedia builds correct path", () => {
    expect(adminQuarantineMedia("example.com", "abc123")).toBe("/_synapse/admin/v1/media/quarantine/example.com/abc123");
  });

  it("adminQuarantineRoomMedia builds correct path", () => {
    expect(adminQuarantineRoomMedia("!room:example.com")).toBe("/_synapse/admin/v1/room/!room%3Aexample.com/media/quarantine");
  });

  it("adminQuarantineUserMedia builds correct path", () => {
    expect(adminQuarantineUserMedia("@user:example.com")).toBe("/_synapse/admin/v1/users/%40user%3Aexample.com/media/quarantine");
  });

  it("adminUnquarantineMedia builds correct path", () => {
    expect(adminUnquarantineMedia("example.com", "abc123")).toBe("/_synapse/admin/v1/media/unquarantine/example.com/abc123");
  });

  it("adminDeleteMedia builds correct path", () => {
    expect(adminDeleteMedia("example.com", "abc123")).toBe("/_synapse/admin/v1/media/example.com/abc123");
  });

  it("adminDeleteMediaByDate builds correct path", () => {
    expect(adminDeleteMediaByDate("example.com")).toBe("/_synapse/admin/v1/media/example.com/delete");
  });

  it("adminProtectMedia builds correct path", () => {
    expect(adminProtectMedia("abc123")).toBe("/_synapse/admin/v1/media/protect/abc123");
  });

  it("adminUnprotectMedia builds correct path", () => {
    expect(adminUnprotectMedia("abc123")).toBe("/_synapse/admin/v1/media/unprotect/abc123");
  });
});

describe("Federation admin endpoints", () => {
  it("ADMIN_FEDERATION_DESTINATIONS is correct", () => {
    expect(ADMIN_FEDERATION_DESTINATIONS).toBe("/_synapse/admin/v1/federation/destinations");
  });

  it("adminFederationDestination builds correct path", () => {
    expect(adminFederationDestination("matrix.org")).toBe("/_synapse/admin/v1/federation/destinations/matrix.org");
  });

  it("adminFederationDestinationRooms builds correct path", () => {
    expect(adminFederationDestinationRooms("matrix.org")).toBe("/_synapse/admin/v1/federation/destinations/matrix.org/rooms");
  });

  it("adminFederationResetConnection builds correct path", () => {
    expect(adminFederationResetConnection("matrix.org")).toBe("/_synapse/admin/v1/federation/destinations/matrix.org/reset_connection");
  });
});

describe("Event reports admin endpoints", () => {
  it("ADMIN_EVENT_REPORTS is correct", () => {
    expect(ADMIN_EVENT_REPORTS).toBe("/_synapse/admin/v1/event_reports");
  });

  it("adminEventReport builds correct path", () => {
    expect(adminEventReport("42")).toBe("/_synapse/admin/v1/event_reports/42");
  });

  it("adminDeleteEventReport builds correct path", () => {
    expect(adminDeleteEventReport("42")).toBe("/_synapse/admin/v1/event_reports/42");
  });
});

describe("Purge history admin endpoints", () => {
  it("adminPurgeHistory builds correct path", () => {
    expect(adminPurgeHistory("!room:example.com")).toBe("/_synapse/admin/v1/purge_history/!room%3Aexample.com");
  });

  it("adminPurgeHistoryStatus builds correct path", () => {
    expect(adminPurgeHistoryStatus("abc123")).toBe("/_synapse/admin/v1/purge_history_status/abc123");
  });
});

describe("Background updates admin endpoints", () => {
  it("constants are correct", () => {
    expect(ADMIN_BACKGROUND_UPDATES_STATUS).toBe("/_synapse/admin/v1/background_updates/status");
    expect(ADMIN_BACKGROUND_UPDATES_ENABLED).toBe("/_synapse/admin/v1/background_updates/enabled");
    expect(ADMIN_BACKGROUND_UPDATES_START_JOB).toBe("/_synapse/admin/v1/background_updates/start_job");
  });
});

describe("Rate limit admin endpoints", () => {
  it("adminUserRateLimit builds correct path", () => {
    expect(adminUserRateLimit("@user:example.com")).toBe("/_synapse/admin/v1/users/%40user%3Aexample.com/override_ratelimit");
  });
});

describe("Statistics admin endpoints", () => {
  it("ADMIN_STATISTICS_USERS_MEDIA is correct", () => {
    expect(ADMIN_STATISTICS_USERS_MEDIA).toBe("/_synapse/admin/v1/statistics/users/media");
  });
});

describe("Room deletion v2 admin endpoints", () => {
  it("adminDeleteRoomV2 builds correct path", () => {
    expect(adminDeleteRoomV2("!room:example.com")).toBe("/_synapse/admin/v2/rooms/!room%3Aexample.com");
  });

  it("adminRoomDeleteStatus builds correct path", () => {
    expect(adminRoomDeleteStatus("delete123")).toBe("/_synapse/admin/v2/rooms/delete_status/delete123");
  });
});

describe("Media purge admin endpoints", () => {
  it("ADMIN_PURGE_MEDIA_CACHE is the official path", () => {
    expect(ADMIN_PURGE_MEDIA_CACHE).toBe("/_synapse/admin/v1/purge_media_cache");
  });
});

describe("URL separation enforcement", () => {
  it("admin endpoints start with /_synapse/admin/", () => {
    expect(adminDeleteRoomV2("!r:e.c")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminRoomDeleteStatus("d1")).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_PURGE_MEDIA_CACHE).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_REGISTRATION_TOKENS).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_REGISTRATION_TOKENS_NEW).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_USERS).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_ROOMS).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_FEDERATION_DESTINATIONS).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_EVENT_REPORTS).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_BACKGROUND_UPDATES_STATUS).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_STATISTICS_USERS_MEDIA).toMatch(/^\/\_synapse\/admin\//);
    expect(adminRegistrationToken("test")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminUserEndpoint("@bot:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminUserLogin("@bot:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminDeactivateUser("@user:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminJoinRoom("!room:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminRoomMembers("!room:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminLeaveRoom("!room:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminRoomDetail("!room:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminRoomState("!room:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminRoomMedia("!room:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminUserMedia("@u:e.c")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminQuarantineMedia("e.c", "x")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminFederationDestination("e.c")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminEventReport("1")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminPurgeHistory("!r:e.c")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminUserRateLimit("@u:e.c")).toMatch(/^\/\_synapse\/admin\//);
  });

  it("client endpoints start with /_matrix/client/", () => {
    expect(CLIENT_VERSIONS).toMatch(/^\/\_matrix\/client\//);
    expect(CLIENT_REGISTER).toMatch(/^\/\_matrix\/client\//);
    expect(CLIENT_WHOAMI).toMatch(/^\/\_matrix\/client\//);
    expect(CLIENT_LOGIN).toMatch(/^\/\_matrix\/client\//);
    expect(CLIENT_CREATE_ROOM).toMatch(/^\/\_matrix\/client\//);
    expect(CLIENT_JOINED_ROOMS).toMatch(/^\/\_matrix\/client\//);
    expect(clientTokenValidity("test")).toMatch(/^\/\_matrix\/client\//);
    expect(clientRoomMessages("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientSendEvent("!r:e.c", "m.room.message", "t")).toMatch(/^\/\_matrix\/client\//);
    expect(clientSendStateEvent("!r:e.c", "m.room.name")).toMatch(/^\/\_matrix\/client\//);
    expect(clientRoomState("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientRoomMembers("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientJoinedMembers("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientJoinRoom("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientLeaveRoom("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientInviteUser("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientKickUser("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientBanUser("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientUnbanUser("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientRoomAlias("#t:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientUpgradeRoom("!r:e.c")).toMatch(/^\/\_matrix\/client\//);
    expect(clientGetEvent("!r:e.c", "$e")).toMatch(/^\/\_matrix\/client\//);
    expect(clientRelations("!r:e.c", "$e")).toMatch(/^\/\_matrix\/client\//);
  });
});
