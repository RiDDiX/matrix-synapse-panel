import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { sendServerNotice, SynapseApiError } from "@/lib/synapse";
import { sendServerNoticeSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const serverId = url.searchParams.get("serverId");
  if (!serverId) return NextResponse.json({ error: "serverId is required" }, { status: 400 });

  const auth = await requirePermission("users.write", serverId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null);
  const parsed = sendServerNoticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const conn = await getServerConnectionById(serverId);
    const content = {
      msgtype: parsed.data.content.msgtype,
      body: parsed.data.content.body,
      ...(parsed.data.content.format ? { format: parsed.data.content.format } : {}),
      ...(parsed.data.content.formatted_body ? { formatted_body: parsed.data.content.formatted_body } : {}),
    };
    const result = await sendServerNotice(
      {
        user_id: parsed.data.user_id,
        content,
        ...(parsed.data.type ? { type: parsed.data.type } : {}),
        ...(parsed.data.state_key !== undefined ? { state_key: parsed.data.state_key } : {}),
      },
      conn
    );

    await logAudit({
      action: "server_notice.sent",
      actor: auth.email,
      target: parsed.data.user_id,
      detail: `event_id: ${result.event_id}`,
      ip: getClientIp(request),
      serverId,
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof SynapseApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send server notice" },
      { status: 502 }
    );
  }
}
