"use client";

import { useState, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { usePolling } from "@/hooks/use-polling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, RefreshCw, Play, Pause } from "lucide-react";

interface BgUpdate {
  name: string;
  total_item_count: number;
  total_duration_ms: number;
  average_items_per_ms: number;
}

export default function BackgroundUpdatesPage() {
  const { current } = useServerContext();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [updates, setUpdates] = useState<Record<string, BgUpdate>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [jobName, setJobName] = useState("");

  const fetchStatus = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/background-updates?serverId=${current.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnabled(data.enabled);
      setUpdates(data.current_updates || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [current]);

  const hasRunningJobs = Object.keys(updates).length > 0;
  usePolling(
    () => fetchStatus(),
    { intervalMs: hasRunningJobs ? 5_000 : 60_000, enabled: !!current },
    [current?.id, hasRunningJobs]
  );

  async function toggleEnabled() {
    if (!current || enabled === null) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/background-updates?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", enabled: !enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnabled(data.enabled);
      setActionMsg(`Background updates ${data.enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed");
    }
  }

  async function startJob() {
    if (!current || !jobName) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/background-updates?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_job", job_name: jobName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`Job "${jobName}" started`);
      setJobName("");
      fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start job failed");
    }
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to view background updates.</div>;
  }

  const updateEntries = Object.entries(updates);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="h-6 w-6" /> Background Updates</h1>
          <p className="text-muted-foreground text-sm">Monitor and control Synapse database background updates.</p>
        </div>
        <Button onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Load Status
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {actionMsg && <div className="rounded-lg border border-green-500 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">{actionMsg}</div>}

      {enabled !== null && (
        <div className="rounded-lg border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${enabled ? "bg-green-500" : "bg-red-500"}`} />
            <span className="font-medium">Background Updates: {enabled ? "Enabled" : "Disabled"}</span>
          </div>
          <Button variant={enabled ? "destructive" : "default"} size="sm" onClick={toggleEnabled}>
            {enabled ? <><Pause className="h-4 w-4 mr-1" /> Disable</> : <><Play className="h-4 w-4 mr-1" /> Enable</>}
          </Button>
        </div>
      )}

      {updateEntries.length > 0 && (
        <div className="rounded-lg border">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">Running Updates</h3>
          </div>
          <div className="grid grid-cols-4 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
            <div>Database</div><div>Update Name</div><div className="text-right">Items Processed</div><div className="text-right">Duration</div>
          </div>
          {updateEntries.map(([db, update]) => (
            <div key={db} className="grid grid-cols-4 gap-4 p-3 text-sm border-b last:border-0">
              <div className="font-mono text-xs">{db}</div>
              <div className="text-xs">{update.name}</div>
              <div className="text-right">{update.total_item_count.toLocaleString()}</div>
              <div className="text-right">{formatDuration(update.total_duration_ms)}</div>
            </div>
          ))}
        </div>
      )}

      {enabled !== null && updateEntries.length === 0 && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No background updates currently running.
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-3 max-w-md">
        <h3 className="font-semibold text-sm">Start Background Job</h3>
        <p className="text-xs text-muted-foreground">Available jobs: populate_stats_process_rooms, regenerate_directory</p>
        <div className="flex gap-2">
          <Input placeholder="Job name" value={jobName} onChange={(e) => setJobName(e.target.value)} />
          <Button size="sm" onClick={startJob} disabled={!jobName}>
            <Play className="h-4 w-4 mr-1" /> Start
          </Button>
        </div>
      </div>
    </div>
  );
}
