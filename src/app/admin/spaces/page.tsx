"use client";

import { useState } from "react";
import { useServerContext } from "@/lib/server-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Boxes, Plus, Trash2, RefreshCw } from "lucide-react";

export default function SpacesPage() {
  const { current } = useServerContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [spaceName, setSpaceName] = useState("");
  const [spaceTopic, setSpaceTopic] = useState("");
  const [spaceAlias, setSpaceAlias] = useState("");
  const [spaceVisibility, setSpaceVisibility] = useState<"public" | "private">("private");

  const [spaceId, setSpaceId] = useState("");
  const [childRoomId, setChildRoomId] = useState("");
  const [childSuggested, setChildSuggested] = useState(false);

  async function createSpace() {
    if (!current || !spaceName) return;
    setLoading(true);
    setError(null);
    setActionMsg(null);
    try {
      const body: Record<string, unknown> = {
        action: "create",
        name: spaceName,
        visibility: spaceVisibility,
      };
      if (spaceTopic) body.topic = spaceTopic;
      if (spaceAlias) body.room_alias_name = spaceAlias;

      const res = await fetch(`/api/admin/spaces?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details));
      setActionMsg(`Space created: ${data.room_id}`);
      setSpaceId(data.room_id);
      setSpaceName("");
      setSpaceTopic("");
      setSpaceAlias("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create space");
    } finally {
      setLoading(false);
    }
  }

  async function addChild() {
    if (!current || !spaceId || !childRoomId) return;
    setError(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/spaces?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_child",
          space_id: spaceId,
          room_id: childRoomId,
          suggested: childSuggested,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`Room ${childRoomId} added to space`);
      setChildRoomId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add child");
    }
  }

  async function removeChild() {
    if (!current || !spaceId || !childRoomId) return;
    setError(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/spaces?serverId=${current.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_child",
          space_id: spaceId,
          room_id: childRoomId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`Room ${childRoomId} removed from space`);
      setChildRoomId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove child");
    }
  }

  if (!current) {
    return <div className="text-muted-foreground">Select a server to manage spaces.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes className="h-6 w-6" /> Space Management</h1>
        <p className="text-muted-foreground text-sm">Create Matrix Spaces and manage room hierarchy.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {actionMsg && <div className="rounded-lg border border-green-500 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">{actionMsg}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Create Space</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name *</label>
              <Input placeholder="My Space" value={spaceName} onChange={(e) => setSpaceName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Topic</label>
              <Input placeholder="Description..." value={spaceTopic} onChange={(e) => setSpaceTopic(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Alias</label>
              <Input placeholder="my-space" value={spaceAlias} onChange={(e) => setSpaceAlias(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Visibility</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm bg-background" value={spaceVisibility} onChange={(e) => setSpaceVisibility(e.target.value as "public" | "private")}>
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
            <Button onClick={createSpace} disabled={loading || !spaceName}>
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Space
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Manage Space Children</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Space ID</label>
              <Input placeholder="!spaceId:server" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Room ID</label>
              <Input placeholder="!roomId:server" value={childRoomId} onChange={(e) => setChildRoomId(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="suggested" checked={childSuggested} onChange={(e) => setChildSuggested(e.target.checked)} className="rounded" />
              <label htmlFor="suggested" className="text-sm">Suggested room</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={addChild} disabled={!spaceId || !childRoomId} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Room
              </Button>
              <Button variant="destructive" onClick={removeChild} disabled={!spaceId || !childRoomId} size="sm">
                <Trash2 className="h-4 w-4 mr-1" /> Remove Room
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
