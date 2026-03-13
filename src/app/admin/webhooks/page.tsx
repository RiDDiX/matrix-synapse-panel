"use client";

import { useState, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Plus, Trash2, RefreshCw, CheckCircle, XCircle, X } from "lucide-react";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  serverId: string | null;
  lastStatus: number | null;
  lastError: string | null;
  lastFiredAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export default function WebhooksPage() {
  const { current } = useServerContext();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [allowedEvents, setAllowedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["*"]);
  const [formEnabled, setFormEnabled] = useState(true);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (current) params.set("serverId", current.id);
      const res = await fetch(`/api/admin/webhooks?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWebhooks(data.webhooks || []);
      setAllowedEvents(data.allowed_events || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [current]);

  function openCreate() {
    setEditId(null);
    setFormName("");
    setFormUrl("");
    setFormSecret("");
    setFormEvents(["*"]);
    setFormEnabled(true);
    setShowForm(true);
  }

  function openEdit(w: Webhook) {
    setEditId(w.id);
    setFormName(w.name);
    setFormUrl(w.url);
    setFormSecret("");
    setFormEvents(w.events);
    setFormEnabled(w.enabled);
    setShowForm(true);
  }

  async function saveWebhook() {
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        url: formUrl,
        events: formEvents,
        enabled: formEnabled,
        serverId: current?.id || null,
      };
      if (formSecret) body.secret = formSecret;
      if (editId) body.id = editId;

      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      fetchWebhooks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Delete this webhook?")) return;
    try {
      const res = await fetch(`/api/admin/webhooks?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function toggleEvent(event: string) {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Webhooks</h1>
          <p className="text-muted-foreground text-sm">Send HTTP notifications when events occur.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchWebhooks} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Load
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Webhook
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {showForm && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editId ? "Edit" : "New"} Webhook</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="My webhook" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">URL *</label>
              <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://example.com/webhook" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Secret (for HMAC signature)</label>
              <Input value={formSecret} onChange={(e) => setFormSecret(e.target.value)} placeholder="Optional" type="password" />
            </div>
            <div className="flex items-center gap-2 self-end pb-1">
              <input type="checkbox" id="webhookEnabled" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} className="rounded" />
              <label htmlFor="webhookEnabled" className="text-sm">Enabled</label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Events</label>
            <div className="flex flex-wrap gap-2">
              {allowedEvents.map((ev) => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => toggleEvent(ev)}
                  className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                    formEvents.includes(ev) ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:bg-accent"
                  }`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={saveWebhook} disabled={!formName || !formUrl || formEvents.length === 0}>
            {editId ? "Update" : "Create"} Webhook
          </Button>
        </div>
      )}

      {webhooks.length > 0 && (
        <div className="rounded-lg border">
          <div className="grid grid-cols-5 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
            <div>Name</div><div>URL</div><div>Events</div><div>Status</div><div className="text-right">Actions</div>
          </div>
          {webhooks.map((w) => (
            <div key={w.id} className="grid grid-cols-5 gap-4 p-3 text-sm border-b last:border-0 hover:bg-muted/50 items-center">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${w.enabled ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="truncate font-medium">{w.name}</span>
              </div>
              <div className="truncate text-xs font-mono">{w.url}</div>
              <div className="flex flex-wrap gap-1">
                {w.events.slice(0, 3).map((e) => (
                  <span key={e} className="rounded bg-muted px-1.5 py-0.5 text-xs">{e}</span>
                ))}
                {w.events.length > 3 && <span className="text-xs text-muted-foreground">+{w.events.length - 3}</span>}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {w.lastStatus !== null ? (
                  <>
                    {w.lastStatus >= 200 && w.lastStatus < 300 ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span>{w.lastStatus}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Never fired</span>
                )}
              </div>
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteWebhook(w.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {webhooks.length === 0 && !loading && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No webhooks configured. Click &quot;Load&quot; to fetch or &quot;New Webhook&quot; to create one.
        </div>
      )}
    </div>
  );
}
