"use client";

import { useState, useEffect } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2, Server,
  Container, FileKey, Shield, Bot, Puzzle, Hash, Key, LogIn,
} from "lucide-react";

interface BotRoomHealth {
  roomId: string;
  roomAlias: string | null;
  assigned: boolean;
  joined: boolean;
}

interface BotHealthData {
  ok: boolean;
  displayName: string;
  localpart: string | null;
  matrixUserId: string | null;
  enabled: boolean;
  status: string;
  hasToken: boolean;
  tokenValid: boolean | null;
  tokenUserId: string | null;
  rooms: BotRoomHealth[];
  errors: string[];
  detail?: string;
}

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
  botHealth: Record<string, BotHealthData>;
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

function TokenStatusBadge({ hasToken, tokenValid }: { hasToken: boolean; tokenValid: boolean | null }) {
  if (!hasToken) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
        <XCircle className="w-3 h-3" /> No token
      </span>
    );
  }
  if (tokenValid === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
        <Key className="w-3 h-3" /> Token set (not verified)
      </span>
    );
  }
  if (tokenValid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
        <CheckCircle2 className="w-3 h-3" /> Token valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
      <XCircle className="w-3 h-3" /> Token invalid
    </span>
  );
}

export default function IntegrationDiagnosticsPage() {
  const { current } = useServerContext();
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDiagnostics() {
    setLoading(true);
    setError(null);
    try {
      const params = current?.id ? `?serverId=${current.id}` : "";
      const res = await fetch(`/api/admin/integrations/diagnostics${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.diagnostics);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.error || `Failed to load diagnostics (${res.status})`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDiagnostics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 space-y-3">
        <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto" />
        <p className="text-muted-foreground">{error || "Failed to load diagnostics."}</p>
        <Button variant="outline" size="sm" onClick={fetchDiagnostics}>
          <RefreshCw className="w-4 h-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  const botEntries = Object.entries(data.botHealth);
  const botsOk = botEntries.filter(([, h]) => h.ok).length;
  const botsTotal = botEntries.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integration Diagnostics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System health, bot status, and capability checks.
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

      <div className="p-4 rounded-lg border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Bot Health</span>
          </div>
          {botsTotal > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${botsOk === botsTotal ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"}`}>
              {botsOk}/{botsTotal} healthy
            </span>
          )}
        </div>

        {botsTotal === 0 && (
          <p className="text-xs text-muted-foreground">No bots configured on this server.</p>
        )}

        {botEntries.map(([id, h]) => (
          <div key={id} className={`p-3 rounded-lg border ${h.ok ? "border-green-500/20 bg-green-500/5" : h.enabled ? "border-red-500/20 bg-red-500/5" : "border-muted bg-muted/30"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {h.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : h.enabled ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{h.displayName}</span>
                {h.matrixUserId && (
                  <code className="text-xs text-muted-foreground truncate hidden sm:block">{h.matrixUserId}</code>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded ${h.enabled ? (h.status === "running" ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300") : "bg-muted text-muted-foreground"}`}>
                  {h.enabled ? h.status : "disabled"}
                </span>
                <TokenStatusBadge hasToken={h.hasToken} tokenValid={h.tokenValid} />
              </div>
            </div>

            {h.rooms.length > 0 && (
              <div className="mt-2 ml-6 space-y-1">
                {h.rooms.map((room) => (
                  <div key={room.roomId} className="flex items-center gap-2 text-xs">
                    <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate text-muted-foreground">{room.roomAlias || room.roomId}</span>
                    {room.assigned && room.joined ? (
                      <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400 shrink-0">
                        <LogIn className="w-3 h-3" /> joined
                      </span>
                    ) : room.assigned ? (
                      <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400 shrink-0">
                        <XCircle className="w-3 h-3" /> not joined
                      </span>
                    ) : (
                      <span className="text-muted-foreground shrink-0">inactive</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {h.errors.length > 0 && (
              <div className="mt-2 ml-6 space-y-0.5">
                {h.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

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
