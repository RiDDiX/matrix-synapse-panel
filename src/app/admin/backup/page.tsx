"use client";

import { useState } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, Copy, Download, RefreshCw, Info } from "lucide-react";

interface BackupKit {
  backupScript: string;
  restoreScript: string;
  cronLine: string;
  checklist: string[];
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

export default function BackupPage() {
  const { current } = useServerContext();
  const [deployment, setDeployment] = useState<"docker" | "native">("docker");
  const [postgresContainer, setPostgresContainer] = useState("synapse-db");
  const [postgresHost, setPostgresHost] = useState("localhost");
  const [postgresPort, setPostgresPort] = useState("5432");
  const [postgresDb, setPostgresDb] = useState("synapse");
  const [postgresUser, setPostgresUser] = useState("synapse");
  const [configPath, setConfigPath] = useState("/data/synapse/config");
  const [mediaStorePath, setMediaStorePath] = useState("/data/synapse/media_store");
  const [backupDir, setBackupDir] = useState("/backups/synapse");
  const [includeMedia, setIncludeMedia] = useState(true);
  const [retentionDays, setRetentionDays] = useState("14");
  const [cronSchedule, setCronSchedule] = useState("0 3 * * *");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kit, setKit] = useState<BackupKit | null>(null);

  async function generate() {
    if (!current) return;
    setLoading(true);
    setError(null);
    setKit(null);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverName: current.serverName,
          deployment,
          postgresContainer: deployment === "docker" ? postgresContainer : undefined,
          postgresHost: deployment === "native" ? postgresHost : undefined,
          postgresPort: deployment === "native" ? parseInt(postgresPort, 10) : undefined,
          postgresDb,
          postgresUser,
          configPath,
          mediaStorePath,
          backupDir,
          includeMedia,
          retentionDays: parseInt(retentionDays, 10),
          cronSchedule,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details));
      setKit(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to generate a backup kit.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Archive className="h-6 w-6" /> Backup</h1>
        <p className="text-muted-foreground text-sm">
          Generate a ready-to-run backup kit for {current.serverName}. Synapse has no backup API —
          a full backup is the database, the media store and the config directory (including the
          signing key) on the homeserver host.
        </p>
      </div>

      <div className="rounded-lg border p-4 flex gap-3">
        <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>This is a preparation tool: it generates scripts, you deploy them on the homeserver host.</p>
          <p>Panel data (tokens metadata, audit logs, server list) is exported separately on the Export page.</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="rounded-lg border p-4 space-y-4 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Deployment</label>
          <select
            className="rounded-md border px-3 py-2 text-sm bg-background w-full"
            value={deployment}
            onChange={(e) => setDeployment(e.target.value as "docker" | "native")}
          >
            <option value="docker">Docker (postgres in a container)</option>
            <option value="native">Native (postgres on the host)</option>
          </select>
        </div>

        {deployment === "docker" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Postgres Container Name</label>
            <Input value={postgresContainer} onChange={(e) => setPostgresContainer(e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Postgres Host</label>
              <Input value={postgresHost} onChange={(e) => setPostgresHost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Postgres Port</label>
              <Input type="number" value={postgresPort} onChange={(e) => setPostgresPort(e.target.value)} />
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
          <label className="text-sm font-medium">Config Directory (homeserver.yaml + signing key)</label>
          <Input value={configPath} onChange={(e) => setConfigPath(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Media Store Path</label>
          <Input value={mediaStorePath} onChange={(e) => setMediaStorePath(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Backup Directory</label>
          <Input value={backupDir} onChange={(e) => setBackupDir(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Retention (days)</label>
            <Input type="number" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cron Schedule</label>
            <Input value={cronSchedule} onChange={(e) => setCronSchedule(e.target.value)} />
            <p className="text-xs text-muted-foreground">Default: daily at 03:00.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="includeMedia" checked={includeMedia} onChange={(e) => setIncludeMedia(e.target.checked)} className="rounded" />
          <label htmlFor="includeMedia" className="text-sm">Include media store (can be large)</label>
        </div>

        <Button onClick={generate} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
          Generate Backup Kit
        </Button>
      </div>

      {kit && (
        <div className="space-y-4">
          {[
            { name: "backup.sh", content: kit.backupScript },
            { name: "restore.sh", content: kit.restoreScript },
            { name: "crontab line", content: kit.cronLine, noDownload: true },
          ].map((file) => (
            <div key={file.name} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold font-mono text-sm">{file.name}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(file.content)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                  {!file.noDownload && (
                    <Button variant="outline" size="sm" onClick={() => downloadText(file.name, file.content)}>
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                  )}
                </div>
              </div>
              <pre className="text-xs bg-muted rounded p-3 overflow-x-auto max-h-72">{file.content}</pre>
            </div>
          ))}

          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold">Checklist</h3>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {kit.checklist.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
