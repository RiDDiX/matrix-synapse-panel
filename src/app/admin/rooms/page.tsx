"use client";

import { useState, useEffect, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DoorOpen,
  Search,
  Plus,
  Users,
  Hash,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  Globe,
  Lock,
  MessageSquare,
  Settings,
  UserPlus,
  UserMinus,
  Ban,
  ShieldOff,
  Send,
  ArrowLeft,
  GitBranch,
  Link2,
  Unlink,
  ArrowUpCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SynapseRoom {
  room_id: string;
  name: string | null;
  canonical_alias: string | null;
  joined_members: number;
  topic: string | null;
  join_rules: string | null;
  room_type: string | null;
}

interface RoomDetail {
  room_id: string;
  name?: string;
  topic?: string;
  canonical_alias?: string;
  joined_members?: number;
  joined_local_members?: number;
  version?: string;
  creator?: string;
  encryption?: string;
  join_rules?: string;
  history_visibility?: string;
  state_events?: number;
}

interface StateEvent {
  type: string;
  state_key: string;
  content: Record<string, unknown>;
  sender: string;
  origin_server_ts: number;
  event_id: string;
}

interface RoomMessage {
  type: string;
  content: Record<string, unknown>;
  sender: string;
  origin_server_ts: number;
  event_id: string;
}

interface JoinedMember {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

type View =
  | "list"
  | "detail"
  | "members"
  | "messages"
  | "threads"
  | "settings"
  | "create";

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function RoomsPage() {
  const { current, loading: serverLoading } = useServerContext();
  const [view, setView] = useState<View>("list");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  function openRoom(roomId: string, v: View = "detail") {
    setSelectedRoom(roomId);
    setView(v);
  }

  function backToList() {
    setSelectedRoom(null);
    setView("list");
  }

  if (serverLoading) {
    return <div className="p-6 text-muted-foreground">Loading servers…</div>;
  }
  if (!current) {
    return <div className="p-6 text-muted-foreground">Select a server to manage rooms.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        {view !== "list" && (
          <Button variant="ghost" size="icon" onClick={backToList}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <DoorOpen className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Room Management</h1>
        <span className="text-sm text-muted-foreground">— {current.serverName}</span>
      </div>

      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
        <strong>Permission model:</strong> Room operations use the admin account&apos;s
        Matrix identity. Actions are subject to normal room power levels.
        Homeserver admin powers do NOT automatically override room permissions.
      </div>

      {view === "list" && (
        <RoomList serverId={current.id} onOpenRoom={openRoom} onCreateRoom={() => setView("create")} />
      )}
      {view === "create" && (
        <CreateRoomForm serverId={current.id} onCreated={(id) => openRoom(id)} onCancel={backToList} />
      )}
      {view === "detail" && selectedRoom && (
        <RoomDetailView serverId={current.id} roomId={selectedRoom} onNavigate={setView} />
      )}
      {view === "members" && selectedRoom && (
        <RoomMembersView serverId={current.id} roomId={selectedRoom} />
      )}
      {view === "messages" && selectedRoom && (
        <RoomMessagesView serverId={current.id} roomId={selectedRoom} />
      )}
      {view === "threads" && selectedRoom && (
        <RoomThreadsView serverId={current.id} roomId={selectedRoom} />
      )}
      {view === "settings" && selectedRoom && (
        <RoomSettingsView serverId={current.id} roomId={selectedRoom} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Room List                                                           */
/* ------------------------------------------------------------------ */

function RoomList({
  serverId,
  onOpenRoom,
  onCreateRoom,
}: {
  serverId: string;
  onOpenRoom: (roomId: string, view?: View) => void;
  onCreateRoom: () => void;
}) {
  const [rooms, setRooms] = useState<SynapseRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ serverId, limit: String(pageSize), from: String(page * pageSize) });
      if (search) params.set("search_term", search);
      const res = await fetch(`/api/admin/rooms?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load rooms");
      const data = await res.json();
      setRooms(data.rooms ?? []);
      setTotal(data.total_rooms ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [serverId, page, search]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateRoom}>
          <Plus className="h-4 w-4 mr-1" /> Create Room
        </Button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…</div>
      ) : rooms.length === 0 ? (
        <div className="text-muted-foreground">No rooms found.</div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">{total} rooms total</div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Room</th>
                  <th className="text-left p-3 font-medium">Alias</th>
                  <th className="text-center p-3 font-medium">Members</th>
                  <th className="text-center p-3 font-medium">Access</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.room_id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{room.name || room.room_id}</div>
                      {room.topic && <div className="text-xs text-muted-foreground truncate max-w-[300px]">{room.topic}</div>}
                    </td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{room.canonical_alias ?? "—"}</td>
                    <td className="p-3 text-center">{room.joined_members}</td>
                    <td className="p-3 text-center">
                      {room.join_rules === "public" ? (
                        <span className="inline-flex items-center gap-1 text-green-700"><Globe className="h-3 w-3" /> Public</span>
                      ) : room.join_rules === "invite" ? (
                        <span className="inline-flex items-center gap-1 text-blue-700"><Lock className="h-3 w-3" /> Invite</span>
                      ) : (
                        <span className="text-muted-foreground">{room.join_rules ?? "—"}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onOpenRoom(room.room_id, "detail")} title="Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onOpenRoom(room.room_id, "members")} title="Members">
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onOpenRoom(room.room_id, "messages")} title="Messages">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onOpenRoom(room.room_id, "settings")} title="Settings">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(page + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create Room                                                         */
/* ------------------------------------------------------------------ */

function CreateRoomForm({
  serverId,
  onCreated,
  onCancel,
}: {
  serverId: string;
  onCreated: (roomId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [alias, setAlias] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [preset, setPreset] = useState<"private_chat" | "public_chat" | "trusted_private_chat">("private_chat");
  const [invites, setInvites] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { visibility, preset };
      if (name) body.name = name;
      if (topic) body.topic = topic;
      if (alias) body.room_alias_name = alias;
      const inviteList = invites.split(/[,\s]+/).filter(Boolean);
      if (inviteList.length > 0) body.invite = inviteList;

      const res = await fetch(`/api/admin/rooms?serverId=${serverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create room");
      const data = await res.json();
      onCreated(data.room_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Create Room</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="space-y-2">
        <Label>Room Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="General Discussion" />
      </div>

      <div className="space-y-2">
        <Label>Topic</Label>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What this room is about" />
      </div>

      <div className="space-y-2">
        <Label>Local Alias (optional)</Label>
        <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="general" />
        <p className="text-xs text-muted-foreground">Creates #alias:server</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Visibility</Label>
          <select className="w-full rounded-md border px-3 py-2 text-sm" value={visibility} onChange={(e) => setVisibility(e.target.value as "private" | "public")}>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Preset</Label>
          <select className="w-full rounded-md border px-3 py-2 text-sm" value={preset} onChange={(e) => setPreset(e.target.value as "private_chat" | "public_chat" | "trusted_private_chat")}>
            <option value="private_chat">Private Chat</option>
            <option value="public_chat">Public Chat</option>
            <option value="trusted_private_chat">Trusted Private Chat</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Invite Users (optional)</Label>
        <Input value={invites} onChange={(e) => setInvites(e.target.value)} placeholder="@user1:server, @user2:server" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Create Room
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Room Detail                                                         */
/* ------------------------------------------------------------------ */

function RoomDetailView({
  serverId,
  roomId,
  onNavigate,
}: {
  serverId: string;
  roomId: string;
  onNavigate: (v: View) => void;
}) {
  const [detail, setDetail] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}?serverId=${serverId}&section=detail`)
      .then((r) => { if (!r.ok) throw new Error("Failed to load room"); return r.json(); })
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roomId, serverId]);

  if (loading) return <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!detail) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{detail.name || detail.room_id}</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Room ID", value: detail.room_id },
          { label: "Alias", value: detail.canonical_alias ?? "—" },
          { label: "Members", value: String(detail.joined_members ?? "—") },
          { label: "Local Members", value: String(detail.joined_local_members ?? "—") },
          { label: "Version", value: detail.version ?? "—" },
          { label: "Creator", value: detail.creator ?? "—" },
          { label: "Encryption", value: detail.encryption ?? "None" },
          { label: "Join Rules", value: detail.join_rules ?? "—" },
          { label: "History Visibility", value: detail.history_visibility ?? "—" },
          { label: "State Events", value: String(detail.state_events ?? "—") },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-mono text-sm truncate" title={value}>{value}</div>
          </div>
        ))}
      </div>

      {detail.topic && (
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground mb-1">Topic</div>
          <div className="text-sm">{detail.topic}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate("members")}>
          <Users className="h-4 w-4 mr-1" /> Members
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate("messages")}>
          <MessageSquare className="h-4 w-4 mr-1" /> Messages
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate("threads")}>
          <GitBranch className="h-4 w-4 mr-1" /> Threads
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate("settings")}>
          <Settings className="h-4 w-4 mr-1" /> Settings
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Room Members                                                        */
/* ------------------------------------------------------------------ */

function RoomMembersView({ serverId, roomId }: { serverId: string; roomId: string }) {
  const [members, setMembers] = useState<JoinedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Invite form
  const [inviteUserId, setInviteUserId] = useState("");

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}?serverId=${serverId}&section=members`);
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      const joined = data.joined ?? {};
      setMembers(
        Object.entries(joined).map(([userId, info]) => ({
          userId,
          displayName: (info as Record<string, string>)?.display_name,
          avatarUrl: (info as Record<string, string>)?.avatar_url,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [roomId, serverId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function doAction(action: string, userId: string, reason?: string) {
    setActionLoading(userId);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}?serverId=${serverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, user_id: userId, reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Action failed");
      await fetchMembers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleInvite() {
    if (!inviteUserId.trim()) return;
    await doAction("invite", inviteUserId.trim());
    setInviteUserId("");
  }

  if (loading) return <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading members…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Members ({members.length})</h2>

      {actionError && <div className="text-red-600 text-sm">{actionError}</div>}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label>Invite User</Label>
          <Input placeholder="@user:server" value={inviteUserId} onChange={(e) => setInviteUserId(e.target.value)} />
        </div>
        <Button onClick={handleInvite} disabled={!inviteUserId.trim()}>
          <UserPlus className="h-4 w-4 mr-1" /> Invite
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Display Name</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{m.userId}</td>
                <td className="p-3">{m.displayName ?? "—"}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Kick"
                      disabled={actionLoading === m.userId}
                      onClick={() => doAction("kick", m.userId)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Ban"
                      disabled={actionLoading === m.userId}
                      onClick={() => doAction("ban", m.userId)}
                    >
                      <Ban className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Room Messages                                                       */
/* ------------------------------------------------------------------ */

function RoomMessagesView({ serverId, roomId }: { serverId: string; roomId: string }) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginationToken, setPaginationToken] = useState<string | undefined>();

  // Send message form
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async (from?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ serverId, section: "messages", limit: "50", dir: "b" });
      if (from) params.set("from", from);
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}?${params}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      setMessages(data.chunk ?? []);
      setPaginationToken(data.end);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [roomId, serverId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  async function handleSend() {
    if (!msgBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}?serverId=${serverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_message", msgtype: "m.text", body: msgBody }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to send");
      setMsgBody("");
      await fetchMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function formatTs(ts: number) {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Messages</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label>Send Message</Label>
          <Input
            placeholder="Type a message…"
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
        </div>
        <Button onClick={handleSend} disabled={sending || !msgBody.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : messages.length === 0 ? (
        <div className="text-muted-foreground">No messages found.</div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.event_id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="font-mono">{msg.sender}</span>
                <span>·</span>
                <span>{formatTs(msg.origin_server_ts)}</span>
                <span>·</span>
                <span className="text-xs opacity-50">{msg.type}</span>
                {!!msg.content?.["m.relates_to"] && (
                  <>
                    <span>·</span>
                    <GitBranch className="h-3 w-3" />
                    <span className="text-purple-600">Thread</span>
                  </>
                )}
              </div>
              <div>
                {msg.type === "m.room.message"
                  ? String(msg.content?.body ?? "")
                  : <span className="text-muted-foreground italic">{msg.type}</span>
                }
              </div>
            </div>
          ))}

          {paginationToken && (
            <Button variant="outline" size="sm" onClick={() => fetchMessages(paginationToken)}>
              Load older messages
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Room Threads                                                        */
/* ------------------------------------------------------------------ */

function RoomThreadsView({ serverId, roomId }: { serverId: string; roomId: string }) {
  const [threads, setThreads] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}?serverId=${serverId}&section=threads`)
      .then((r) => { if (!r.ok) throw new Error("Failed to load threads"); return r.json(); })
      .then((data) => setThreads(data.chunk ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roomId, serverId]);

  function formatTs(ts: number) {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2"><GitBranch className="h-5 w-5" /> Threads</h2>

      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-200">
        <strong>Thread semantics:</strong> A thread in Matrix begins when the first reply
        references a root event with <code>rel_type: &quot;m.thread&quot;</code>.
        There is no &quot;create empty thread&quot; API — threads are created by replying to a message.
        Thread listing requires homeserver support for threading (Matrix v1.4+).
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : threads.length === 0 ? (
        <div className="text-muted-foreground">No threads found. Threads appear when users reply to messages using thread relations.</div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <div key={t.event_id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <GitBranch className="h-3 w-3" />
                <span className="font-mono">{t.sender}</span>
                <span>·</span>
                <span>{formatTs(t.origin_server_ts)}</span>
              </div>
              <div className="font-medium">
                {t.type === "m.room.message" ? String(t.content?.body ?? "") : t.type}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">{t.event_id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Room Settings                                                       */
/* ------------------------------------------------------------------ */

function RoomSettingsView({ serverId, roomId }: { serverId: string; roomId: string }) {
  const [state, setState] = useState<StateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // State update form
  const [newName, setNewName] = useState("");
  const [newTopic, setNewTopic] = useState("");

  // Alias management
  const [newAlias, setNewAlias] = useState("");
  const [deleteAlias, setDeleteAlias] = useState("");

  // Upgrade
  const [upgradeVersion, setUpgradeVersion] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}?serverId=${serverId}&section=state`)
      .then((r) => { if (!r.ok) throw new Error("Failed to load state"); return r.json(); })
      .then((data) => setState(data.state ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roomId, serverId]);

  async function doRoomAction(body: Record<string, unknown>) {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomId)}?serverId=${serverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Action failed");
      setActionSuccess("Done.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    }
  }

  if (loading) return <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const nameEvent = state.find((e) => e.type === "m.room.name");
  const topicEvent = state.find((e) => e.type === "m.room.topic");
  const powerLevels = state.find((e) => e.type === "m.room.power_levels");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> Room Settings</h2>

      {actionError && <div className="text-red-600 text-sm">{actionError}</div>}
      {actionSuccess && <div className="text-green-600 text-sm">{actionSuccess}</div>}

      {/* Name/Topic update */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-medium">Update Room Info</h3>
        <div className="space-y-2">
          <Label>Room Name</Label>
          <Input
            placeholder={String(nameEvent?.content?.name ?? "Current name")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!newName.trim()}
            onClick={() => doRoomAction({ action: "set_state", event_type: "m.room.name", state_key: "", content: { name: newName } })}
          >
            Update Name
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Topic</Label>
          <Input
            placeholder={String(topicEvent?.content?.topic ?? "Current topic")}
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!newTopic.trim()}
            onClick={() => doRoomAction({ action: "set_state", event_type: "m.room.topic", state_key: "", content: { topic: newTopic } })}
          >
            Update Topic
          </Button>
        </div>
      </div>

      {/* Alias management */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-medium flex items-center gap-2"><Hash className="h-4 w-4" /> Alias Management</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Add Alias</Label>
            <Input placeholder="#alias:server" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} />
          </div>
          <Button size="sm" disabled={!newAlias.trim()} onClick={() => doRoomAction({ action: "set_alias", alias: newAlias })}>
            <Link2 className="h-4 w-4 mr-1" /> Set
          </Button>
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Remove Alias</Label>
            <Input placeholder="#alias:server" value={deleteAlias} onChange={(e) => setDeleteAlias(e.target.value)} />
          </div>
          <Button size="sm" variant="destructive" disabled={!deleteAlias.trim()} onClick={() => doRoomAction({ action: "delete_alias", alias: deleteAlias })}>
            <Unlink className="h-4 w-4 mr-1" /> Remove
          </Button>
        </div>
      </div>

      {/* Room Upgrade */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-medium flex items-center gap-2"><ArrowUpCircle className="h-4 w-4" /> Room Upgrade</h3>
        <p className="text-sm text-muted-foreground">
          Upgrading creates a new room with the specified version and tombstones the old one.
          This is irreversible. All members will be invited to the new room.
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>New Room Version</Label>
            <Input placeholder="11" value={upgradeVersion} onChange={(e) => setUpgradeVersion(e.target.value)} />
          </div>
          <Button size="sm" variant="destructive" disabled={!upgradeVersion.trim()} onClick={() => {
            if (confirm(`Upgrade room to version ${upgradeVersion}? This is irreversible.`)) {
              doRoomAction({ action: "upgrade", new_version: upgradeVersion });
            }
          }}>
            <ArrowUpCircle className="h-4 w-4 mr-1" /> Upgrade
          </Button>
        </div>
      </div>

      {/* Join/Leave */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-medium">Membership</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => doRoomAction({ action: "join" })}>
            <DoorOpen className="h-4 w-4 mr-1" /> Join Room
          </Button>
          <Button size="sm" variant="outline" onClick={() => doRoomAction({ action: "leave" })}>
            <DoorOpen className="h-4 w-4 mr-1" /> Leave Room
          </Button>
        </div>
      </div>

      {/* Power Levels (read-only display) */}
      {powerLevels && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-medium flex items-center gap-2"><Shield className="h-4 w-4" /> Power Levels</h3>
          <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto max-h-[300px]">
            {JSON.stringify(powerLevels.content, null, 2)}
          </pre>
        </div>
      )}

      {/* Raw State */}
      <details className="rounded-lg border p-4">
        <summary className="font-medium cursor-pointer">Raw State Events ({state.length})</summary>
        <div className="mt-2 space-y-1 max-h-[400px] overflow-auto">
          {state.map((e) => (
            <div key={e.event_id} className="text-xs font-mono bg-muted/30 rounded p-2">
              <span className="text-blue-600">{e.type}</span>
              {e.state_key && <span className="text-muted-foreground"> ({e.state_key})</span>}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
