"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Server,
  Download,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  FileText,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Info,
  Database,
  Globe,
  Shield,
  Mail,
  HardDrive,
  Network,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PrepResult {
  homeserverYaml: string;
  composeYaml: string;
  envTemplate: string;
  checklist: string[];
  warnings: string[];
  validation: { valid: boolean; errors: string[]; warnings: string[] };
}

interface PrepConfig {
  serverName: string;
  publicBaseUrl: string;
  bindPort: number;
  database: "sqlite" | "postgresql";
  postgresHost: string;
  postgresPort: number;
  postgresDb: string;
  postgresUser: string;
  postgresPassword: string;
  mediaStorePath: string;
  signingKeyPath: string;
  enableRegistration: boolean;
  registrationRequiresToken: boolean;
  trustedKeyServers: string[];
  reverseProxy: boolean;
  tlsTermination: "reverse_proxy" | "synapse" | "none";
  appserviceConfigDir: string;
  logLevel: "DEBUG" | "INFO" | "WARNING" | "ERROR";
  enableTurn: boolean;
  turnUris: string[];
  turnSharedSecret: string;
  enableSmtp: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  smtpRequireTls: boolean;
  maxUploadSize: string;
  urlPreviewEnabled: boolean;
  dataDir: string;
  containerName: string;
  networkName: string;
}

const defaultConfig: PrepConfig = {
  serverName: "",
  publicBaseUrl: "",
  bindPort: 8008,
  database: "postgresql",
  postgresHost: "db",
  postgresPort: 5432,
  postgresDb: "synapse",
  postgresUser: "synapse",
  postgresPassword: "",
  mediaStorePath: "/data/media_store",
  signingKeyPath: "/data/signing.key",
  enableRegistration: false,
  registrationRequiresToken: true,
  trustedKeyServers: ["matrix.org"],
  reverseProxy: true,
  tlsTermination: "reverse_proxy",
  appserviceConfigDir: "/data/appservices",
  logLevel: "INFO",
  enableTurn: false,
  turnUris: [],
  turnSharedSecret: "",
  enableSmtp: false,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  smtpFrom: "",
  smtpRequireTls: true,
  maxUploadSize: "50M",
  urlPreviewEnabled: true,
  dataDir: "./synapse-data",
  containerName: "synapse",
  networkName: "matrix-net",
};

