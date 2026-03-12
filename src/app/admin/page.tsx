"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, CheckCircle2, Clock, XCircle, Ban, UserPlus } from "lucide-react";
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

  const cards = [
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
        <p className="text-muted-foreground">Invitation token statistics and recent activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
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
  );
}
