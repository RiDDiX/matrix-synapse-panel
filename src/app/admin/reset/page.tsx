"use client";

import { useState } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, RotateCcw, RefreshCw, Copy, Download, DoorOpen, Users, Image, KeyRound, TerminalSquare } from "lucide-react";

interface StepResult {
  label: string;
  detail: string;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResetPage() {
  const { current } = useServerContext();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StepResult[]>([]);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteStatuses, setDeleteStatuses] = useState<Record<string, string>>({});

  // wipe options
  const [purge, setPurge] = useState(true);
  const [block, setBlock] = useState(false);
  const [erase, setErase] = useState(false);

  // factory reset script options
  const [deployment, setDeployment] = useState<"docker" | "native">("docker");
  const [postgresContainer, setPostgresContainer] = useState("synapse-db");
  const [postgresHost, setPostgresHost] = useState("localhost");
  const [postgresPort, setPostgresPort] = useState("5432");
  const [postgresDb, setPostgresDb] = useState("synapse");
  const [postgresUser, setPostgresUser] = useState("synapse");
  const [mediaStorePath, setMediaStorePath] = useState("/data/synapse/media_store");
  const [synapseService, setSynapseService] = useState("synapse");
  const [keepSigningKey, setKeepSigningKey] = useState(true);
  const [script, setScript] = useState<string | null>(null);

  const confirmed = !!current && confirmText === current.serverName;

