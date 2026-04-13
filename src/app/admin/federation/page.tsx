"use client";

import { useState, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { usePolling } from "@/hooks/use-polling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, RefreshCw, RotateCcw, Search } from "lucide-react";

interface FederationDest {
  destination: string;
  retry_last_ts: number;
  retry_interval: number;
  failure_ts: number | null;
  last_successful_stream_ordering: number | null;
}

export default function FederationPage() {
  const { current } = useServerContext();
  const [destinations, setDestinations] = useState<FederationDest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ serverId: current.id, limit: "100" });
      if (search) params.set("destination", search);
      const res = await fetch(`/api/admin/federation?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDestinations(data.destinations || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [current, search]);

  usePolling(() => fetchDestinations(), { intervalMs: 30_000, enabled: !!current }, [current?.id, search]);

  async function resetConnection(destination: string) {
    if (!current) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/federation?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`Connection to ${destination} reset successfully`);
      fetchDestinations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    }
  }

  function formatTs(ts: number): string {
    if (!ts || ts === 0) return "—";
    return new Date(ts).toLocaleString();
  }

  function formatInterval(ms: number): string {
    if (!ms || ms === 0) return "—";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to view federation status.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="h-6 w-6" /> Federation Monitoring</h1>
          <p className="text-muted-foreground text-sm">Monitor federation destinations and retry failed connections.</p>
        </div>
        <Button onClick={fetchDestinations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Load
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {actionMsg && <div className="rounded-lg border border-green-500 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">{actionMsg}</div>}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Filter by destination..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchDestinations()} />
        </div>
      </div>

      {destinations.length > 0 && (
        <div className="rounded-lg border">
          <div className="grid grid-cols-5 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
            <div>Destination</div><div>Last Retry</div><div>Retry Interval</div><div>Failed Since</div><div className="text-right">Actions</div>
          </div>
          {destinations.map((d) => (
            <div key={d.destination} className="grid grid-cols-5 gap-4 p-3 text-sm border-b last:border-0 hover:bg-muted/50 items-center">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full shrink-0 ${d.failure_ts ? "bg-red-500" : "bg-green-500"}`} />
                <span className="truncate font-mono text-xs">{d.destination}</span>
              </div>
              <div className="text-xs">{formatTs(d.retry_last_ts)}</div>
              <div className="text-xs">{formatInterval(d.retry_interval)}</div>
              <div className="text-xs">{d.failure_ts ? formatTs(d.failure_ts) : "—"}</div>
              <div className="text-right">
                {d.failure_ts && (
                  <Button variant="outline" size="sm" onClick={() => resetConnection(d.destination)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="p-3 text-xs text-muted-foreground">
            Total: {total} destinations • <span className="text-red-500">{destinations.filter((d) => d.failure_ts).length} failing</span>
          </div>
        </div>
      )}
    </div>
  );
}