/* ------------------------------------------------------------------ */
/* Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function ServerPrepPage() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<PrepConfig>({ ...defaultConfig });
  const [result, setResult] = useState<PrepResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const steps = ["Server Basics", "Database", "Features", "Network & SMTP", "Review & Generate"];

  function updateConfig<K extends keyof PrepConfig>(key: K, value: PrepConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/server-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }
      setResult(await res.json());
      setStep(5); // Results step
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadBundle() {
    if (!result) return;
    // Download each file individually since ZIP would require a library
    downloadFile(result.homeserverYaml, "homeserver.yaml");
    setTimeout(() => downloadFile(result.composeYaml, "docker-compose.yaml"), 200);
    setTimeout(() => downloadFile(result.envTemplate, ".env"), 400);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Server className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Synapse Server Preparation</h1>
      </div>

      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-200">
        <strong>Preparation tool:</strong> This wizard generates deployment-ready configuration
        files for a new Synapse homeserver. It does NOT automatically provision or start servers.
        You deploy the generated files manually.
      </div>

      {/* Step indicator */}
      {step < 5 && (
        <div className="flex items-center gap-2 text-sm">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <button
                onClick={() => setStep(i)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-3 w-3 inline mr-1" /> : null}
                {s}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Step 0: Server Basics */}
      {step === 0 && (
        <div className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Globe className="h-5 w-5" /> Server Basics</h2>
          <div className="space-y-2">
            <Label>Server Name *</Label>
            <Input placeholder="yourdomain.com" value={config.serverName} onChange={(e) => updateConfig("serverName", e.target.value)} />
            <p className="text-xs text-muted-foreground">The domain part of Matrix IDs (@user:yourdomain.com). Cannot be changed later.</p>
          </div>
          <div className="space-y-2">
            <Label>Public Base URL *</Label>
            <Input placeholder="https://matrix.yourdomain.com" value={config.publicBaseUrl} onChange={(e) => updateConfig("publicBaseUrl", e.target.value)} />
            <p className="text-xs text-muted-foreground">The URL clients use to reach this homeserver.</p>
          </div>
          <div className="space-y-2">
            <Label>Bind Port</Label>
            <Input type="number" value={config.bindPort} onChange={(e) => updateConfig("bindPort", parseInt(e.target.value) || 8008)} />
          </div>
          <div className="space-y-2">
            <Label>Data Directory (host path)</Label>
            <Input value={config.dataDir} onChange={(e) => updateConfig("dataDir", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Container Name</Label>
            <Input value={config.containerName} onChange={(e) => updateConfig("containerName", e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 1: Database */}
      {step === 1 && (
        <div className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Database className="h-5 w-5" /> Database</h2>
          <div className="space-y-2">
            <Label>Database Type</Label>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={config.database} onChange={(e) => updateConfig("database", e.target.value as "sqlite" | "postgresql")}>
              <option value="postgresql">PostgreSQL (recommended)</option>
              <option value="sqlite">SQLite (small/test only)</option>
            </select>
          </div>
          {config.database === "postgresql" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PostgreSQL Host</Label>
                  <Input value={config.postgresHost} onChange={(e) => updateConfig("postgresHost", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input type="number" value={config.postgresPort} onChange={(e) => updateConfig("postgresPort", parseInt(e.target.value) || 5432)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Database Name</Label>
                  <Input value={config.postgresDb} onChange={(e) => updateConfig("postgresDb", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>User</Label>
                  <Input value={config.postgresUser} onChange={(e) => updateConfig("postgresUser", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={config.postgresPassword} onChange={(e) => updateConfig("postgresPassword", e.target.value)} placeholder="Strong database password" />
              </div>
            </>
          )}
          {config.database === "sqlite" && (
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              SQLite is not recommended for production. Use PostgreSQL for any server with more than a few users.
            </div>
          )}
        </div>
      )}

      {/* Step 2: Features */}
      {step === 2 && (
        <div className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> Features</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={config.enableRegistration} onChange={(e) => updateConfig("enableRegistration", e.target.checked)} className="rounded" />
              <span>Enable Registration</span>
            </label>
            {config.enableRegistration && (
              <label className="flex items-center gap-3 ml-6">
                <input type="checkbox" checked={config.registrationRequiresToken} onChange={(e) => updateConfig("registrationRequiresToken", e.target.checked)} className="rounded" />
                <span>Require Registration Token</span>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label>Max Upload Size</Label>
            <Input value={config.maxUploadSize} onChange={(e) => updateConfig("maxUploadSize", e.target.value)} />
          </div>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={config.urlPreviewEnabled} onChange={(e) => updateConfig("urlPreviewEnabled", e.target.checked)} className="rounded" />
            <span>Enable URL Previews</span>
          </label>

          <div className="space-y-2">
            <Label>Log Level</Label>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={config.logLevel} onChange={(e) => updateConfig("logLevel", e.target.value as PrepConfig["logLevel"])}>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Appservice Config Directory</Label>
            <Input value={config.appserviceConfigDir} onChange={(e) => updateConfig("appserviceConfigDir", e.target.value)} />
            <p className="text-xs text-muted-foreground">Path inside the container for appservice registration files (bridges, bots).</p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={config.enableTurn} onChange={(e) => updateConfig("enableTurn", e.target.checked)} className="rounded" />
              <span>Enable TURN/STUN (VoIP)</span>
            </label>
            {config.enableTurn && (
              <div className="ml-6 space-y-2">
                <Label>TURN URIs (comma-separated)</Label>
                <Input
                  value={config.turnUris.join(", ")}
                  onChange={(e) => updateConfig("turnUris", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  placeholder="turn:turn.example.com:3478?transport=udp"
                />
                <Label>TURN Shared Secret</Label>
                <Input type="password" value={config.turnSharedSecret} onChange={(e) => updateConfig("turnSharedSecret", e.target.value)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Network & SMTP */}
      {step === 3 && (
        <div className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Network className="h-5 w-5" /> Network & SMTP</h2>

          <label className="flex items-center gap-3">
            <input type="checkbox" checked={config.reverseProxy} onChange={(e) => updateConfig("reverseProxy", e.target.checked)} className="rounded" />
            <span>Behind Reverse Proxy</span>
          </label>

          <div className="space-y-2">
            <Label>TLS Termination</Label>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={config.tlsTermination} onChange={(e) => updateConfig("tlsTermination", e.target.value as PrepConfig["tlsTermination"])}>
              <option value="reverse_proxy">At Reverse Proxy (recommended)</option>
              <option value="synapse">At Synapse</option>
              <option value="none">None (development only)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Docker Network Name</Label>
            <Input value={config.networkName} onChange={(e) => updateConfig("networkName", e.target.value)} />
          </div>

          <hr />

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={config.enableSmtp} onChange={(e) => updateConfig("enableSmtp", e.target.checked)} className="rounded" />
              <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Enable Email (SMTP)</span>
            </label>
            {config.enableSmtp && (
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input value={config.smtpHost} onChange={(e) => updateConfig("smtpHost", e.target.value)} placeholder="smtp.example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input type="number" value={config.smtpPort} onChange={(e) => updateConfig("smtpPort", parseInt(e.target.value) || 587)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP User</Label>
                    <Input value={config.smtpUser} onChange={(e) => updateConfig("smtpUser", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Password</Label>
                    <Input type="password" value={config.smtpPassword} onChange={(e) => updateConfig("smtpPassword", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>From Address</Label>
                  <Input value={config.smtpFrom} onChange={(e) => updateConfig("smtpFrom", e.target.value)} placeholder="Matrix <noreply@example.com>" />
                </div>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={config.smtpRequireTls} onChange={(e) => updateConfig("smtpRequireTls", e.target.checked)} className="rounded" />
                  <span>Require TLS</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Review & Generate */}
      {step === 4 && (
        <div className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold">Review Configuration</h2>
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            {[
              { label: "Server Name", value: config.serverName || "—" },
              { label: "Public URL", value: config.publicBaseUrl || "—" },
              { label: "Port", value: String(config.bindPort) },
              { label: "Database", value: config.database },
              { label: "Registration", value: config.enableRegistration ? (config.registrationRequiresToken ? "Token-based" : "Open") : "Disabled" },
              { label: "Reverse Proxy", value: config.reverseProxy ? "Yes" : "No" },
              { label: "TLS", value: config.tlsTermination },
              { label: "TURN", value: config.enableTurn ? "Enabled" : "Disabled" },
              { label: "SMTP", value: config.enableSmtp ? config.smtpHost : "Disabled" },
              { label: "Data Dir", value: config.dataDir },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>

          <Button onClick={handleGenerate} disabled={loading || !config.serverName || !config.publicBaseUrl} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCode className="h-4 w-4 mr-2" />}
            Generate Configuration
          </Button>
        </div>
      )}

      {/* Step 5: Results */}
      {step === 5 && result && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-600" /> Configuration Generated</h2>

          {/* Validation */}
          {(result.validation.errors.length > 0 || result.validation.warnings.length > 0) && (
            <div className="space-y-2">
              {result.validation.errors.map((err, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-800 dark:text-red-200">
                  <AlertTriangle className="h-4 w-4 inline mr-1" /> {err}
                </div>
              ))}
              {result.validation.warnings.map((warn, i) => (
                <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                  <Info className="h-4 w-4 inline mr-1" /> {warn}
                </div>
              ))}
            </div>
          )}

          {/* Download bundle */}
          <Button onClick={downloadBundle} className="w-full">
            <Download className="h-4 w-4 mr-2" /> Download All Files
          </Button>

          {/* File previews */}
          {[
            { label: "homeserver.yaml", content: result.homeserverYaml, filename: "homeserver.yaml" },
            { label: "docker-compose.yaml", content: result.composeYaml, filename: "docker-compose.yaml" },
            { label: ".env", content: result.envTemplate, filename: ".env" },
          ].map(({ label, content, filename }) => (
            <div key={label} className="rounded-lg border">
              <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                <span className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> {label}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(content, label)}
                  >
                    {copied === label ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadFile(content, filename)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <pre className="p-4 text-xs overflow-auto max-h-[400px] bg-muted/20">{content}</pre>
            </div>
          ))}

          {/* Checklist */}
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Post-Generation Checklist</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {result.checklist.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>

          {/* Back to edit */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(4)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Review
            </Button>
            <Button variant="outline" onClick={() => { setResult(null); setStep(0); }}>
              Start New Configuration
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {step < 5 && (
        <div className="flex justify-between max-w-xl">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <Button disabled={step === 4} onClick={() => setStep(step + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
