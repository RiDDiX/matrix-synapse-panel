"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Server,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Trash2,
  Activity,
} from "lucide-react";

interface ManagedServer {
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
  lastDiagOk: boolean | null;
  lastDiagAt: string | null;
  brandingProfileId: string | null;
  capabilityMode: string | null;
  createdAt: string;
}

export default function ServersPage() {
  const [servers, setServers] = useState<ManagedServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    serverName: "",
    internalUrl: "",
    publicUrl: "",
    adminToken: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/admin/servers");
    if (res.ok) {
      const data = await res.json();
      setServers(data.servers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create server");
        return;
      }
      setShowAdd(false);
      setForm({ name: "", slug: "", serverName: "", internalUrl: "", publicUrl: "", adminToken: "", notes: "" });
      await fetchServers();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    const res = await fetch(`/api/admin/servers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) await fetchServers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete server "${name}"? This will remove all associated data. This action cannot be undone.`)) return;
    const res = await fetch(`/api/admin/servers/${id}`, { method: "DELETE" });
    if (res.ok) await fetchServers();
  };

  const statusIcon = (s: ManagedServer) => {
    if (s.enabled && s.lastDiagOk) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s.enabled && s.lastDiagOk === false) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (!s.enabled) return <XCircle className="w-4 h-4 text-gray-400" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6" /> Managed Homeservers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Matrix / Synapse homeservers
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Add Server
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="border rounded-lg p-6 space-y-4 bg-card">
          <h2 className="font-semibold text-lg">Add Homeserver</h2>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Homeserver"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="my-homeserver"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">URL-safe identifier (lowercase, numbers, hyphens)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Server Name</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={form.serverName}
                onChange={(e) => setForm({ ...form, serverName: e.target.value })}
                placeholder="example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Internal Synapse URL</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={form.internalUrl}
                onChange={(e) => setForm({ ...form, internalUrl: e.target.value })}
                placeholder="http://synapse:8008"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Direct Synapse address for Admin API calls. Must not go through a reverse proxy that blocks <code>/_synapse/admin/*</code>.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Public URL</label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={form.publicUrl}
                onChange={(e) => setForm({ ...form, publicUrl: e.target.value })}
                placeholder="https://matrix.example.com"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Public-facing URL shown to users for registration and client references.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Admin API Token</label>
              <input
                type="password"
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={form.adminToken}
                onChange={(e) => setForm({ ...form, adminToken: e.target.value })}
                placeholder="syt_..."
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Server"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded-md">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading servers...</div>
      ) : servers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">No homeservers configured</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first Matrix / Synapse homeserver to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(s)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/servers/${s.id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                      {s.isDefault && (
                        <span className="flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3" /> Default
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.status === "active"
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : s.status === "draft"
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {s.serverName} &middot; {s.publicUrl}
                    </p>
                    {s.capabilityMode && (
                      <p className="text-xs text-muted-foreground mt-0.5">Mode: {s.capabilityMode}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAction(s.id, "diagnostics")}
                    className="p-2 hover:bg-muted rounded-md"
                    title="Run diagnostics"
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                  {!s.enabled ? (
                    <button
                      onClick={() => handleAction(s.id, "enable")}
                      className="p-2 hover:bg-muted rounded-md text-green-600"
                      title="Enable server"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(s.id, "disable")}
                      className="p-2 hover:bg-muted rounded-md text-yellow-600"
                      title="Disable server"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  {!s.isDefault && s.enabled && (
                    <button
                      onClick={() => handleAction(s.id, "set_default")}
                      className="p-2 hover:bg-muted rounded-md text-yellow-500"
                      title="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  {!s.enabled && !s.isDefault && (
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      className="p-2 hover:bg-muted rounded-md text-red-500"
                      title="Delete server"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
