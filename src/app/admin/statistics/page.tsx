"use client";

import { useState, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, RefreshCw, Search } from "lucide-react";

interface UserMediaStat {
  user_id: string;
  displayname: string;
  media_count: number;
  media_length: number;
}

export default function StatisticsPage() {
  const { current } = useServerContext();
  const [stats, setStats] = useState<UserMediaStat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("media_length");

  const fetchStats = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        serverId: current.id,
        mode: "stats",
        limit: "100",
        order_by: orderBy,
        dir: "b",
      });
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
  }, [current, search, orderBy]);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  const totalSize = stats.reduce((sum, s) => sum + s.media_length, 0);
  const totalCount = stats.reduce((sum, s) => sum + s.media_count, 0);

  if (!current) {
    return <div className="text-muted-foreground">Select a server to view statistics.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Server Statistics</h1>
          <p className="text-muted-foreground text-sm">Media usage statistics per user via Synapse Admin API.</p>
        </div>
        <Button onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Load
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {stats.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-sm text-muted-foreground">Total Users with Media</div>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{totalCount.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Media Items (shown)</div>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
            <div className="text-sm text-muted-foreground">Total Media Size (shown)</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchStats()} />
        </div>
        <select className="rounded-md border px-3 py-2 text-sm bg-background" value={orderBy} onChange={(e) => setOrderBy(e.target.value)}>
          <option value="media_length">Sort by Size</option>
          <option value="media_count">Sort by Count</option>
          <option value="user_id">Sort by User ID</option>
          <option value="displayname">Sort by Display Name</option>
        </select>
      </div>

      {stats.length > 0 && (
        <div className="rounded-lg border">
          <div className="grid grid-cols-4 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
            <div>User</div><div>Display Name</div><div className="text-right">Media Count</div><div className="text-right">Total Size</div>
          </div>
          {stats.map((u) => {
            const pct = totalSize > 0 ? (u.media_length / totalSize) * 100 : 0;
            return (
              <div key={u.user_id} className="relative grid grid-cols-4 gap-4 p-3 text-sm border-b last:border-0 hover:bg-muted/50">
                <div className="absolute inset-0 bg-primary/5" style={{ width: `${pct}%` }} />
                <div className="relative truncate font-mono text-xs">{u.user_id}</div>
                <div className="relative truncate">{u.displayname || "—"}</div>
                <div className="relative text-right">{u.media_count.toLocaleString()}</div>
                <div className="relative text-right font-medium">{formatBytes(u.media_length)}</div>
              </div>
            );
          })}
          <div className="p-3 text-xs text-muted-foreground">Showing {stats.length} of {total} users</div>
        </div>
      )}
    </div>
  );
}
