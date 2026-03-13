"use client";

import { useState, useEffect } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  LogIn,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Shield,
  Info,
  Globe,
  Lock,
} from "lucide-react";

interface LoginFlow {
  type: string;
}

interface FlowsResult {
  flows: LoginFlow[];
  loginUrl: string;
  hasPasswordLogin: boolean;
}

interface LoginResult {
  success: boolean;
  userId?: string;
  deviceId?: string;
  admin?: boolean;
  message?: string;
  error?: string;
  availableFlows?: string[];
}

export default function MatrixLoginPage() {
  const { current, loading: serverLoading } = useServerContext();
  const [flows, setFlows] = useState<FlowsResult | null>(null);
  const [flowsLoading, setFlowsLoading] = useState(false);
  const [flowsError, setFlowsError] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);

  useEffect(() => {
    if (!current) {
      setFlows(null);
      return;
    }
    setFlowsLoading(true);
    setFlowsError(null);
    fetch(`/api/admin/matrix-login?serverId=${current.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to discover login flows");
        return r.json();
      })
      .then(setFlows)
      .catch((e) => setFlowsError(e.message))
      .finally(() => setFlowsLoading(false));
  }, [current]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return;
    setLoginLoading(true);
    setLoginResult(null);
    try {
      const res = await fetch(`/api/admin/matrix-login?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginResult({ success: false, error: data.error, availableFlows: data.availableFlows });
      } else {
        setLoginResult(data);
        setPassword("");
      }
    } catch (e) {
      setLoginResult({ success: false, error: e instanceof Error ? e.message : "Login failed" });
    } finally {
      setLoginLoading(false);
    }
  }

  if (serverLoading) {
    return <div className="p-6 text-muted-foreground">Loading servers…</div>;
  }
  if (!current) {
    return <div className="p-6 text-muted-foreground">Select a server to configure admin login.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <span className="text-sm text-muted-foreground">— {current.serverName}</span>
      </div>

      {/* Architecture explanation */}
      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-800 dark:text-blue-200 space-y-2">
        <p className="font-medium flex items-center gap-2"><Info className="h-4 w-4" /> How admin login works</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Authenticate with the homeserver using the official <strong>Matrix login API</strong> (<code>POST /_matrix/client/v3/login</code>)</li>
          <li>Verify identity with <code>GET /_matrix/client/v3/account/whoami</code></li>
          <li>Confirm admin status via <strong>Synapse Admin API</strong> (<code>GET /_synapse/admin/v2/users/&lcub;userId&rcub;</code>)</li>
          <li>Store the resulting access token <strong>encrypted, server-side only</strong></li>
        </ol>
        <p className="text-xs">There is no special admin-token-minting endpoint. This is the standard, correct way to obtain admin credentials.</p>
      </div>

      {/* Login flow discovery */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Login Flow Discovery</h2>
        {flowsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Discovering login flows…</div>
        ) : flowsError ? (
          <div className="flex items-center gap-2 text-red-600"><XCircle className="h-4 w-4" /> {flowsError}</div>
        ) : flows ? (
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Login URL:</strong> <code className="text-xs">{flows.loginUrl}</code>
            </div>
            <div className="text-sm">
              <strong>Available flows:</strong>
            </div>
            <div className="flex flex-wrap gap-2">
              {flows.flows.map((f) => (
                <span
                  key={f.type}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    f.type === "m.login.password"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f.type === "m.login.password" && <CheckCircle2 className="h-3 w-3" />}
                  {f.type}
                </span>
              ))}
            </div>
            {!flows.hasPasswordLogin && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-800 dark:text-amber-200 text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Password login is not available on this homeserver. Admin login via this form requires <code>m.login.password</code>.
                This homeserver may use SSO or delegated authentication.
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Login form */}
      <form onSubmit={handleLogin} className="rounded-lg border p-4 space-y-4 max-w-md">
        <h2 className="font-medium flex items-center gap-2"><LogIn className="h-4 w-4" /> Admin Credentials</h2>

        <div className="space-y-2">
          <Label htmlFor="userId">Matrix User ID</Label>
          <Input
            id="userId"
            placeholder={`@admin:${current.serverName}`}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Full Matrix ID: @localpart:server</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Password is used only to obtain an access token and is never stored.
          </p>
        </div>

        <Button
          type="submit"
          disabled={loginLoading || !userId || !password || (flows !== null && !flows.hasPasswordLogin)}
          className="w-full"
        >
          {loginLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Authenticating…</>
          ) : (
            <><Shield className="h-4 w-4 mr-2" /> Login &amp; Verify Admin</>
          )}
        </Button>
      </form>

      {/* Login result */}
      {loginResult && (
        <div className={`rounded-lg border p-4 ${
          loginResult.success
            ? "bg-green-50 dark:bg-green-950/30 border-green-200"
            : "bg-red-50 dark:bg-red-950/30 border-red-200"
        }`}>
          {loginResult.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-medium">
                <CheckCircle2 className="h-5 w-5" /> Admin Login Successful
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <div><strong>User ID:</strong> {loginResult.userId}</div>
                <div><strong>Device ID:</strong> {loginResult.deviceId}</div>
                <div><strong>Admin:</strong> {loginResult.admin ? "Yes" : "No"}</div>
                <div>{loginResult.message}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200 font-medium">
                <XCircle className="h-5 w-5" /> Login Failed
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">{loginResult.error}</div>
              {loginResult.availableFlows && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  Available flows: {loginResult.availableFlows.join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Security notes */}
      <div className="rounded-lg border p-4 text-sm space-y-2">
        <h3 className="font-medium flex items-center gap-2"><Lock className="h-4 w-4" /> Security</h3>
        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
          <li>Passwords are used transiently for login and never stored</li>
          <li>Only the resulting access token is stored, encrypted at rest (AES-256-GCM)</li>
          <li>The raw token is never exposed to the browser after acquisition</li>
          <li>All login attempts (successful and failed) are audit-logged</li>
          <li>To rotate the token, simply log in again</li>
        </ul>
      </div>
    </div>
  );
}
