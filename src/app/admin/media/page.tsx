"use client";

import { useState, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, Search, Trash2, ShieldAlert, RefreshCw } from "lucide-react";

interface UserMediaStat {
  user_id: string;
  displayname: string;
  media_count: number;
  media_length: number;
}

export default function MediaPage() {
  const { current } = useServerContext();
  const [stats, setStats] = useState<UserMediaStat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [bulkServerName, setBulkServerName] = useState("");
  const [bulkBeforeDate, setBulkBeforeDate] = useState("");

  const fetchStats = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ serverId: current.id, mode: "stats", limit: "100", order_by: "media_length", dir: "b" });
      if (search) params.set("search_term", search);
      const res = await fetch(`/api/admin/media?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data.users || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [current, search]);

  async function doAction(action: string, payload: Record<string, unknown>) {
    if (!current) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/media?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`${action}: ${data.total ? `${data.total} items affected` : "success"}`);
      fetchStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to manage media.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Image className="h-6 w-6" /> Media Management</h1>
          <p className="text-muted-foreground text-sm">View media statistics, quarantine, and bulk delete media.</p>
        </div>
        <Button onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Load Stats
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {actionMsg && <div className="rounded-lg border border-green-500 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">{actionMsg}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold">Bulk Delete by Date</h3>
          <div className="flex gap-2">
            <Input placeholder="Server name (e.g. matrix.org)" value={bulkServerName} onChange={(e) => setBulkServerName(e.target.value)} />
            <Input type="date" value={bulkBeforeDate} onChange={(e) => setBulkBeforeDate(e.target.value)} />
          </div>
          <Button variant="destructive" size="sm" disabled={!bulkServerName || !bulkBeforeDate}
            onClick={() => doAction("delete_by_date", { server_name: bulkServerName, before_ts: new Date(bulkBeforeDate).getTime(), keep_profiles: true })}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete Old Media
          </Button>
        </div>
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold">Quarantine by User / Room</h3>
          <div className="flex gap-2">
            <Input id="quarantine-target" placeholder="@user:server or !roomId" />
            <Button size="sm" onClick={() => {
              const el = document.getElementById("quarantine-target") as HTMLInputElement;
              const val = el?.value;
              if (val?.startsWith("@")) doAction("quarantine_user", { user_id: val });
              else if (val?.startsWith("!")) doAction("quarantine_room", { room_id: val });
            }}>
              <ShieldAlert className="h-4 w-4 mr-1" /> Quarantine
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchStats()} />
          </div>
        </div>

        {stats.length > 0 && (
          <div className="rounded-lg border">
            <div className="grid grid-cols-4 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
              <div>User</div><div>Display Name</div><div className="text-right">Media Count</div><div className="text-right">Total Size</div>
            </div>
            {stats.map((u) => (
              <div key={u.user_id} className="grid grid-cols-4 gap-4 p-3 text-sm border-b last:border-0 hover:bg-muted/50">
                <div className="truncate font-mono text-xs">{u.user_id}</div>
                <div className="truncate">{u.displayname || "—"}</div>
                <div className="text-right">{u.media_count}</div>
                <div className="text-right">{formatBytes(u.media_length)}</div>
              </div>
            ))}
            <div className="p-3 text-xs text-muted-foreground">Total: {total} users</div>
          </div>
        )}
      </div>
    </div>
  );
}
