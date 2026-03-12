"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Power, PowerOff, Trash2, Activity, FileText, Key, Settings,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Copy,
} from "lucide-react";

interface Integration {
  id: string;
  catalogId: string;
  name: string;
  type: string;
  deploymentMode: string;
  status: string;
  enabled: boolean;
  version: string;
  configJson: string | null;
  statusDetail: string | null;
  lastHealthAt: string | null;
  lastHealthOk: boolean | null;
  appserviceId: string | null;
  appserviceFile: string | null;
  secrets: { id: string; key: string; rotatedAt: string | null; createdAt: string }[];
  configs: { id: string; version: number; configJson: string; appliedAt: string | null; createdAt: string }[];
}

interface ConfigField {
  key: string;
  label: string;
  description: string;
  type: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  section?: string;
}

interface CatalogEntryDetail {
  id: string;
  name: string;
  type: string;
  description: string;
  longDescription?: string;
  configFields: ConfigField[];
  riskNotes: string[];
  compatibilityNotes: string[];
  documentationUrl?: string;
  requiredSynapseChanges: { type: string; description: string; automatable: boolean }[];
}

interface GeneratedFile {
  filename: string;
  content: string;
  description: string;
  type: string;
}

export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [catalogEntry, setCatalogEntry] = useState<CatalogEntryDetail | null>(null);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "config" | "files" | "secrets">("overview");
  const [configValues, setConfigValues] = useState<Record<string, string | number | boolean>>({});
  const [secretKey, setSecretKey] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [healthResult, setHealthResult] = useState<{ ok: boolean; status: string; detail?: string } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/admin/integrations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setIntegration(data.integration);
      setCatalogEntry(data.catalogEntry);
      setFiles(data.files ?? []);
      if (data.integration?.configJson) {
        try {
          setConfigValues(JSON.parse(data.integration.configJson));
        } catch { /* ignore */ }
      }
    }
  }, [id]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  async function handleAction(action: string) {
    setActionLoading(true);
    const res = await fetch(`/api/admin/integrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (action === "health" && res.ok) {
      const data = await res.json();
      setHealthResult(data.health);
    }
    await fetchData();
    setActionLoading(false);
  }

  async function handleSaveConfig() {
    setActionLoading(true);
    await fetch(`/api/admin/integrations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: configValues }),
    });
    await fetchData();
    setActionLoading(false);
  }

  async function handleSetSecret() {
    if (!secretKey || !secretValue) return;
    setActionLoading(true);
    await fetch(`/api/admin/integrations/${id}/secrets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: secretKey, value: secretValue }),
    });
    setSecretKey("");
    setSecretValue("");
    await fetchData();
    setActionLoading(false);
  }

  async function handleUninstall() {
    if (!confirm("Uninstall this integration? This cannot be undone.")) return;
    setActionLoading(true);
    await fetch(`/api/admin/integrations/${id}`, { method: "DELETE" });
    router.push("/admin/integrations");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Integration not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/integrations")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  const statusColor = integration.status === "running" || integration.status === "enabled"
    ? "text-green-500" : integration.status === "failed" ? "text-red-500"
    : integration.status === "degraded" ? "text-yellow-500" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/integrations")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{integration.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-sm font-medium ${statusColor}`}>{integration.status}</span>
            <span className="text-xs text-muted-foreground">v{integration.version}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{integration.deploymentMode} mode</span>
          </div>
        </div>
      </div>

      {integration.deploymentMode === "guided" && (
        <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Guided Mode</p>
              <p className="text-xs text-muted-foreground mt-1">
                This integration is in guided mode. Generated files must be applied manually. Check the Files tab for generated configurations and instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={integration.enabled ? "destructive" : "default"} onClick={() => handleAction(integration.enabled ? "disable" : "enable")} disabled={actionLoading}>
          {integration.enabled ? <PowerOff className="w-4 h-4 mr-1" /> : <Power className="w-4 h-4 mr-1" />}
          {integration.enabled ? "Disable" : "Enable"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleAction("health")} disabled={actionLoading}>
          <Activity className="w-4 h-4 mr-1" /> Health Check
        </Button>
        {!integration.enabled && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={handleUninstall} disabled={actionLoading}>
            <Trash2 className="w-4 h-4 mr-1" /> Uninstall
          </Button>
        )}
      </div>

      {healthResult && (
        <div className={`p-3 rounded-lg border ${healthResult.ok ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <div className="flex items-center gap-2">
            {healthResult.ok ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
            <span className="text-sm font-medium">{healthResult.ok ? "Healthy" : "Unhealthy"}</span>
            {healthResult.detail && <span className="text-xs text-muted-foreground">— {healthResult.detail}</span>}
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b">
        {(["overview", "config", "files", "secrets"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "overview" ? "Overview" : t === "config" ? "Configuration" : t === "files" ? "Generated Files" : "Secrets"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && catalogEntry && (
        <div className="space-y-4">
          {catalogEntry.longDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed">{catalogEntry.longDescription}</p>
          )}
          {catalogEntry.documentationUrl && (
            <a href={catalogEntry.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              Documentation →
            </a>
          )}
          {catalogEntry.requiredSynapseChanges.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Required Synapse Changes</h3>
              {catalogEntry.requiredSynapseChanges.map((c, i) => (
                <div key={i} className="p-3 rounded border bg-muted/50 text-xs mb-2">
                  <span className="font-medium">{c.type.replace(/_/g, " ")}</span>
                  {!c.automatable && <span className="ml-2 text-yellow-600">(manual step)</span>}
                  <p className="mt-1 text-muted-foreground">{c.description}</p>
                </div>
              ))}
            </div>
          )}
          {catalogEntry.riskNotes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Risk Notes</h3>
              <ul className="space-y-1">
                {catalogEntry.riskNotes.map((n, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === "config" && catalogEntry && (
        <div className="space-y-4">
          {catalogEntry.configFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No configurable fields for this integration.</p>
          ) : (
            <>
              {Object.entries(
                catalogEntry.configFields.reduce<Record<string, ConfigField[]>>((acc, f) => {
                  const s = f.section ?? "General";
                  (acc[s] ??= []).push(f);
                  return acc;
                }, {})
              ).map(([section, fields]) => (
                <div key={section}>
                  <h3 className="text-sm font-medium mb-2">{section}</h3>
                  <div className="space-y-3">
                    {fields.map((field) => (
                      <div key={field.key}>
                        <label className="text-xs font-medium">{field.label}{field.required && <span className="text-red-500">*</span>}</label>
                        <p className="text-xs text-muted-foreground mb-1">{field.description}</p>
                        {field.type === "boolean" ? (
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={!!configValues[field.key]} onChange={(e) => setConfigValues((v) => ({ ...v, [field.key]: e.target.checked }))} className="rounded" />
                            <span className="text-xs">Enabled</span>
                          </label>
                        ) : field.type === "textarea" ? (
                          <textarea
                            value={String(configValues[field.key] ?? field.defaultValue ?? "")}
                            onChange={(e) => setConfigValues((v) => ({ ...v, [field.key]: e.target.value }))}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                          />
                        ) : (
                          <input
                            type={field.type === "number" || field.type === "port" ? "number" : "text"}
                            value={String(configValues[field.key] ?? field.defaultValue ?? "")}
                            onChange={(e) => setConfigValues((v) => ({ ...v, [field.key]: field.type === "number" || field.type === "port" ? Number(e.target.value) : e.target.value }))}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={handleSaveConfig} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Settings className="w-4 h-4 mr-1" />}
                Save Configuration
              </Button>
            </>
          )}
        </div>
      )}

      {activeTab === "files" && (
        <div className="space-y-4">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No generated files.</p>
          ) : (
            files.map((file) => (
              <div key={file.filename} className="rounded-lg border">
                <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.filename}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{file.type.replace(/_/g, " ")}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(file.content)}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="p-3 text-xs overflow-x-auto max-h-64">{file.content}</pre>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "secrets" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Secrets are encrypted at rest. Values are never displayed after being set.
          </p>
          {integration.secrets.length > 0 && (
            <div className="space-y-2">
              {integration.secrets.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded border bg-card">
                  <div>
                    <span className="text-sm font-medium">{s.key}</span>
                    <span className="text-xs text-muted-foreground ml-2">••••••••</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.rotatedAt ? `Rotated ${new Date(s.rotatedAt).toLocaleDateString()}` : `Created ${new Date(s.createdAt).toLocaleDateString()}`}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
            <h3 className="text-sm font-medium">Set or Rotate a Secret</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input type="text" placeholder="Secret key" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
              <input type="password" placeholder="Secret value" value={secretValue} onChange={(e) => setSecretValue(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm" />
            </div>
            <Button size="sm" onClick={handleSetSecret} disabled={actionLoading || !secretKey || !secretValue}>
              <Key className="w-4 h-4 mr-1" /> Set Secret
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
