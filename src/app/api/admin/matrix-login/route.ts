import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById, rotateServerToken } from "@/lib/servers";
import { getUser, SynapseApiError } from "@/lib/synapse";
import { getLoginFlows, loginWithPassword, matrixWhoami, MatrixApiError } from "@/lib/matrix-client";
import { adminMatrixLoginSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

/**
 * POST /api/admin/matrix-login
 *
 * Authenticate with a homeserver using the official Matrix login API,
 * verify the resulting account is a server admin, then store the token.
 *
 * This implements the correct admin-login flow:
 * 1. POST /_matrix/client/v3/login (official Matrix login)
 * 2. GET /_matrix/client/v3/account/whoami (verify identity)
 * 3. GET /_synapse/admin/v2/users/{userId} (verify admin status)
 * 4. Store the resulting access token encrypted per-server
 *
 * There is NO special admin-token-minting endpoint in Synapse.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminMatrixLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { userId, password } = parsed.data;

  try {
    const conn = await getServerConnectionById(serverId);

    // Step 1: Discover login flows to confirm password login is available
    let flows;
    try {
      flows = await getLoginFlows(conn.publicUrl);
    } catch {
      // Fall back to internal URL if public URL fails
      try {
        flows = await getLoginFlows(conn.internalUrl);
      } catch (e) {
        await logAudit({
          action: "admin.matrix.login.failed",
          actor: auth.email,
          target: userId,
          detail: "login flows unavailable",
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json(
          { error: "Cannot reach homeserver login endpoint. Verify the server URLs are correct." },
          { status: 502 }
        );
      }
    }

    const hasPasswordLogin = flows.flows.some((f) => f.type === "m.login.password");
    if (!hasPasswordLogin) {
      await logAudit({
        action: "admin.matrix.login.failed",
        actor: auth.email,
        target: userId,
        detail: "m.login.password flow not available",
        ip: getClientIp(request),
        serverId,
      });
      return NextResponse.json(
        {
          error: "Password login is not available on this homeserver.",
          availableFlows: flows.flows.map((f) => f.type),
        },
        { status: 400 }
      );
    }

    // Step 2: Perform actual login via official Matrix login API
    let loginResult;
    try {
      loginResult = await loginWithPassword(conn.publicUrl, userId, password);
    } catch {
      try {
        loginResult = await loginWithPassword(conn.internalUrl, userId, password);
      } catch (e) {
        const msg = e instanceof MatrixApiError
          ? e.message
          : (e instanceof Error ? e.message : "Login failed");
        await logAudit({
          action: "admin.matrix.login.failed",
          actor: auth.email,
          target: userId,
          detail: `login failed: ${e instanceof MatrixApiError ? e.errcode : "unknown"}`,
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json({ error: msg }, { status: 401 });
      }
    }

    // Step 3: Verify identity with whoami
    const whoamiConn = { baseUrl: conn.internalUrl, accessToken: loginResult.access_token };
    let whoamiResult;
    try {
      whoamiResult = await matrixWhoami(whoamiConn);
    } catch {
      return NextResponse.json(
        { error: "Login succeeded but identity verification (whoami) failed. The internal URL may not be accessible." },
        { status: 502 }
      );
    }

    if (whoamiResult.user_id !== loginResult.user_id) {
      return NextResponse.json(
        { error: "Identity mismatch between login response and whoami." },
        { status: 500 }
      );
    }

    // Step 4: Verify admin status using Synapse Admin API
    const tempConn = { internalUrl: conn.internalUrl, adminToken: loginResult.access_token };
    let userDetail;
    try {
      userDetail = await getUser(loginResult.user_id, tempConn);
    } catch (e) {
      if (e instanceof SynapseApiError && (e.status === 403 || e.status === 401)) {
        await logAudit({
          action: "admin.matrix.login.failed",
          actor: auth.email,
          target: userId,
          detail: "account is not a server admin",
          ip: getClientIp(request),
          serverId,
        });
        return NextResponse.json(
          { error: `Account ${loginResult.user_id} is not a Synapse server admin. The Admin API returned ${e.status}.` },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Admin API verification failed. Ensure the internal URL points directly to Synapse." },
        { status: 502 }
      );
    }

    if (!userDetail.admin) {
      await logAudit({
        action: "admin.matrix.login.failed",
        actor: auth.email,
        target: userId,
        detail: "account exists but admin=false",
        ip: getClientIp(request),
        serverId,
      });
      return NextResponse.json(
        { error: `Account ${loginResult.user_id} exists but is not a server admin.` },
        { status: 403 }
      );
    }

    // Step 5: Store the access token securely (encrypted, per-server)
    await rotateServerToken(serverId, loginResult.access_token);

    await logAudit({
      action: "admin.matrix.login",
      actor: auth.email,
      target: loginResult.user_id,
      detail: "admin token acquired via Matrix login",
      ip: getClientIp(request),
      serverId,
    });

    // Never return the raw token to the browser
    return NextResponse.json({
      success: true,
      userId: loginResult.user_id,
      deviceId: loginResult.device_id,
      admin: true,
      message: "Admin token acquired and stored securely.",
    });
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Admin login failed" },
      { status: 502 }
    );
  }
}

/**
 * GET /api/admin/matrix-login
 *
 * Discover available login flows for a homeserver.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  try {
    const conn = await getServerConnectionById(serverId);

    let flows;
    let loginUrl = conn.publicUrl;
    try {
      flows = await getLoginFlows(conn.publicUrl);
    } catch {
      flows = await getLoginFlows(conn.internalUrl);
      loginUrl = conn.internalUrl;
    }

    return NextResponse.json({
      flows: flows.flows,
      loginUrl,
      hasPasswordLogin: flows.flows.some((f) => f.type === "m.login.password"),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to discover login flows" },
      { status: 502 }
    );
  }
}
