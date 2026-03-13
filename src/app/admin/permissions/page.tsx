"use client";

import { useState, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { UserCog, RefreshCw, Plus, Trash2, Shield } from "lucide-react";

interface AdminUserWithPerms {
  id: string;
  email: string;
  name: string | null;
  role: string;
  permissions: Array<{ id: string; serverId: string | null; permission: string }>;
}

export default function PermissionsPage() {
  const { servers } = useServerContext();
  const [users, setUsers] = useState<AdminUserWithPerms[]>([]);
  const [validPerms, setValidPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [grantPerm, setGrantPerm] = useState("");
  const [grantServer, setGrantServer] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/permissions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
      setValidPerms(data.valid_permissions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  async function grant() {
    if (!selectedUser || !grantPerm) return;
    setError(null);
    setActionMsg(null);
    try {
      const body: Record<string, string> = { userId: selectedUser, permission: grantPerm };
      if (grantServer) body.serverId = grantServer;
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`Permission "${grantPerm}" granted`);
      setGrantPerm("");
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grant failed");
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this permission?")) return;
    setError(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/permissions?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg("Permission revoked");
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    }
  }

  const selected = users.find((u) => u.id === selectedUser);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="h-6 w-6" /> Admin Permissions</h1>
          <p className="text-muted-foreground text-sm">Manage per-user and per-server permissions (RBAC).</p>
        </div>
        <Button onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Load
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {actionMsg && <div className="rounded-lg border border-green-500 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">{actionMsg}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-lg border">
          <div className="p-3 border-b font-semibold text-sm">Admin Users</div>
          {users.length === 0 && !loading && (
            <div className="p-4 text-sm text-muted-foreground">Click Load to fetch admin users.</div>
          )}
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u.id)}
              className={`flex w-full items-center gap-3 p-3 text-sm border-b last:border-0 hover:bg-muted/50 transition-colors text-left ${
                selectedUser === u.id ? "bg-muted" : ""
              }`}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{u.name || u.email}</div>
                <div className="text-xs text-muted-foreground">{u.role} • {u.permissions.length} permissions</div>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected && (
            <>
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold">{selected.name || selected.email}</h3>
                <p className="text-xs text-muted-foreground">Role: {selected.role} • Email: {selected.email}</p>

                {selected.role === "global_admin" && (
                  <div className="rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300">
                    Global admins have full access. Granular permissions apply to non-admin roles.
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold text-sm">Grant Permission</h3>
                <div className="flex gap-2 flex-wrap">
                  <select className="rounded-md border px-3 py-2 text-sm bg-background flex-1" value={grantPerm} onChange={(e) => setGrantPerm(e.target.value)}>
                    <option value="">Select permission...</option>
                    {validPerms.map((p) => (
                      <option key={p} value={p} disabled={selected.permissions.some((sp) => sp.permission === p && !sp.serverId)}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <select className="rounded-md border px-3 py-2 text-sm bg-background" value={grantServer} onChange={(e) => setGrantServer(e.target.value)}>
                    <option value="">Global (all servers)</option>
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={grant} disabled={!grantPerm}>
                    <Plus className="h-4 w-4 mr-1" /> Grant
                  </Button>
                </div>
              </div>

              {selected.permissions.length > 0 && (
                <div className="rounded-lg border">
                  <div className="grid grid-cols-3 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
                    <div>Permission</div><div>Scope</div><div className="text-right">Actions</div>
                  </div>
                  {selected.permissions.map((p) => (
                    <div key={p.id} className="grid grid-cols-3 gap-4 p-3 text-sm border-b last:border-0 items-center">
                      <div className="font-mono text-xs">{p.permission}</div>
                      <div className="text-xs">
                        {p.serverId ? (
                          <span className="rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-blue-700 dark:text-blue-300">
                            {servers.find((s) => s.id === p.serverId)?.name || p.serverId}
                          </span>
                        ) : (
                          <span className="rounded bg-muted px-2 py-0.5">Global</span>
                        )}
                      </div>
                      <div className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => revoke(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selected.permissions.length === 0 && (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground text-center">
                  No granular permissions assigned. {selected.role === "global_admin" ? "Global admins have full access by default." : "Grant permissions above."}
                </div>
              )}
            </>
          )}

          {!selected && users.length > 0 && (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              Select a user to manage their permissions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
