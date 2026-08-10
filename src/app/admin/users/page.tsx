"use client";

import { useState, useEffect, useCallback } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import {
  Users, Search, Plus, Shield, Ban, Trash2, RotateCcw,
  Loader2, ChevronLeft, ChevronRight, CheckCircle2, Lock,
  Unlock, Eye, EyeOff, AlertTriangle, UserPlus, Smartphone, DoorOpen,
  Bell, Ghost, X, Info,
} from "lucide-react";

interface SynapseUser {
  name: string;
  displayname: string | null;
  avatar_url: string | null;
  admin: boolean;
  deactivated: boolean;
  shadow_banned: boolean;
  creation_ts: number;
  last_seen_ts: number | null;
  locked: boolean;
  erased?: boolean;
}

const PAGE_SIZE = 50;

export default function UserControlPage() {
  const { current } = useServerContext();
  const [users, setUsers] = useState<SynapseUser[]>([]);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState(0);
  const [nextToken, setNextToken] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create user form
  const [showCreate, setShowCreate] = useState(false);
  const [newLocalpart, setNewLocalpart] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayname, setNewDisplayname] = useState("");
  const [newAdmin, setNewAdmin] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ userId: string; type: "success" | "error"; text: string } | null>(null);

  // Reactivate modal
  const [reactivateUser, setReactivateUser] = useState<string | null>(null);
  const [reactivatePassword, setReactivatePassword] = useState("");

  // Details panel
  const [detailsUser, setDetailsUser] = useState<SynapseUser | null>(null);

  const fetchUsers = useCallback(async (fromOffset = 0, searchTerm = "") => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        serverId: current.id,
        limit: String(PAGE_SIZE),
        from: String(fromOffset),
      });
      if (searchTerm) params.set("name", searchTerm);
      if (showDeactivated) params.set("deactivated", "true");

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to load users (${res.status})`);
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setNextToken(data.next_token);
      setFrom(fromOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    }
    setLoading(false);
  }, [current, showDeactivated]);

  useEffect(() => {
    setFrom(0);
    fetchUsers(0, search);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, search, showDeactivated]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !newLocalpart || !newPassword) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/admin/users?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localpart: newLocalpart,
          password: newPassword,
          displayname: newDisplayname || undefined,
          admin: newAdmin,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create user");
      }
      setNewLocalpart("");
      setNewPassword("");
      setNewDisplayname("");
      setNewAdmin(false);
      setShowCreate(false);
      await fetchUsers(0, search);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create user");
    }
    setCreateLoading(false);
  }

  async function handleAction(userId: string, action: string, extra?: Record<string, unknown>) {
    if (!current) return;
    setActionLoading(userId);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}?serverId=${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Action failed (${res.status})`);
      }
      setActionMsg({ userId, type: "success", text: `${action} successful` });
      await fetchUsers(from, search);
    } catch (e) {
      setActionMsg({ userId, type: "error", text: e instanceof Error ? e.message : "Action failed" });
    }
    setActionLoading(null);
  }

  async function handleReactivateSubmit() {
    if (!reactivateUser || reactivatePassword.length < 8) return;
    await handleAction(reactivateUser, "reactivate", { password: reactivatePassword });
    setReactivateUser(null);
    setReactivatePassword("");
  }

  function confirmDeactivate(userId: string) {
    if (confirm(`Deactivate ${userId}? The user will no longer be able to log in.`)) {
      handleAction(userId, "deactivate");
    }
  }

  function confirmErase(userId: string) {
    if (
      confirm(
        `PERMANENTLY ERASE ${userId}? This deactivates the account and deletes all user data (GDPR erase) and cannot be undone. ` +
          `Note: Synapse never frees a user ID — ${userId} stays permanently reserved and can never be re-registered.`
      )
    ) {
      handleAction(userId, "deactivate", { erase: true });
    }
  }

  async function handleToggleLock(userId: string, locked: boolean) {
    if (!current) return;
    setActionLoading(userId);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}?serverId=${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update user");
      }
      setActionMsg({ userId, type: "success", text: locked ? "User locked" : "User unlocked" });
      await fetchUsers(from, search);
    } catch (e) {
      setActionMsg({ userId, type: "error", text: e instanceof Error ? e.message : "Action failed" });
    }
    setActionLoading(null);
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">No homeserver configured</p>
        <p className="text-sm">Add a homeserver under Servers to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> User Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Matrix users on <strong>{current.name}</strong> — {total.toLocaleString()} users total
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus className="w-4 h-4 mr-1" /> Create User
        </Button>
      </div>

      {/* Create user form */}
      {showCreate && (
        <div className="p-4 rounded-lg border bg-card space-y-4">
          <h2 className="text-sm font-medium">Create New User</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Username (localpart)</label>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground mr-1">@</span>
                  <input
                    type="text"
                    value={newLocalpart}
                    onChange={(e) => setNewLocalpart(e.target.value.toLowerCase())}
                    className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
                    placeholder="username"
                    required
                  />
                  <span className="text-xs text-muted-foreground ml-1">:{current.serverName}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
                    placeholder="min. 8 characters"
                    minLength={8}
                    required
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Display Name (optional)</label>
                <input
                  type="text"
                  value={newDisplayname}
                  onChange={(e) => setNewDisplayname(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm mt-1"
                  placeholder="Display Name"
                />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAdmin}
                    onChange={(e) => setNewAdmin(e.target.checked)}
                    className="rounded"
                  />
                  Server Admin
                </label>
              </div>
            </div>
            {createError && (
              <p className="text-xs text-red-600">{createError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={createLoading}>
                {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Create
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-md border bg-background pl-9 pr-3 py-1.5 text-sm"
              placeholder="Search users by name or ID..."
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showDeactivated}
            onChange={(e) => setShowDeactivated(e.target.checked)}
            className="rounded"
          />
          Show deactivated
        </label>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchUsers(from, search)} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* Reactivate modal */}
      {reactivateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="font-medium">Reactivate User</h3>
            <p className="text-sm text-muted-foreground">
              Set a new password for <code className="text-xs">{reactivateUser}</code> to reactivate the account.
            </p>
            <input
              type="password"
              value={reactivatePassword}
              onChange={(e) => setReactivatePassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              placeholder="New password (min. 8 characters)"
              minLength={8}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setReactivateUser(null); setReactivatePassword(""); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleReactivateSubmit} disabled={reactivatePassword.length < 8 || actionLoading === reactivateUser}>
                {actionLoading === reactivateUser ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                Reactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User table */}
      {loading && users.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">User ID</th>
                  <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Display Name</th>
                  <th className="text-center px-4 py-2 font-medium">Role</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Created</th>
                  <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Last Seen</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">
                      <code className="text-xs">{user.name}</code>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell text-muted-foreground">
                      {user.displayname || "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {user.admin ? (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">User</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {user.deactivated ? (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                          <Ban className="w-3 h-3" /> Deactivated
                        </span>
                      ) : user.locked ? (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 hidden lg:table-cell text-xs text-muted-foreground">
                      {user.creation_ts ? new Date(user.creation_ts * 1000).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2 hidden lg:table-cell text-xs text-muted-foreground">
                      {user.last_seen_ts ? new Date(user.last_seen_ts).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actionMsg?.userId === user.name && (
                          <span className={`text-xs mr-1 ${actionMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                            {actionMsg.text}
                          </span>
                        )}
                        {user.shadow_banned && !user.deactivated && (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 mr-1" title="Shadow-banned">
                            <Ghost className="w-3 h-3" /> shadow
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailsUser(user)}
                          title="Details, devices, rooms, whois, notice"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </Button>
                        {actionLoading === user.name ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : user.deactivated ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReactivateUser(user.name)}
                              title="Reactivate user"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reactivate
                            </Button>
                            {!user.erased && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmErase(user.name)}
                                title="Erase user data (GDPR delete)"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Erase
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            {user.locked ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleLock(user.name, false)}
                                title="Unlock user"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleLock(user.name, true)}
                                title="Lock user (prevent login)"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDeactivate(user.name)}
                              title="Deactivate user"
                              className="text-orange-600 hover:text-orange-600"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmErase(user.name)}
                              title="Erase user (GDPR delete)"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {from + 1}–{Math.min(from + users.length, total)} of {total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={from === 0 || loading}
            onClick={() => fetchUsers(Math.max(0, from - PAGE_SIZE), search)}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!nextToken || loading}
            onClick={() => nextToken !== undefined && fetchUsers(nextToken, search)}
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {detailsUser && current && (
        <UserDetailsPanel
          serverId={current.id}
          user={detailsUser}
          onClose={() => setDetailsUser(null)}
          onChanged={() => fetchUsers(from, search)}
        />
      )}
    </div>
  );
}

interface UserDevice {
  device_id: string;
  display_name: string | null;
  last_seen_ip: string | null;
  last_seen_user_agent: string | null;
  last_seen_ts: number | null;
}

interface WhoisConnection {
  ip: string;
  last_seen: number;
  user_agent: string;
}

function UserDetailsPanel({
  serverId,
  user,
  onClose,
  onChanged,
}: {
  serverId: string;
  user: SynapseUser;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [whois, setWhois] = useState<Record<string, { sessions: Array<{ connections: WhoisConnection[] }> }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [shadowBanned, setShadowBanned] = useState(user.shadow_banned);
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeSent, setNoticeSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [devRes, roomsRes, whoisRes] = await Promise.all([
        fetch(`/api/admin/users/${encodeURIComponent(user.name)}/devices?serverId=${serverId}`),
        fetch(`/api/admin/users/${encodeURIComponent(user.name)}/joined-rooms?serverId=${serverId}`),
        fetch(`/api/admin/users/${encodeURIComponent(user.name)}/whois?serverId=${serverId}`),
      ]);
      if (devRes.ok) setDevices((await devRes.json()).devices ?? []);
      if (roomsRes.ok) setRooms((await roomsRes.json()).joined_rooms ?? []);
      if (whoisRes.ok) setWhois((await whoisRes.json()).devices ?? {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load details");
    } finally {
      setLoading(false);
    }
  }, [serverId, user.name]);

  useEffect(() => { load(); }, [load]);

  async function deleteDevice(deviceId: string) {
    if (!confirm(`Delete device ${deviceId}? The user will be logged out from it.`)) return;
    setBusy(deviceId);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(user.name)}/devices?serverId=${serverId}&deviceId=${encodeURIComponent(deviceId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setDevices(devices.filter((d) => d.device_id !== deviceId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function logoutAll() {
    if (devices.length === 0) return;
    if (!confirm(`Log out ${devices.length} device(s) for ${user.name}?`)) return;
    setBusy("all");
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(user.name)}/devices?serverId=${serverId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ devices: devices.map((d) => d.device_id) }),
        }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "Logout failed");
      setDevices([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Logout failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleShadowBan() {
    const next = !shadowBanned;
    setBusy("shadow");
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(user.name)}/shadow-ban?serverId=${serverId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: next }),
        }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setShadowBanned(next);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function sendNotice() {
    if (!noticeBody.trim()) return;
    setBusy("notice");
    setNoticeSent(null);
    try {
      const res = await fetch(`/api/admin/server-notices?serverId=${serverId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.name,
          content: { msgtype: "m.text", body: noticeBody.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setNoticeBody("");
      setNoticeSent(data.event_id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-medium">{user.displayname || user.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{user.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-6">
          {err && <p className="text-sm text-red-600">{err}</p>}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Devices ({devices.length})
                  </h4>
                  {devices.length > 0 && (
                    <Button variant="outline" size="sm" onClick={logoutAll} disabled={busy === "all"}>
                      {busy === "all" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Ban className="w-3.5 h-3.5 mr-1" />}
                      Log out all
                    </Button>
                  )}
                </div>
                {devices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active devices.</p>
                ) : (
                  <div className="border rounded-md divide-y">
                    {devices.map((d) => (
                      <div key={d.device_id} className="p-3 flex items-start justify-between gap-4 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{d.display_name || "Unnamed device"}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">{d.device_id}</div>
                          {(d.last_seen_ip || d.last_seen_ts) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {d.last_seen_ip && <span>{d.last_seen_ip}</span>}
                              {d.last_seen_ts && <span> · {new Date(d.last_seen_ts).toLocaleString()}</span>}
                            </div>
                          )}
                          {d.last_seen_user_agent && (
                            <div className="text-xs text-muted-foreground truncate" title={d.last_seen_user_agent}>
                              {d.last_seen_user_agent}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={busy === d.device_id}
                          onClick={() => deleteDevice(d.device_id)}
                        >
                          {busy === d.device_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <DoorOpen className="w-4 h-4" /> Joined rooms ({rooms.length})
                </h4>
                {rooms.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Not a member of any rooms.</p>
                ) : (
                  <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                    {rooms.map((r) => (
                      <div key={r} className="text-xs font-mono text-muted-foreground break-all">{r}</div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4" /> IP history (whois)
                </h4>
                {whois && Object.keys(whois).length > 0 ? (
                  <div className="border rounded-md divide-y text-xs">
                    {Object.entries(whois).flatMap(([devId, d]) =>
                      d.sessions.flatMap((s) =>
                        s.connections.map((c, i) => (
                          <div key={`${devId}-${i}-${c.last_seen}`} className="p-2 flex justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-mono">{c.ip}</div>
                              <div className="text-muted-foreground truncate" title={c.user_agent}>{c.user_agent}</div>
                            </div>
                            <div className="text-muted-foreground whitespace-nowrap">{new Date(c.last_seen).toLocaleString()}</div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No recorded connections.</p>
                )}
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Ghost className="w-4 h-4" /> Shadow ban
                </h4>
                <p className="text-xs text-muted-foreground">
                  Shadow-banned users can still use the server, but their messages are silently dropped for other users.
                </p>
                <Button
                  variant={shadowBanned ? "outline" : "default"}
                  size="sm"
                  onClick={toggleShadowBan}
                  disabled={busy === "shadow"}
                >
                  {busy === "shadow" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Ghost className="w-3.5 h-3.5 mr-1" />}
                  {shadowBanned ? "Remove shadow ban" : "Shadow ban"}
                </Button>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Send server notice
                </h4>
                <p className="text-xs text-muted-foreground">
                  Opens (or reuses) the Server Notices room with this user and posts a message. Requires server notices to be configured on the homeserver.
                </p>
                <textarea
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Notice body (plain text)…"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={sendNotice} disabled={busy === "notice" || !noticeBody.trim()}>
                    {busy === "notice" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Bell className="w-3.5 h-3.5 mr-1" />}
                    Send notice
                  </Button>
                  {noticeSent && <span className="text-xs text-green-600">Sent — {noticeSent}</span>}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
