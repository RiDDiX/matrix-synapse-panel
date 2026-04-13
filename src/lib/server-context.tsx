"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";

export interface ServerInfo {
  id: string;
  name: string;
  slug: string;
  serverName: string;
  status: string;
  enabled: boolean;
  isDefault: boolean;
}

export type ServerHealth = "ok" | "down" | "unknown" | "disabled";

interface ServerContextValue {
  servers: ServerInfo[];
  current: ServerInfo | null;
  loading: boolean;
  health: Record<string, ServerHealth>;
  lastHealthCheck: Date | null;
  setCurrent: (server: ServerInfo) => void;
  refresh: () => Promise<void>;
  refreshHealth: () => Promise<void>;
}

const ServerContext = createContext<ServerContextValue>({
  servers: [],
  current: null,
  loading: true,
  health: {},
  lastHealthCheck: null,
  setCurrent: () => {},
  refresh: async () => {},
  refreshHealth: async () => {},
});

const STORAGE_KEY = "admin_selected_server_id";
const HEALTH_INTERVAL_MS = 60_000;

export function ServerProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [current, setCurrentState] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Record<string, ServerHealth>>({});
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const healthAbortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/servers");
      if (!res.ok) return;
      const data = await res.json();
      const list: ServerInfo[] = data.servers ?? [];
      setServers(list);

      const storedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const stored = storedId ? list.find((s: ServerInfo) => s.id === storedId) : null;
      const defaultServer = list.find((s: ServerInfo) => s.isDefault && s.enabled);
      const first = list.find((s: ServerInfo) => s.enabled) ?? list[0] ?? null;

      setCurrentState(stored ?? defaultServer ?? first);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshHealth = useCallback(async () => {
    if (healthAbortRef.current) healthAbortRef.current.abort();
    const controller = new AbortController();
    healthAbortRef.current = controller;
    try {
      const res = await fetch("/api/admin/servers/health", { signal: controller.signal, cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, ServerHealth> = {};
      for (const entry of data.health as Array<{ id: string; ok: boolean; skipped?: boolean }>) {
        if (entry.skipped) map[entry.id] = "disabled";
        else map[entry.id] = entry.ok ? "ok" : "down";
      }
      setHealth(map);
      setLastHealthCheck(new Date());
    } catch {
      // aborted or network error — leave health untouched
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (servers.length === 0) return;
    refreshHealth();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshHealth();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshHealth();
    }, HEALTH_INTERVAL_MS);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      healthAbortRef.current?.abort();
    };
  }, [servers, refreshHealth]);

  const setCurrent = useCallback((server: ServerInfo) => {
    setCurrentState(server);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, server.id);
    }
  }, []);

  return (
    <ServerContext.Provider value={{ servers, current, loading, health, lastHealthCheck, setCurrent, refresh, refreshHealth }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServerContext() {
  return useContext(ServerContext);
}
