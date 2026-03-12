"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  actor: string | null;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

const PAGE_SIZE = 25;

const actionColors: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  "token.created": "success",
  "token.updated": "default",
  "token.disabled": "warning",
  "token.deleted": "destructive",
  "registration.attempt": "secondary",
  "registration.success": "success",
  "registration.failure": "destructive",
  "admin.login": "default",
  "admin.logout": "secondary",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (currentOffset: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit?limit=${PAGE_SIZE}&offset=${currentOffset}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(offset); }, [offset, fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Activity history for tokens and registrations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(offset)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No audit entries yet</p>
            <p className="text-sm">Activity will appear here as actions are performed.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Badge variant={actionColors[log.action] ?? "default"} className="shrink-0">
                      {log.action}
                    </Badge>
                    {log.target && <code className="text-xs text-muted-foreground truncate">{log.target}</code>}
                    {log.actor && <span className="text-xs text-muted-foreground">by {log.actor}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {log.ip && <span>{log.ip}</span>}
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
