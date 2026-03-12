"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export interface ServerInfo {
  id: string;
  name: string;
  slug: string;
  serverName: string;
  status: string;
  enabled: boolean;
  isDefault: boolean;
}

interface ServerContextValue {
  servers: ServerInfo[];
  current: ServerInfo | null;
  loading: boolean;
  setCurrent: (server: ServerInfo) => void;
  refresh: () => Promise<void>;
}

const ServerContext = createContext<ServerContextValue>({
  servers: [],
  current: null,
  loading: true,
  setCurrent: () => {},
  refresh: async () => {},
});

const STORAGE_KEY = "admin_selected_server_id";

export function ServerProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [current, setCurrentState] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setCurrent = useCallback((server: ServerInfo) => {
    setCurrentState(server);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, server.id);
    }
  }, []);

  return (
    <ServerContext.Provider value={{ servers, current, loading, setCurrent, refresh }}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServerContext() {
  return useContext(ServerContext);
}
