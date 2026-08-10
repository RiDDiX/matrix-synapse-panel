"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Server,
  ArrowLeft,
  Save,
  Activity,
  CheckCircle,
  XCircle,
  Shield,
  Key,
  Star,
} from "lucide-react";
import { useServerContext } from "@/lib/server-context";

interface ServerDetail {
  id: string;
  name: string;
  slug: string;
  serverName: string;
  internalUrl: string;
  publicUrl: string;
  status: string;
  enabled: boolean;
  isDefault: boolean;
  notes: string | null;
  publicDomain: string | null;
  routePrefix: string | null;
  brandingProfileId: string | null;
  capabilityMode: string | null;
  registrationMode: string | null;
  managedMode: string | null;
  lastDiagOk: boolean | null;
  lastDiagAt: string | null;
  diagJson: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DiagResult {
  synapseReachable: boolean;
  adminApiReachable: boolean;
  tokenEndpointsAvailable: boolean;
  registrationFlowAvailable: boolean;
  serverName: string | null;
  registrationEnabled: boolean | null;
  tokenRegistrationSupported: boolean;
  msc3861Detected: boolean;
  adminApiBaseUrl: string | null;
  adminApiFailureClass: string | null;
  errors: string[];
}

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { refresh: refreshServerContext } = useServerContext();
  const id = params.id as string;

