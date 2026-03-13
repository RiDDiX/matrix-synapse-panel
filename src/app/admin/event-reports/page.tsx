"use client";

import { useState, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flag, RefreshCw, Trash2, Eye } from "lucide-react";

interface EventReportItem {
  id: number;
  received_ts: number;
  room_id: string;
  name: string | null;
  event_id: string;
  user_id: string;
  reason: string | null;
  score: number | null;
  canonical_alias: string | null;
  sender: string;
}

export default function EventReportsPage() {
  const { current } = useServerContext();
  const [reports, setReports] = useState<EventReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<EventReportItem | null>(null);
  const [filterRoom, setFilterRoom] = useState("");

  const fetchReports = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ serverId: current.id, limit: "100", dir: "b" });
      if (filterRoom) params.set("room_id", filterRoom);
      const res = await fetch(`/api/admin/event-reports?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReports(data.event_reports || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [current, filterRoom]);

  async function deleteReport(reportId: number) {
    if (!current || !confirm("Delete this event report?")) return;
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/event-reports?serverId=${current.id}&reportId=${reportId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`Report #${reportId} deleted`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReport?.id === reportId) setSelectedReport(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function viewReport(reportId: number) {
    if (!current) return;
    try {
      const res = await fetch(`/api/admin/event-reports?serverId=${current.id}&reportId=${reportId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    }
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to view event reports.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Flag className="h-6 w-6" /> Event Reports</h1>
          <p className="text-muted-foreground text-sm">Review and manage reported content from users.</p>
        </div>
        <Button onClick={fetchReports} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Load
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {actionMsg && <div className="rounded-lg border border-green-500 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">{actionMsg}</div>}

      <div className="flex items-center gap-2">
        <Input placeholder="Filter by Room ID..." value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchReports()} className="max-w-md" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border">
          {reports.length === 0 && !loading && (
            <div className="p-8 text-center text-muted-foreground">No reports. Click Load to fetch.</div>
          )}
          {reports.length > 0 && (
            <>
              <div className="grid grid-cols-6 gap-2 p-3 text-xs font-medium text-muted-foreground border-b">
                <div>ID</div><div>Reporter</div><div>Room</div><div>Reason</div><div>Date</div><div className="text-right">Actions</div>
              </div>
              {reports.map((r) => (
                <div key={r.id} className={`grid grid-cols-6 gap-2 p-3 text-sm border-b last:border-0 hover:bg-muted/50 items-center cursor-pointer ${selectedReport?.id === r.id ? "bg-muted" : ""}`} onClick={() => viewReport(r.id)}>
                  <div className="font-mono text-xs">#{r.id}</div>
                  <div className="truncate text-xs">{r.user_id}</div>
                  <div className="truncate text-xs">{r.name || r.canonical_alias || r.room_id}</div>
                  <div className="truncate text-xs">{r.reason || "—"}</div>
                  <div className="text-xs">{new Date(r.received_ts).toLocaleDateString()}</div>
                  <div className="text-right flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); viewReport(r.id); }}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="p-3 text-xs text-muted-foreground">Total: {total} reports</div>
            </>
          )}
        </div>

        {selectedReport && (
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold">Report #{selectedReport.id}</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground text-xs">Reporter</dt><dd className="font-mono text-xs break-all">{selectedReport.user_id}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Sender (reported)</dt><dd className="font-mono text-xs break-all">{selectedReport.sender}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Room</dt><dd className="font-mono text-xs break-all">{selectedReport.room_id}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Event ID</dt><dd className="font-mono text-xs break-all">{selectedReport.event_id}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Reason</dt><dd>{selectedReport.reason || "—"}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Score</dt><dd>{selectedReport.score ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground text-xs">Date</dt><dd>{new Date(selectedReport.received_ts).toLocaleString()}</dd></div>
            </dl>
            <Button variant="destructive" size="sm" onClick={() => deleteReport(selectedReport.id)}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
