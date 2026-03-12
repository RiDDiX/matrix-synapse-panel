"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { LayoutDashboard, KeyRound, ScrollText, Activity, Paintbrush, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tokens", label: "Tokens", icon: KeyRound },
  { href: "/admin/branding", label: "Branding", icon: Paintbrush },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/diagnostics", label: "Diagnostics", icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setAuthenticated(true);
      return;
    }

    fetch("/api/auth/session")
      .then((res) => {
        if (!res.ok) {
          router.push("/admin/login");
        } else {
          setAuthenticated(true);
        }
      })
      .catch(() => router.push("/admin/login"));
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (authenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <KeyRound className="h-5 w-5 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-foreground">RiDDiX Invite Portal</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <span className="font-semibold">RiDDiX Invite Portal</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <nav className="flex items-center gap-1 border-b px-4 py-2 md:hidden overflow-x-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                  active ? "bg-accent font-medium" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
