"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KeyRound, CheckCircle2, Clock, XCircle, Ban, UserPlus,
  Users, Bot, Puzzle, Activity,
} from "lucide-react";
import { useServerContext } from "@/lib/server-context";
import type { DashboardStats } from "@/lib/types";

export default function OverviewPage() {
  const { current, loading: serverLoading } = useServerContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!current) {
      setStats(null);
      return;
    }
    setError(null);
    fetch(`/api/admin/stats?serverId=${current.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [current]);

  if (serverLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">No homeserver configured</p>
        <p className="text-sm">Add a homeserver under Servers to get started.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Could not load dashboard data.</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const tokenCards = [
    { label: "Total Tokens", value: stats.totalTokens, icon: KeyRound, color: "text-blue-600 dark:text-blue-400" },
    { label: "Valid", value: stats.validTokens, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Expired", value: stats.expiredTokens, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
    { label: "Exhausted", value: stats.exhaustedTokens, icon: XCircle, color: "text-orange-600 dark:text-orange-400" },
    { label: "Disabled", value: stats.disabledTokens, icon: Ban, color: "text-red-600 dark:text-red-400" },
    { label: "Registrations (24h)", value: stats.recentRegistrations, icon: UserPlus, color: "text-violet-600 dark:text-violet-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Server status, users, bots, integrations, and token statistics.</p>
      </div>

      {/* Server-wide counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">on this homeserver</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bots</CardTitle>
            <Bot className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.activeBots}
              <span className="text-lg font-normal text-muted-foreground"> / {stats.totalBots}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">running / total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Integrations</CardTitle>
            <Puzzle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.activeIntegrations}
              <span className="text-lg font-normal text-muted-foreground"> / {stats.totalIntegrations}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">active / installed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registrations (24h)</CardTitle>
            <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.recentRegistrations}</div>
            <p className="text-xs text-muted-foreground mt-1">new accounts today</p>
          </CardContent>
        </Card>
      </div>

      {/* Token statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Invitation Tokens</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokenCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