  const [server, setServer] = useState<ServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "diagnostics" | "security">("overview");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [diag, setDiag] = useState<DiagResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);

  const fetchServer = useCallback(async () => {
    const res = await fetch(`/api/admin/servers/${id}`);
    if (res.ok) {
      const data = await res.json();
      setServer(data.server);
      setForm({
        name: data.server.name || "",
        slug: data.server.slug || "",
        serverName: data.server.serverName || "",
        internalUrl: data.server.internalUrl || "",
        publicUrl: data.server.publicUrl || "",
        notes: data.server.notes || "",
        publicDomain: data.server.publicDomain || "",
        routePrefix: data.server.routePrefix || "",
      });
      if (data.server.diagJson) {
        try {
          setDiag(JSON.parse(data.server.diagJson));
        } catch { /* ignore */ }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/admin/servers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg("Saved");
      // The name shows up in the sidebar selector and the server name is used by
      // every server-scoped page, so reload the shared context as well.
      await Promise.all([fetchServer(), refreshServerContext()]);
    } else {
      const data = await res.json();
      setMsg(data.error || "Failed to save");
    }
    setSaving(false);
  };

  const runDiagnostics = async () => {
    setDiagLoading(true);
    const res = await fetch(`/api/admin/servers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "diagnostics" }),
    });
    if (res.ok) {
      const data = await res.json();
      setDiag(data.diagnostics);
      await fetchServer();
    }
    setDiagLoading(false);
  };

  const rotateToken = async () => {
    if (!newToken.trim()) return;
    if (!confirm(`Rotate the admin token for "${server?.name}"? The old token will be permanently replaced.`)) return;
    setTokenSaving(true);
    const res = await fetch(`/api/admin/servers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rotate_token", adminToken: newToken }),
    });
    if (res.ok) {
      setNewToken("");
      setMsg("Token rotated");
    }
    setTokenSaving(false);
  };

  const handleAction = async (action: string) => {
    const res = await fetch(`/api/admin/servers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) await Promise.all([fetchServer(), refreshServerContext()]);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (!server) return <div className="text-center py-8 text-red-500">Server not found</div>;

  const diagCheck = (ok: boolean | null, label: string) => (
    <div className="flex items-center gap-2 py-1">
      {ok === true ? <CheckCircle className="w-4 h-4 text-green-500" /> : ok === false ? <XCircle className="w-4 h-4 text-red-500" /> : <XCircle className="w-4 h-4 text-gray-400" />}
      <span className="text-sm">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/servers")} className="p-2 hover:bg-muted rounded-md">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6" /> {server.name}
          </h1>
          <p className="text-sm text-muted-foreground">{server.serverName} &middot; {server.status}</p>
        </div>
        <div className="flex gap-2">
          {server.enabled ? (
            <button onClick={() => handleAction("disable")} className="px-3 py-1.5 border rounded-md text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950">
              Disable
            </button>
          ) : (
            <button onClick={() => handleAction("enable")} className="px-3 py-1.5 border rounded-md text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
              Enable
            </button>
          )}
          {!server.isDefault && server.enabled && (
            <button onClick={() => handleAction("set_default")} className="px-3 py-1.5 border rounded-md text-sm flex items-center gap-1">
              <Star className="w-3 h-3" /> Set Default
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(["overview", "diagnostics", "security"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" && "Overview"}
            {t === "diagnostics" && "Diagnostics"}
            {t === "security" && "Security"}
          </button>
        ))}
      </div>

      {msg && <div className="text-sm p-3 rounded bg-muted">{msg}</div>}

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Display Name", key: "name" },
              { label: "Slug", key: "slug" },
              { label: "Server Name", key: "serverName" },
              { label: "Internal URL", key: "internalUrl" },
              { label: "Public URL", key: "publicUrl" },
              { label: "Public Domain", key: "publicDomain" },
              { label: "Route Prefix", key: "routePrefix" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={form[key] || ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>

          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-medium mb-2">Server Info</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Status:</span> {server.status}</div>
              <div><span className="text-muted-foreground">Enabled:</span> {server.enabled ? "Yes" : "No"}</div>
              <div><span className="text-muted-foreground">Default:</span> {server.isDefault ? "Yes" : "No"}</div>
              <div><span className="text-muted-foreground">Capability Mode:</span> {server.capabilityMode || "unknown"}</div>
              <div><span className="text-muted-foreground">Created:</span> {new Date(server.createdAt).toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">Last Diagnostics:</span> {server.lastDiagAt ? new Date(server.lastDiagAt).toLocaleString() : "Never"}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "diagnostics" && (
        <div className="space-y-4">
          <button
            onClick={runDiagnostics}
            disabled={diagLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            <Activity className="w-4 h-4" /> {diagLoading ? "Running..." : "Run Diagnostics"}
          </button>

          {diag && (
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Diagnostics Results</h3>
              {diagCheck(diag.synapseReachable, "Synapse reachable")}
              {diagCheck(diag.adminApiReachable, "Admin API reachable")}
              {diagCheck(diag.tokenEndpointsAvailable, "Token endpoints available")}
              {diagCheck(diag.registrationFlowAvailable, "Registration flow available")}
              {diagCheck(diag.tokenRegistrationSupported, "Token registration supported")}
              {diagCheck(!diag.msc3861Detected, "No MSC3861/OIDC conflict")}
              {diagCheck(diag.registrationEnabled, "Registration enabled")}

              {diag.adminApiBaseUrl && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Admin API base URL: <code className="bg-muted px-1 py-0.5 rounded">{diag.adminApiBaseUrl}</code>
                </div>
              )}

              {diag.adminApiFailureClass === "proxy_not_forwarded" && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Likely cause:</strong> The Internal URL points to a reverse proxy that does not forward <code>/_synapse/admin/*</code> paths.
                  Set the Internal URL to the direct Synapse address (e.g. <code>http://synapse:8008</code>).
                </div>
              )}

              {diag.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  <h4 className="text-sm font-medium text-red-600">Issues</h4>
                  {diag.errors.map((e, i) => (
                    <p key={i} className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2"><Shield className="w-4 h-4" /> Admin Token</h3>
            <p className="text-sm text-muted-foreground">
              The admin token is stored encrypted. You can rotate it here. The old token will be permanently replaced.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                className="flex-1 border rounded-md px-3 py-2 bg-background"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="New admin token (syt_...)"
              />
              <button
                onClick={rotateToken}
                disabled={tokenSaving || !newToken.trim()}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted disabled:opacity-50"
              >
                <Key className="w-4 h-4" /> {tokenSaving ? "Rotating..." : "Rotate Token"}
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-medium">Security Notes</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Admin tokens are encrypted at rest using AES-256-GCM</li>
              <li>Tokens are never exposed to the browser or API responses</li>
              <li>All server operations are scoped and audit-logged</li>
              <li>Server actions require explicit target selection</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