  async function runAction(action: string, extra: Record<string, unknown>, label: string) {
    if (!current || !confirmed) return;
    if (!confirm(`${label} on ${current.serverName}? This cannot be undone.`)) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reset?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirm: confirmText, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details));
      let detail = "";
      if (action === "delete_all_rooms") {
        detail = `${data.started}/${data.total} room deletions started, ${data.failed.length} failed`;
        setDeleteIds(data.delete_ids);
        setDeleteStatuses({});
      } else if (action === "deactivate_all_users") {
        detail = `${data.deactivated}/${data.total} users deactivated, ${data.skipped_admins.length} admins skipped, ${data.failed.length} failed`;
      } else if (action === "delete_all_media") {
        detail = `${data.local_deleted} local media deleted, ${data.remote_purged} remote cache entries purged`;
      } else if (action === "delete_all_tokens") {
        detail = `${data.deleted}/${data.total} tokens deleted`;
      }
      setResults((prev) => [...prev, { label, detail }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function refreshDeleteStatuses() {
    if (!current) return;
    setBusy("status");
    try {
      const statuses: Record<string, string> = {};
      // ponytail: sequential, capped at 50 — enough to see progress on any realistic wipe
      for (const id of deleteIds.slice(0, 50)) {
        const res = await fetch(`/api/admin/reset?serverId=${current.id}&deleteId=${encodeURIComponent(id)}`);
        const data = await res.json();
        statuses[id] = res.ok ? data.status : "unknown";
      }
      setDeleteStatuses(statuses);
    } finally {
      setBusy(null);
    }
  }

  async function generateScript() {
    if (!current) return;
    setBusy("script");
    setError(null);
    setScript(null);
    try {
      const res = await fetch(`/api/admin/reset?serverId=${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverName: current.serverName,
          deployment,
          postgresContainer: deployment === "docker" ? postgresContainer : undefined,
          postgresHost: deployment === "native" ? postgresHost : undefined,
          postgresPort: deployment === "native" ? parseInt(postgresPort, 10) : undefined,
          postgresDb,
          postgresUser,
          mediaStorePath,
          keepSigningKey,
          synapseService,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details));
      setScript(data.script);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to reset.</div>;
  }

  const steps = [
    {
      action: "delete_all_rooms",
      label: "Delete All Rooms",
      icon: DoorOpen,
      description: "Deletes every room on the server (async). With purge, all events and media references are removed from the database.",
      extra: { purge, block },
      options: (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={purge} onChange={(e) => setPurge(e.target.checked)} className="rounded" />
            Purge from database
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="rounded" />
            Block re-joining
          </label>
        </div>
      ),
    },
    {
      action: "deactivate_all_users",
      label: "Deactivate All Users",
      icon: Users,
      description: "Deactivates every non-admin account. Admin accounts are skipped so the panel's admin token keeps working.",
      extra: { erase },
      options: (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={erase} onChange={(e) => setErase(e.target.checked)} className="rounded" />
          GDPR-erase profile data
        </label>
      ),
    },
    {
      action: "delete_all_media",
      label: "Delete All Media",
      icon: Image,
      description: "Deletes all local media (including avatars) and purges the remote media cache.",
      extra: {},
      options: null,
    },
    {
      action: "delete_all_tokens",
      label: "Delete All Registration Tokens",
      icon: KeyRound,
      description: "Deletes every registration token and its panel metadata.",
      extra: {},
      options: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="h-6 w-6" /> Server Reset</h1>
        <p className="text-muted-foreground text-sm">
          Wipe {current.serverName} step by step via the Synapse Admin API, or generate a
          host-level factory reset script.
        </p>
      </div>

      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-destructive">Destructive Operations — No Undo</p>
          <p className="text-muted-foreground">
            Take a backup first (Backup page). If this server has federated, remote servers keep
            cached events and keys: after a full database wipe the official recommendation is a
            new server name, otherwise federation will misbehave.
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="rounded-lg border p-4 space-y-2 max-w-xl">
        <label className="text-sm font-medium">Type the server name to unlock: <span className="font-mono">{current.serverName}</span></label>
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={current.serverName} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <div key={step.action} className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><step.icon className="h-4 w-4" /> {step.label}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
            {step.options}
            <Button
              variant="destructive"
              size="sm"
              disabled={!confirmed || busy !== null}
              onClick={() => runAction(step.action, step.extra, step.label)}
            >
              {busy === step.action ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <step.icon className="h-4 w-4 mr-2" />}
              {step.label}
            </Button>
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold">Results</h3>
          <ul className="text-sm space-y-1">
            {results.map((r, i) => (
              <li key={i}><span className="font-medium">{r.label}:</span> <span className="text-muted-foreground">{r.detail}</span></li>
            ))}
          </ul>
        </div>
      )}

      {deleteIds.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Room Deletion Progress ({deleteIds.length} jobs)</h3>
            <Button variant="outline" size="sm" onClick={refreshDeleteStatuses} disabled={busy !== null}>
              <RefreshCw className={`h-3 w-3 mr-1 ${busy === "status" ? "animate-spin" : ""}`} /> Refresh Status
            </Button>
          </div>
          {Object.keys(deleteStatuses).length > 0 && (
            <p className="text-sm text-muted-foreground">
              {Object.values(deleteStatuses).filter((s) => s === "complete").length} complete,{" "}
              {Object.values(deleteStatuses).filter((s) => s === "failed").length} failed,{" "}
              {Object.values(deleteStatuses).filter((s) => s !== "complete" && s !== "failed").length} in progress
              {deleteIds.length > 50 ? " (first 50 checked)" : ""}
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-4 max-w-2xl">
        <h3 className="font-semibold flex items-center gap-2"><TerminalSquare className="h-4 w-4" /> Factory Reset Script (host-level)</h3>
        <p className="text-sm text-muted-foreground">
          A true factory reset (empty database, empty media store) is not possible via the Admin
          API. This generates a script to run on the homeserver host: stop Synapse, drop and
          recreate the database, wipe the media store, restart.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Deployment</label>
          <select
            className="rounded-md border px-3 py-2 text-sm bg-background w-full"
            value={deployment}
            onChange={(e) => setDeployment(e.target.value as "docker" | "native")}
          >
            <option value="docker">Docker</option>
            <option value="native">Native (systemd)</option>
          </select>
        </div>

        {deployment === "docker" ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Postgres Container</label>
              <Input value={postgresContainer} onChange={(e) => setPostgresContainer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Synapse Compose Service</label>
              <Input value={synapseService} onChange={(e) => setSynapseService(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Postgres Host</label>
              <Input value={postgresHost} onChange={(e) => setPostgresHost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Postgres Port</label>
              <Input type="number" value={postgresPort} onChange={(e) => setPostgresPort(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Systemd Unit</label>
              <Input value={synapseService} onChange={(e) => setSynapseService(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Database Name</label>
            <Input value={postgresDb} onChange={(e) => setPostgresDb(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Database User</label>
            <Input value={postgresUser} onChange={(e) => setPostgresUser(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Media Store Path</label>
          <Input value={mediaStorePath} onChange={(e) => setMediaStorePath(e.target.value)} />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="keepSigningKey" checked={keepSigningKey} onChange={(e) => setKeepSigningKey(e.target.checked)} className="rounded" />
          <label htmlFor="keepSigningKey" className="text-sm">Keep signing key (recommended)</label>
        </div>

        <Button onClick={generateScript} disabled={busy !== null}>
          {busy === "script" ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <TerminalSquare className="h-4 w-4 mr-2" />}
          Generate Reset Script
        </Button>

        {script && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(script)}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadText("factory-reset.sh", script)}>
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
            </div>
            <pre className="text-xs bg-muted rounded p-3 overflow-x-auto max-h-72">{script}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
