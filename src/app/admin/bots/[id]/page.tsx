"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Power, PowerOff, Trash2, Settings, Plus, X, Key,
  CheckCircle2, XCircle, Loader2, Bot, Hash, ToggleLeft, Search,
  Zap, Users, AlertCircle,
} from "lucide-react";

interface BotDetail {
  id: string;
  serverId: string;
  templateId: string;
  displayName: string;
  localpart: string | null;
  matrixUserId: string | null;
  avatarUrl: string | null;
  status: string;
  enabled: boolean;
  configJson: string | null;
  statusDetail: string | null;
  lastActiveAt: string | null;
  createdBy: string | null;
  createdAt: string;
  rooms: { id: string; roomId: string; roomAlias: string | null; active: boolean; configJson: string | null; joinedAt: string | null }[];
  features: { id: string; featureKey: string; enabled: boolean; scope: string; scopeId: string | null; configJson: string | null }[];
}

interface BotFeatureDef {
  key: string;
  label: string;
  description: string;
}

interface SynapseRoom {
  room_id: string;
  name: string | null;
  canonical_alias: string | null;
  joined_members: number;
  topic: string | null;
  join_rules: string | null;
}

const ALL_FEATURES: BotFeatureDef[] = [
  { key: "command_handling", label: "Command Handling", description: "Respond to !commands in rooms" },
  { key: "keyword_triggers", label: "Keyword Triggers", description: "React to specific keywords" },
  { key: "webhook_notifications", label: "Webhook Notifications", description: "Receive and relay webhook payloads" },
  { key: "scheduled_messages", label: "Scheduled Messages", description: "Send messages on a schedule" },
  { key: "moderation_actions", label: "Moderation Actions", description: "Kick/ban/mute users" },
  { key: "room_auto_join", label: "Room Auto-Join", description: "Auto-join rooms when invited" },
  { key: "room_responses", label: "Room-Specific Responses", description: "Custom responses per room" },
  { key: "thread_replies", label: "Thread-Aware Replies", description: "Reply in threads where supported" },
  { key: "message_relay", label: "Message Relay", description: "Relay messages between rooms" },
  { key: "admin_commands", label: "Admin-Only Commands", description: "Commands restricted to admins" },
];

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [bot, setBot] = useState<BotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "rooms" | "features" | "config">("overview");

  const [newRoomId, setNewRoomId] = useState("");
  const [newRoomAlias, setNewRoomAlias] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});

  // Provision token state
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Room picker state
  const [synapseRooms, setSynapseRooms] = useState<SynapseRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  const fetchBot = useCallback(async () => {
    const res = await fetch(`/api/admin/bots/${id}`);
    if (res.ok) {
      const data = await res.json();
      setBot(data.bot);
      if (data.bot?.configJson) {
        try { setConfigValues(JSON.parse(data.bot.configJson)); } catch { /* ignore */ }
      }
    }
  }, [id]);

  useEffect(() => {
    fetchBot().finally(() => setLoading(false));
  }, [fetchBot]);

  async function handleAction(action: string) {
    setActionLoading(true);
    await fetch(`/api/admin/bots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchBot();
    setActionLoading(false);
  }

  async function handleSetToken() {
    if (!tokenInput) return;
    setActionLoading(true);
    await fetch(`/api/admin/bots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_token", token: tokenInput }),
    });
    setTokenInput("");
    await fetchBot();
    setActionLoading(false);
  }

  async function handleProvisionToken() {
    if (!bot?.localpart) return;
    if (!confirm(`This will create (or update) the Matrix user @${bot.localpart} on the homeserver and generate an access token. Continue?`)) return;
    setProvisionLoading(true);
    setProvisionMsg(null);
    try {
      const res = await fetch(`/api/admin/bots/${id}/provision-token`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setProvisionMsg({ type: "success", text: `Token provisioned for ${data.matrixUserId}. The token is stored encrypted.` });
        await fetchBot();
      } else {
        setProvisionMsg({ type: "error", text: data.error || "Failed to provision token" });
      }
    } catch (e) {
      setProvisionMsg({ type: "error", text: e instanceof Error ? e.message : "Network error" });
    }
    setProvisionLoading(false);
  }

  async function fetchRooms(search?: string) {
    if (!bot) return;
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const qp = new URLSearchParams({ serverId: bot.serverId });
      if (search) qp.set("search", search);
      qp.set("limit", "100");

      const res = await fetch(`/api/admin/bots/rooms?${qp.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Failed to load rooms (${res.status})`);
      }
      const data = await res.json();
      setSynapseRooms(data.rooms ?? []);
      setRoomsLoaded(true);
    } catch (e) {
      setRoomsError(e instanceof Error ? e.message : "Failed to load rooms");
    }
    setRoomsLoading(false);
  }

  function handleSelectRoom(room: SynapseRoom) {
    setNewRoomId(room.room_id);
    setNewRoomAlias(room.canonical_alias || "");
    setShowRoomDropdown(false);
  }

  async function handleAssignRoom() {
    if (!newRoomId) return;
    setActionLoading(true);
    await fetch(`/api/admin/bots/${id}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: newRoomId, roomAlias: newRoomAlias || undefined }),
    });
    setNewRoomId("");
    setNewRoomAlias("");
    await fetchBot();
    setActionLoading(false);
  }

  async function handleUnassignRoom(roomId: string) {
    setActionLoading(true);
    await fetch(`/api/admin/bots/${id}/rooms`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    await fetchBot();
    setActionLoading(false);
  }

  async function handleToggleFeature(featureKey: string, enabled: boolean) {
    setActionLoading(true);
    await fetch(`/api/admin/bots/${id}/features`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureKey, enabled, scope: "global" }),
    });
    await fetchBot();
    setActionLoading(false);
  }

  async function handleSaveConfig() {
    setActionLoading(true);
    await fetch(`/api/admin/bots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: configValues }),
    });
    await fetchBot();
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this bot? This cannot be undone.")) return;
    setActionLoading(true);
    await fetch(`/api/admin/bots/${id}`, { method: "DELETE" });
    router.push("/admin/bots");
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!bot) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Bot not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/bots")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  const statusColor = bot.status === "running" ? "text-green-500" : bot.status === "failed" ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/bots")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{bot.displayName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-sm font-medium ${statusColor}`}>{bot.status}</span>
              {bot.localpart && <span className="text-xs text-muted-foreground">@{bot.localpart}</span>}
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{bot.templateId}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={bot.enabled ? "destructive" : "default"} onClick={() => handleAction(bot.enabled ? "deactivate" : "activate")} disabled={actionLoading}>
          {bot.enabled ? <PowerOff className="w-4 h-4 mr-1" /> : <Power className="w-4 h-4 mr-1" />}
          {bot.enabled ? "Deactivate" : "Activate"}
        </Button>
        {!bot.enabled && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={handleDelete} disabled={actionLoading}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b">
        {(["overview", "rooms", "features", "config"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "overview" ? "Overview" : t === "rooms" ? `Rooms (${bot.rooms.length})` : t === "features" ? "Features" : "Configuration"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg border bg-card">
              <span className="text-xs text-muted-foreground">Template</span>
              <p className="text-sm font-medium mt-0.5">{bot.templateId}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <span className="text-xs text-muted-foreground">Status</span>
              <p className={`text-sm font-medium mt-0.5 ${statusColor}`}>{bot.status}</p>
              {bot.statusDetail && <p className="text-xs text-muted-foreground mt-0.5">{bot.statusDetail}</p>}
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <span className="text-xs text-muted-foreground">Matrix User</span>
              <p className="text-sm font-medium mt-0.5">{bot.matrixUserId ?? "Not provisioned"}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <span className="text-xs text-muted-foreground">Created</span>
              <p className="text-sm font-medium mt-0.5">{new Date(bot.createdAt).toLocaleDateString()}</p>
              {bot.createdBy && <p className="text-xs text-muted-foreground mt-0.5">by {bot.createdBy}</p>}
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-1.5"><Key className="w-4 h-4" /> Access Token</h3>
            <p className="text-xs text-muted-foreground">Set the bot&apos;s Matrix access token. The token is encrypted at rest and never displayed after being set.</p>

            {bot.localpart && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Automatic Provisioning</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create the bot user <code className="bg-muted px-1 py-0.5 rounded">@{bot.localpart}</code> on the homeserver and generate an access token automatically.
                </p>
                <Button size="sm" onClick={handleProvisionToken} disabled={provisionLoading || actionLoading}>
                  {provisionLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                  Provision Token
                </Button>
                {provisionMsg && (
                  <div className={`text-xs p-2 rounded ${provisionMsg.type === "success" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>
                    {provisionMsg.text}
                  </div>
                )}
              </div>
            )}

            {!bot.localpart && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200">Set a localpart for this bot to enable automatic token provisioning.</p>
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Or paste an existing token manually:</p>
              <div className="flex gap-2">
                <input type="password" placeholder="syt_..." value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
                <Button size="sm" onClick={handleSetToken} disabled={actionLoading || !tokenInput}>
                  <Key className="w-4 h-4 mr-1" /> Set Token
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rooms" && (
        <div className="space-y-4">
          {bot.rooms.length > 0 && (
            <div className="space-y-2">
              {bot.rooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{room.roomId}</span>
                      {room.roomAlias && <span className="text-xs text-muted-foreground">{room.roomAlias}</span>}
                    </div>
                    {room.active ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleUnassignRoom(room.roomId)} disabled={actionLoading} className="text-destructive hover:text-destructive">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
            <h3 className="text-sm font-medium">Assign to Room</h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { if (!roomsLoaded) fetchRooms(); setShowRoomDropdown(!showRoomDropdown); }}
                  disabled={roomsLoading}
                >
                  {roomsLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                  {showRoomDropdown ? "Hide Rooms" : "Browse Rooms"}
                </Button>
                {roomsLoaded && <span className="text-xs text-muted-foreground">{synapseRooms.length} rooms loaded</span>}
              </div>

              {showRoomDropdown && (
                <div className="border rounded-lg bg-background">
                  <div className="p-2 border-b">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search rooms..."
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") fetchRooms(roomSearch); }}
                        className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => fetchRooms(roomSearch)} disabled={roomsLoading}>
                        <Search className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {roomsError && (
                    <div className="p-3 text-xs text-red-500 bg-red-50 dark:bg-red-950">{roomsError}</div>
                  )}

                  <div className="max-h-64 overflow-y-auto">
                    {synapseRooms.length === 0 && roomsLoaded && !roomsLoading && (
                      <div className="p-4 text-center text-xs text-muted-foreground">No rooms found</div>
                    )}
                    {synapseRooms
                      .filter((r) => {
                        if (!roomSearch) return true;
                        const q = roomSearch.toLowerCase();
                        return (
                          r.room_id.toLowerCase().includes(q) ||
                          (r.name?.toLowerCase().includes(q) ?? false) ||
                          (r.canonical_alias?.toLowerCase().includes(q) ?? false)
                        );
                      })
                      .map((room) => {
                        const alreadyAssigned = bot.rooms.some((r) => r.roomId === room.room_id);
                        return (
                          <button
                            key={room.room_id}
                            onClick={() => handleSelectRoom(room)}
                            disabled={alreadyAssigned}
                            className={`w-full text-left px-3 py-2 border-b last:border-b-0 transition-colors ${
                              alreadyAssigned
                                ? "opacity-50 cursor-not-allowed bg-muted/50"
                                : "hover:bg-muted/50 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium truncate">{room.name || room.room_id}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 ml-5">
                                  {room.canonical_alias && (
                                    <span className="text-xs text-muted-foreground truncate">{room.canonical_alias}</span>
                                  )}
                                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                    <Users className="w-3 h-3" /> {room.joined_members}
                                  </span>
                                  {room.join_rules && (
                                    <span className="text-xs px-1 py-0.5 rounded bg-muted text-muted-foreground">{room.join_rules}</span>
                                  )}
                                </div>
                              </div>
                              {alreadyAssigned && (
                                <span className="text-xs text-muted-foreground shrink-0">assigned</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">Room ID <span className="text-red-500">*</span></label>
                <input type="text" placeholder="!roomid:example.com" value={newRoomId} onChange={(e) => setNewRoomId(e.target.value)} className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Room Alias (optional)</label>
                <input type="text" placeholder="#room:example.com" value={newRoomAlias} onChange={(e) => setNewRoomAlias(e.target.value)} className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={handleAssignRoom} disabled={actionLoading || !newRoomId}>
              <Plus className="w-4 h-4 mr-1" /> Assign Room
            </Button>
          </div>
        </div>
      )}

      {activeTab === "features" && (
        <div className="space-y-3">
          {ALL_FEATURES.map((feat) => {
            const flag = bot.features.find((f) => f.featureKey === feat.key && f.scope === "global");
            const isEnabled = flag?.enabled ?? false;
            return (
              <div key={feat.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div>
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{feat.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-6">{feat.description}</p>
                </div>
                <button
                  onClick={() => handleToggleFeature(feat.key, !isEnabled)}
                  disabled={actionLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "config" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">Bot configuration as JSON. Edit and save to apply changes.</p>
          <textarea
            value={JSON.stringify(configValues, null, 2)}
            onChange={(e) => {
              try { setConfigValues(JSON.parse(e.target.value)); } catch { /* allow in-progress edits */ }
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[200px]"
          />
          <Button onClick={handleSaveConfig} disabled={actionLoading}>
            {actionLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Settings className="w-4 h-4 mr-1" />}
            Save Configuration
          </Button>
        </div>
      )}
    </div>
  );
}
