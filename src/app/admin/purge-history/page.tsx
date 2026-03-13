"use client";

import { useState } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, RefreshCw, AlertTriangle } from "lucide-react";

export default function PurgeHistoryPage() {
  const { current } = useServerContext();
  const [roomId, setRoomId] = useState("");
  const [purgeUpToTs, setPurgeUpToTs] = useState("");
  const [purgeUpToEventId, setPurgeUpToEventId] = useState("");
  const [deleteLocal, setDeleteLocal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  async function startPurge() {
    if (!current || !roomId) return;
    if (!confirm("This will permanently delete message history. Continue?")) return;
    setLoading(true);
    setError(null);
    setPurgeId(null);
    setPurgeStatus(null);
    try {
      const body: Record<string, unknown> = { delete_local_events: deleteLocal };
      if (purgeUpToTs) body.purge_up_to_ts = new Date(purgeUpToTs).getTime();
      if (purgeUpToEventId) body.purge_up_to_event_id = purgeUpToEventId;

      const res = await fetch(`/api/admin/purge-history?serverId=${current.id}&roomId=${encodeURIComponent(roomId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details));
      setPurgeId(data.purge_id);
      setPurgeStatus("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purge failed");
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    if (!current || !purgeId) return;
    try {
      const res = await fetch(`/api/admin/purge-history?serverId=${current.id}&purgeId=${purgeId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPurgeStatus(data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status check failed");
    }
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to purge history.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trash2 className="h-6 w-6" /> Purge History</h1>
        <p className="text-muted-foreground text-sm">Permanently delete old messages from a room. Useful for GDPR compliance or storage savings.</p>
      </div>

      <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">Destructive Operation</p>
          <p className="text-muted-foreground">Purged messages cannot be recovered. Ensure you have backups if needed.</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="rounded-lg border p-4 space-y-4 max-w-xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Room ID</label>
          <Input placeholder="!roomId:server" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Purge Up To Date</label>
          <Input type="datetime-local" value={purgeUpToTs} onChange={(e) => setPurgeUpToTs(e.target.value)} />
          <p className="text-xs text-muted-foreground">All messages before this date will be deleted.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Or Purge Up To Event ID</label>
          <Input placeholder="$eventId" value={purgeUpToEventId} onChange={(e) => setPurgeUpToEventId(e.target.value)} />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="deleteLocal" checked={deleteLocal} onChange={(e) => setDeleteLocal(e.target.checked)} className="rounded" />
          <label htmlFor="deleteLocal" className="text-sm">Also delete events sent by local users</label>
        </div>

        <Button variant="destructive" onClick={startPurge} disabled={loading || !roomId || (!purgeUpToTs && !purgeUpToEventId)}>
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Start Purge
        </Button>
      </div>

      {purgeId && (
        <div className="rounded-lg border p-4 space-y-3 max-w-xl">
          <h3 className="font-semibold">Purge Status</h3>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs">{purgeId}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              purgeStatus === "complete" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
              purgeStatus === "failed" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
              "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
            }`}>
              {purgeStatus}
            </span>
            <Button variant="outline" size="sm" onClick={checkStatus}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
