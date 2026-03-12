"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useServerContext } from "@/lib/server-context";
import type { DiagnosticsResult } from "@/lib/types";

export default function DiagnosticsPage() {
  const { current, loading: serverLoading } = useServerContext();
  const [result, setResult] = useState<DiagnosticsResult | null>(null);
  const [loading, setLoading] = useState(true);

  async function runCheck() {
    if (!current) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/diagnostics?serverId=${current.id}`);
      if (!res.ok) throw new Error();
      setResult(await res.json());
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runCheck(); }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  if (serverLoading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!current) return <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><p>Select a homeserver to run diagnostics.</p></div>;

  function StatusIcon({ ok }: { ok: boolean | null }) {
    if (ok === null) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Diagnostics</h1>
          <p className="text-muted-foreground">Synapse connectivity and configuration checks.</p>
        </div>
        <Button variant="outline" size="sm" onClick={runCheck} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="ml-1">Re-check</span>
        </Button>
      </div>

      {loading && !result ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !result ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Could not run diagnostics. Check that the application backend is running.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Synapse Reachable</span>
                <StatusIcon ok={result.synapseReachable} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Admin API Reachable</span>
                <StatusIcon ok={result.adminApiReachable} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Token Endpoints Available</span>
                <StatusIcon ok={result.tokenEndpointsAvailable} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Registration Flow Available</span>
                <StatusIcon ok={result.registrationFlowAvailable} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Token Registration Supported</span>
                <StatusIcon ok={result.tokenRegistrationSupported} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Registration Enabled</span>
                <StatusIcon ok={result.registrationEnabled} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Server Name</span>
                <code className="text-sm">{result.serverName ?? "—"}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">MSC3861 / OIDC Detected</span>
                {result.msc3861Detected ? (
                  <Badge variant="destructive">Incompatible</Badge>
                ) : (
                  <Badge variant="success">Not detected</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.errors.map((err, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
