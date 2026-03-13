import { describe, it, expect } from "vitest";
import {
  ADMIN_REGISTRATION_TOKENS,
  ADMIN_REGISTRATION_TOKENS_NEW,
  adminRegistrationToken,
  adminUserEndpoint,
  adminUserLogin,
  ADMIN_ROOMS,
  CLIENT_VERSIONS,
  CLIENT_REGISTER,
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

  it("ADMIN_ROOMS is the official path", () => {
    expect(ADMIN_ROOMS).toBe("/_synapse/admin/v1/rooms");
  });

  it("no endpoint uses old /_matrix/client/.../admin paths", () => {
    const allPaths = [
      ADMIN_REGISTRATION_TOKENS,
      ADMIN_REGISTRATION_TOKENS_NEW,
      ADMIN_ROOMS,
      CLIENT_VERSIONS,
      CLIENT_REGISTER,
      adminRegistrationToken("test"),
      adminUserEndpoint("@bot:example.com"),
      adminUserLogin("@bot:example.com"),
      clientTokenValidity("test"),
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

describe("URL separation enforcement", () => {
  it("admin endpoints start with /_synapse/admin/", () => {
    expect(ADMIN_REGISTRATION_TOKENS).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_REGISTRATION_TOKENS_NEW).toMatch(/^\/\_synapse\/admin\//);
    expect(ADMIN_ROOMS).toMatch(/^\/\_synapse\/admin\//);
    expect(adminRegistrationToken("test")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminUserEndpoint("@bot:example.com")).toMatch(/^\/\_synapse\/admin\//);
    expect(adminUserLogin("@bot:example.com")).toMatch(/^\/\_synapse\/admin\//);
  });

  it("client endpoints start with /_matrix/client/", () => {
    expect(CLIENT_VERSIONS).toMatch(/^\/\_matrix\/client\//);
    expect(CLIENT_REGISTER).toMatch(/^\/\_matrix\/client\//);
    expect(clientTokenValidity("test")).toMatch(/^\/\_matrix\/client\//);
  });
});
