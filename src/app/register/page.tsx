"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CheckCircle2, UserPlus, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const prefillToken = searchParams.get("token") ?? "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState(prefillToken);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [success, setSuccess] = useState<{ userId: string; homeserver: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillToken) {
      setToken(prefillToken);
      validateToken(prefillToken);
    }
  }, [prefillToken]);

  async function validateToken(value: string) {
    if (!value.trim()) {
      setTokenValid(null);
      return;
    }
    try {
      const res = await fetch("/api/register/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setTokenValid(data.valid === true);
      } else {
        setTokenValid(false);
      }
    } catch {
      setTokenValid(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, confirmPassword, token, displayName: displayName || undefined }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess({ userId: data.userId, homeserver: data.homeserver });
      } else {
        setError(data.error ?? "Registration failed. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold">Registration Successful</h2>
            <p className="text-muted-foreground">
              Your account <code className="font-mono text-sm font-semibold">{success.userId}</code> has been created.
            </p>
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-left w-full space-y-2">
              <p className="font-medium">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Download a Matrix client such as <a href="https://element.io" target="_blank" rel="noopener noreferrer" className="underline">Element</a></li>
                <li>Set the homeserver to <code className="font-mono text-xs">{success.homeserver}</code></li>
                <li>Sign in with your username and password</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Create Account</CardTitle>
          <CardDescription>Register with an invitation code</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Invitation Code</Label>
              <div className="relative">
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => { setToken(e.target.value); setTokenValid(null); }}
                  onBlur={() => validateToken(token)}
                  placeholder="Enter your invitation code"
                  required
                  autoComplete="off"
                />
                {tokenValid !== null && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${tokenValid ? "text-emerald-600" : "text-red-500"}`}>
                    {tokenValid ? "Valid" : "Invalid"}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="Choose a username"
                required
                autoComplete="username"
                pattern="[a-z0-9._=-]+"
                title="Lowercase letters, numbers, and ._=- only"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (optional)</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
