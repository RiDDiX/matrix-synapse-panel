"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Puzzle, Search, Plus, Power, PowerOff, Trash2, Settings, Activity,
  MessageCircle, Shield, Send, AlertTriangle, CheckCircle2, XCircle,
  Clock, Loader2,
} from "lucide-react";

interface InstalledIntegration {
  id: string;
  catalogId: string;
  name: string;
  type: string;
  deploymentMode: string;
  status: string;
  enabled: boolean;
  version: string;
  lastHealthOk: boolean | null;
  lastHealthAt: string | null;
  createdAt: string;
}

interface CatalogEntry {
  id: string;
  name: string;
  type: string;
  description: string;
  icon?: string;
  maturity: string;
  tags: string[];
}

const TYPE_LABELS: Record<string, string> = {
  bridge: "Bridge",
  bot: "Bot",
  synapse_module: "Synapse Module",
  external_service: "External Service",
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  running: { icon: CheckCircle2, color: "text-green-500", label: "Running" },
  enabled: { icon: CheckCircle2, color: "text-green-500", label: "Enabled" },
  installed: { icon: Clock, color: "text-blue-500", label: "Installed" },
  configured: { icon: Settings, color: "text-blue-500", label: "Configured" },
  degraded: { icon: AlertTriangle, color: "text-yellow-500", label: "Degraded" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  disabled: { icon: PowerOff, color: "text-gray-400", label: "Disabled" },
  installing: { icon: Loader2, color: "text-blue-500", label: "Installing" },
  waiting_for_pairing: { icon: Clock, color: "text-yellow-500", label: "Waiting for Pairing" },
};

const ICON_MAP: Record<string, typeof MessageCircle> = {
  MessageCircle, Shield, Send,
};

function getIcon(name?: string) {
  if (!name || !ICON_MAP[name]) return Puzzle;
  return ICON_MAP[name];
}

export default function IntegrationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"installed" | "catalog">("installed");
  const [integrations, setIntegrations] = useState<InstalledIntegration[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInstalled = useCallback(async () => {
    const res = await fetch("/api/admin/integrations");
    if (res.ok) {
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    const q = search ? `&q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/admin/integrations?view=catalog${q}`);
    if (res.ok) {
      const data = await res.json();
      setCatalog(data.catalog ?? []);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    if (tab === "installed") {
      fetchInstalled().finally(() => setLoading(false));
    } else {
      fetchCatalog().finally(() => setLoading(false));
    }
  }, [tab, fetchInstalled, fetchCatalog]);

  async function handleAction(id: string, action: string) {
    setActionLoading(id);
    await fetch(`/api/admin/integrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchInstalled();
    setActionLoading(null);
  }

  async function handleInstall(catalogId: string) {
    setActionLoading(catalogId);
    const res = await fetch("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogId }),
    });
    if (res.ok) {
      setTab("installed");
      await fetchInstalled();
    }
    setActionLoading(null);
  }

  async function handleUninstall(id: string) {
    if (!confirm("Are you sure you want to uninstall this integration? This cannot be undone.")) return;
    setActionLoading(id);
    await fetch(`/api/admin/integrations/${id}`, { method: "DELETE" });
    await fetchInstalled();
    setActionLoading(null);
  }

  const installedCatalogIds = new Set(integrations.map((i) => i.catalogId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bridges, bots, and services for your Matrix environment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tab === "installed" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("installed")}
          >
            <Puzzle className="w-4 h-4 mr-1" /> Installed ({integrations.length})
          </Button>
          <Button
            variant={tab === "catalog" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("catalog")}
          >
            <Plus className="w-4 h-4 mr-1" /> Catalog
          </Button>
        </div>
      </div>

      {tab === "catalog" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border bg-background text-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "installed" ? (
        integrations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No integrations installed</p>
            <p className="text-sm mt-1">Browse the catalog to add bridges, bots, and services.</p>
            <Button className="mt-4" size="sm" onClick={() => setTab("catalog")}>
              <Plus className="w-4 h-4 mr-1" /> Browse Catalog
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => {
              const sc = STATUS_CONFIG[integration.status] ?? { icon: Clock, color: "text-gray-400", label: integration.status };
              const StatusIcon = sc.icon;
              return (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Puzzle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{integration.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {TYPE_LABELS[integration.type] ?? integration.type}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {integration.deploymentMode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusIcon className={`w-3.5 h-3.5 ${sc.color}`} />
                        <span className={`text-xs ${sc.color}`}>{sc.label}</span>
                        <span className="text-xs text-muted-foreground">v{integration.version}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {integration.enabled ? (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleAction(integration.id, "disable")}
                        disabled={actionLoading === integration.id}
                      >
                        <PowerOff className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleAction(integration.id, "enable")}
                        disabled={actionLoading === integration.id}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleAction(integration.id, "health")}
                      disabled={actionLoading === integration.id}
                    >
                      <Activity className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => router.push(`/admin/integrations/${integration.id}`)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    {!integration.enabled && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleUninstall(integration.id)}
                        disabled={actionLoading === integration.id}
                        className="text-destructive hover:text-destructive"
                      >
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((entry) => {
            const Icon = getIcon(entry.icon);
            const isInstalled = installedCatalogIds.has(entry.id);
            return (
              <div key={entry.id} className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{entry.name}</div>
                      <div className="flex gap-1 mt-0.5">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {TYPE_LABELS[entry.type] ?? entry.type}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          entry.maturity === "stable" ? "bg-green-500/10 text-green-600" :
                          entry.maturity === "beta" ? "bg-yellow-500/10 text-yellow-600" :
                          "bg-orange-500/10 text-orange-600"
                        }`}>
                          {entry.maturity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{entry.description}</p>
                <div className="flex flex-wrap gap-1">
                  {entry.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
                {isInstalled ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Installed
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleInstall(entry.id)}
                    disabled={actionLoading === entry.id}
                  >
                    {actionLoading === entry.id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    Install
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
