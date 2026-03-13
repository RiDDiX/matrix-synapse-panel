import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { getServerConnectionById } from "@/lib/servers";
import { listRooms } from "@/lib/synapse";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const serverId = request.nextUrl.searchParams.get("serverId");
  if (!serverId) {
    return NextResponse.json({ error: "serverId is required" }, { status: 400 });
  }

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? "100"), 500);

  try {
    const conn = await getServerConnectionById(serverId);
    const data = await listRooms(
      {
        limit,
        search_term: search,
        order_by: "name",
        dir: "f",
      },
      conn
    );

    return NextResponse.json({
      rooms: data.rooms.map((r) => ({
        room_id: r.room_id,
        name: r.name,
        canonical_alias: r.canonical_alias,
        joined_members: r.joined_members,
        topic: r.topic,
        join_rules: r.join_rules,
      })),
      total_rooms: data.total_rooms,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list rooms" },
      { status: 500 }
    );
  }
}
