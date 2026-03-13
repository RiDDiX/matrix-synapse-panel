"use client";

import { useState } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";

type ExportType = "tokens" | "audit_logs" | "servers";

export default function ExportPage() {
  const { current } = useServerContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doExport(type: ExportType, format: "json" | "csv") {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type, format, serverId: current.id });
      const res = await fetch(`/api/admin/export?${params}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_${current.slug}_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to export data.</div>;
  }

  const exports: { type: ExportType; label: string; desc: string }[] = [
    { type: "tokens", label: "Registration Tokens", desc: "Export all token metadata including labels, notes, and creation dates." },
    { type: "audit_logs", label: "Audit Logs", desc: "Export audit trail with actions, actors, targets, and timestamps." },
    { type: "servers", label: "Server Configurations", desc: "Export server list with names, URLs, and status (no secrets)." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Download className="h-6 w-6" /> Data Export</h1>
        <p className="text-muted-foreground text-sm">Export data as JSON or CSV for backup and compliance purposes.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        {exports.map((exp) => (
          <div key={exp.type} className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold">{exp.label}</h3>
            <p className="text-sm text-muted-foreground">{exp.desc}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => doExport(exp.type, "json")} disabled={loading}>
                <FileJson className="h-4 w-4 mr-1" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => doExport(exp.type, "csv")} disabled={loading}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
