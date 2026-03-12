"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { getTokenStatus } from "@/lib/types";
import type { TokenWithMeta, TokenStatus } from "@/lib/types";
import { Plus, Copy, Trash2, Ban, Link2, RefreshCw } from "lucide-react";

const statusVariant: Record<TokenStatus, "success" | "warning" | "destructive" | "secondary"> = {
  valid: "success",
  expired: "warning",
  exhausted: "destructive",
  disabled: "secondary",
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tokens");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTokens(data.tokens ?? []);
    } catch {
      toast({ title: "Error", description: "Could not load tokens.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  async function handleDelete(token: string) {
    if (!confirm(`Delete token "${token}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/tokens/${encodeURIComponent(token)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Token deleted", variant: "default" });
      fetchTokens();
    } catch {
      toast({ title: "Error", description: "Could not delete token.", variant: "destructive" });
    }
  }

  async function handleDisable(token: string) {
    try {
      const res = await fetch(`/api/admin/tokens/${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uses_allowed: 0 }),
      });
      if (!res.ok) throw new Error("Failed to disable");
      toast({ title: "Token disabled" });
      fetchTokens();
    } catch {
      toast({ title: "Error", description: "Could not disable token.", variant: "destructive" });
    }
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    toast({ title: "Copied to clipboard" });
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/register?token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Invite link copied" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tokens</h1>
          <p className="text-muted-foreground">Manage registration invitation tokens.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTokens} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Token
          </Button>
        </div>
      </div>

      {showCreate && (
        <CreateTokenForm
          onCreated={() => { setShowCreate(false); fetchTokens(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading && tokens.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : tokens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No tokens yet</p>
            <p className="text-sm">Create your first invitation token to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tokens.map((t) => {
            const status = getTokenStatus(t);
            return (
              <Card key={t.token}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono font-semibold truncate max-w-[200px] sm:max-w-none">{t.token}</code>
                      <Badge variant={statusVariant[status]}>{status}</Badge>
                    </div>
                    {t.label && <p className="text-sm text-muted-foreground">{t.label}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Uses: {t.completed}/{t.uses_allowed ?? "∞"}</span>
                      <span>Pending: {t.pending}</span>
                      <span>Expires: {formatDate(t.expiry_time)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" title="Copy token" onClick={() => copyToken(t.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Copy invite link" onClick={() => copyInviteLink(t.token)}>
                      <Link2 className="h-4 w-4" />
                    </Button>
                    {status === "valid" && (
                      <Button variant="ghost" size="icon" title="Disable" onClick={() => handleDisable(t.token)}>
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Delete" className="text-destructive" onClick={() => handleDelete(t.token)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateTokenForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [customToken, setCustomToken] = useState("");
  const [length, setLength] = useState(16);
  const [usesAllowed, setUsesAllowed] = useState("1");
  const [expiryDate, setExpiryDate] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const body: Record<string, unknown> = {};
    if (customToken.trim()) {
      body.token = customToken.trim();
    } else {
      body.length = length;
    }

    const uses = parseInt(usesAllowed, 10);
    body.uses_allowed = isNaN(uses) ? null : uses;

    if (expiryDate) {
      body.expiry_time = new Date(expiryDate).getTime();
    }

    if (label.trim()) {
      body.label = label.trim();
    }

    try {
      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create token");
      }

      toast({ title: "Token created" });
      onCreated();
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to create", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create Token</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Custom Token (optional)</Label>
            <Input
              placeholder="Leave empty for random"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              pattern="[A-Za-z0-9._~-]*"
            />
          </div>
          <div className="space-y-2">
            <Label>Random Length</Label>
            <Input
              type="number"
              min={8}
              max={64}
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value, 10))}
              disabled={!!customToken.trim()}
            />
          </div>
          <div className="space-y-2">
            <Label>Uses Allowed</Label>
            <Input
              type="number"
              min={0}
              placeholder="Leave empty for unlimited"
              value={usesAllowed}
              onChange={(e) => setUsesAllowed(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input
              type="datetime-local"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Label / Note</Label>
            <Input
              placeholder="Internal label for this token"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
