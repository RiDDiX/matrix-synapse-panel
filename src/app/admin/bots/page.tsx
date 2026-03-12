"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Bot, Plus, Power, PowerOff, Trash2, Settings, Loader2,
  CheckCircle2, Clock, HandMetal, ShieldCheck, MessageSquareText,
  Webhook, Bell, LifeBuoy, Terminal,
} from "lucide-react";

interface BotDef {
  id: string;
  templateId: string;
  displayName: string;
  localpart: string | null;
  matrixUserId: string | null;
  status: string;
  enabled: boolean;
  createdAt: string;
  rooms: { id: string; roomId: string; roomAlias: string | null; active: boolean }[];
  features: { id: string; featureKey: string; enabled: boolean; scope: string }[];
}

interface BotTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: string[];
  threadAware: boolean;
  threadAwareNote?: string;
}

const TEMPLATE_ICONS: Record<string, typeof Bot> = {
  HandMetal, ShieldCheck, MessageSquareText, Webhook, Bell, LifeBuoy, Terminal,
};

function getTemplateIcon(name?: string) {
  if (!name || !TEMPLATE_ICONS[name]) return Bot;
  return TEMPLATE_ICONS[name];
}

export default function BotsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"bots" | "create">("bots");
  const [bots, setBots] = useState<BotDef[]>([]);
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newBotName, setNewBotName] = useState("");
  const [newBotLocalpart, setNewBotLocalpart] = useState("");

  const fetchBots = useCallback(async () => {
    const res = await fetch("/api/admin/bots");
    if (res.ok) {
      const data = await res.json();
      setBots(data.bots ?? []);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/bots?view=templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchBots(), fetchTemplates()]).finally(() => setLoading(false));
  }, [fetchBots, fetchTemplates]);

  async function handleAction(id: string, action: string) {
    setActionLoading(id);
    await fetch(`/api/admin/bots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchBots();
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this bot? This cannot be undone.")) return;
    setActionLoading(id);
    await fetch(`/api/admin/bots/${id}`, { method: "DELETE" });
    await fetchBots();
    setActionLoading(null);
  }

  async function handleCreate() {
    if (!selectedTemplate || !newBotName) return;
    setActionLoading("create");
    const res = await fetch("/api/admin/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: selectedTemplate,
        displayName: newBotName,
        localpart: newBotLocalpart || undefined,
      }),
    });
    if (res.ok) {
      setSelectedTemplate(null);
      setNewBotName("");
      setNewBotLocalpart("");
      setTab("bots");
      await fetchBots();
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage Matrix bots for automation and room management.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "bots" ? "default" : "outline"} size="sm" onClick={() => setTab("bots")}>
            <Bot className="w-4 h-4 mr-1" /> Bots ({bots.length})
          </Button>
          <Button variant={tab === "create" ? "default" : "outline"} size="sm" onClick={() => setTab("create")}>
            <Plus className="w-4 h-4 mr-1" /> Create
          </Button>
        </div>
      </div>

      {tab === "bots" ? (
        bots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No bots created</p>
            <p className="text-sm mt-1">Create a bot from a template to get started.</p>
            <Button className="mt-4" size="sm" onClick={() => setTab("create")}>
              <Plus className="w-4 h-4 mr-1" /> Create Bot
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {bots.map((bot) => {
              const tpl = templates.find((t) => t.id === bot.templateId);
              const Icon = getTemplateIcon(tpl?.icon);
              return (
                <div key={bot.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{bot.displayName}</span>
                        {tpl && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tpl.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {bot.enabled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">{bot.status}</span>
                        {bot.localpart && (
                          <span className="text-xs text-muted-foreground">@{bot.localpart}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {bot.rooms.length} room{bot.rooms.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {bot.features.filter((f) => f.enabled).length} features
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {bot.enabled ? (
                      <Button variant="ghost" size="sm" onClick={() => handleAction(bot.id, "deactivate")} disabled={actionLoading === bot.id}>
                        <PowerOff className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => handleAction(bot.id, "activate")} disabled={actionLoading === bot.id}>
                        <Power className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/bots/${bot.id}`)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    {!bot.enabled && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(bot.id)} disabled={actionLoading === bot.id} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Choose a Template</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => {
              const Icon = getTemplateIcon(tpl.icon);
              const isSelected = selectedTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`text-left p-4 rounded-lg border transition-colors ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:border-primary/50"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-sm">{tpl.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tpl.capabilities.slice(0, 3).map((c) => (
                      <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">{c}</span>
                    ))}
                  </div>
                  {tpl.threadAware && (
                    <div className="mt-2 text-xs text-blue-500">Thread-aware</div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedTemplate && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
              <h3 className="text-sm font-medium">Bot Details</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium">Display Name <span className="text-red-500">*</span></label>
                  <input
                    type="text" placeholder="My Bot"
                    value={newBotName} onChange={(e) => setNewBotName(e.target.value)}
                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Localpart (optional)</label>
                  <input
                    type="text" placeholder="mybot"
                    value={newBotLocalpart} onChange={(e) => setNewBotLocalpart(e.target.value)}
                    className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">Matrix user localpart, e.g. @mybot:example.com</p>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!newBotName || actionLoading === "create"}>
                {actionLoading === "create" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Create Bot
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
