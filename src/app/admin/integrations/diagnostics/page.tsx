"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2, Server,
  Container, FileKey, Shield, Bot, Puzzle,
} from "lucide-react";

interface DiagnosticsData {
  synapseConnectivity: boolean;
  appserviceRegistrationOk: boolean;
  filesystemWritable: boolean;
  dockerAvailable: boolean;
  dockerComposeAvailable: boolean;
  capabilityMode: string;
  envVarsPresent: string[];
  envVarsMissing: string[];
  integrationHealth: Record<string, { ok: boolean; status: string; detail?: string; checkedAt: string }>;
  botHealth: Record<string, { ok: boolean; detail?: string }>;
  errors: string[];
  checkedAt: string;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function IntegrationDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDiagnostics() {
    setLoading(true);
    const res = await fetch("/api/admin/integrations/diagnostics");
    if (res.ok) {
      const json = await res.json();
      setData(json.diagnostics);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-muted-foreground py-12">Failed to load diagnostics.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integration Diagnostics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System health and capability checks for the integration platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDiagnostics} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className={`p-4 rounded-lg border ${data.capabilityMode === "managed" ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
        <div className="flex items-center gap-2">
          {data.capabilityMode === "managed" ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          )}
          <span className="font-medium">
            {data.capabilityMode === "managed" ? "Managed Mode" : "Guided Mode"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {data.capabilityMode === "managed"
            ? "The system has the necessary permissions to manage integration services directly."
            : "The system will generate configuration files and provide instructions for manual application."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Synapse</span>
          </div>
          <StatusBadge ok={data.synapseConnectivity} label="Synapse reachable" />
        </div>

        <div className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Container className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Docker</span>
          </div>
          <StatusBadge ok={data.dockerAvailable} label="Docker available" />
          <StatusBadge ok={data.dockerComposeAvailable} label="Docker Compose available" />
        </div>

        <div className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <FileKey className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filesystem</span>
          </div>
          <StatusBadge ok={data.filesystemWritable} label="Data directory writable" />
          <StatusBadge ok={data.appserviceRegistrationOk} label="Appservice dir writable" />
        </div>
      </div>

      <div className="p-4 rounded-lg border bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Environment Variables</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-xs font-medium text-green-600">Present ({data.envVarsPresent.length})</span>
            <div className="mt-1 space-y-0.5">
              {data.envVarsPresent.map((v) => (
                <div key={v} className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <code className="text-muted-foreground">{v}</code>
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-red-600">Missing ({data.envVarsMissing.length})</span>
            <div className="mt-1 space-y-0.5">
              {data.envVarsMissing.length === 0 ? (
                <span className="text-xs text-muted-foreground">None</span>
              ) : (
                data.envVarsMissing.map((v) => (
                  <div key={v} className="flex items-center gap-1.5 text-xs">
                    <XCircle className="w-3 h-3 text-red-500" />
                    <code className="text-muted-foreground">{v}</code>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {Object.keys(data.integrationHealth).length > 0 && (
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Puzzle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Integration Health</span>
          </div>
          <div className="space-y-2">
            {Object.entries(data.integrationHealth).map(([id, h]) => (
              <div key={id} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                <div className="flex items-center gap-2">
                  {h.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  <span className="text-xs font-medium">{id.slice(0, 12)}...</span>
                  <span className="text-xs text-muted-foreground">{h.status}</span>
                </div>
                {h.detail && <span className="text-xs text-muted-foreground">{h.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(data.botHealth).length > 0 && (
        <div className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Bot Health</span>
          </div>
          <div className="space-y-2">
            {Object.entries(data.botHealth).map(([id, h]) => (
              <div key={id} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                <div className="flex items-center gap-2">
                  {h.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  <span className="text-xs font-medium">{id.slice(0, 12)}...</span>
                </div>
                {h.detail && <span className="text-xs text-muted-foreground">{h.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.errors.length > 0 && (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-600">Issues Detected</span>
          </div>
          <ul className="space-y-1">
            {data.errors.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground">{e}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        Last checked: {new Date(data.checkedAt).toLocaleString()}
      </p>
    </div>
  );
}
