"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, UserPlus, Eye, EyeOff } from "lucide-react";

interface Branding {
  appTitle: string;
  subtitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  heroImageUrl: string | null;
  backgroundImageUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  panelColor: string;
  textColor: string;
  buttonStyle: string;
  inputStyle: string;
  borderRadius: string;
  shadowIntensity: string;
  spacingDensity: string;
  layoutPreset: string;
  welcomeHeadline: string;
  registrationText: string;
  successMessage: string;
  footerText: string;
  supportText: string;
  privacyPolicyUrl: string | null;
  imprintUrl: string | null;
  termsUrl: string | null;
  helpUrl: string | null;
  homeserverDisplayName: string;
  homeserverUrlText: string | null;
  clientRecommendation: string;
  postRegistrationText: string;
}

const RADIUS: Record<string, string> = {
  none: "0", sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", full: "9999px",
};
const SHADOW: Record<string, string> = {
  none: "none", sm: "0 1px 3px rgba(0,0,0,0.06)", md: "0 4px 6px rgba(0,0,0,0.07)", lg: "0 10px 15px rgba(0,0,0,0.1)",
};
const SPACING: Record<string, string> = { compact: "1rem", normal: "1.5rem", relaxed: "2rem" };

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

  const [branding, setBranding] = useState<Branding | null>(null);
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
    fetch("/api/branding").then((r) => r.json()).then(setBranding).catch(() => {});
  }, []);

  const validateToken = useCallback(async (value: string) => {
    if (!value.trim()) { setTokenValid(null); return; }
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
    } catch { setTokenValid(null); }
  }, []);

  useEffect(() => {
    if (prefillToken) { setToken(prefillToken); validateToken(prefillToken); }
  }, [prefillToken, validateToken]);

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

  const b = branding;
  const radius = RADIUS[b?.borderRadius ?? "md"] ?? "0.5rem";
  const shadow = SHADOW[b?.shadowIntensity ?? "md"];
  const gap = SPACING[b?.spacingDensity ?? "normal"] ?? "1.5rem";

  const panelStyle: React.CSSProperties = b ? {
    backgroundColor: b.panelColor,
    borderRadius: radius,
    boxShadow: shadow,
    color: b.textColor,
  } : {};

  const bgStyle: React.CSSProperties = b ? {
    backgroundColor: b.backgroundColor,
    backgroundImage: b.backgroundImageUrl ? `url(${b.backgroundImageUrl})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: b.textColor,
  } : {};

  const btnStyle: React.CSSProperties = b ? {
    backgroundColor: b.buttonStyle === "solid" ? b.primaryColor : "transparent",
    color: b.buttonStyle === "solid" ? "#ffffff" : b.primaryColor,
    border: b.buttonStyle === "outline" ? `2px solid ${b.primaryColor}` : "none",
    borderRadius: radius,
  } : {};

  const footerLinks = [
    b?.privacyPolicyUrl && { href: b.privacyPolicyUrl, label: "Privacy" },
    b?.termsUrl && { href: b.termsUrl, label: "Terms" },
    b?.imprintUrl && { href: b.imprintUrl, label: "Imprint" },
    b?.helpUrl && { href: b.helpUrl, label: "Help" },
  ].filter(Boolean) as { href: string; label: string }[];

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={bgStyle}>
        <Card className="w-full max-w-md" style={panelStyle}>
          <CardContent className="flex flex-col items-center text-center pt-8 pb-8" style={{ gap }}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold">Registration Successful</h2>
            <p className="opacity-70">
              {b?.successMessage || "Your account has been created."}
            </p>
            <p className="text-sm">
              Your user ID: <code className="font-mono text-sm font-semibold">{success.userId}</code>
            </p>
            {(b?.clientRecommendation || b?.postRegistrationText) && (
              <div className="rounded-lg border p-4 text-sm text-left w-full space-y-2 opacity-80">
                {b?.clientRecommendation && <p>{b.clientRecommendation}</p>}
                {b?.postRegistrationText && <p>{b.postRegistrationText}</p>}
                {success.homeserver && (
                  <p className="text-xs opacity-70">Homeserver: <code className="font-mono">{success.homeserver}</code></p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLayout = (v: string) => (b?.layoutPreset ?? "centered") === v;
  const showHero = b?.heroImageUrl && (isLayout("split") || isLayout("left-image"));

  return (
    <div className="flex min-h-screen" style={bgStyle}>
      {showHero && (
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.heroImageUrl!} alt="" className="max-h-[80vh] w-auto object-contain rounded-lg" />
        </div>
      )}
      <div className={`flex flex-1 flex-col items-center justify-center px-4 py-8 ${showHero ? "" : "w-full"}`}>
        {(isLayout("top-branding") || isLayout("centered")) && b?.logoUrl && (
          <div className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.logoUrl} alt="" className="h-12 w-auto" />
          </div>
        )}

        <Card className="w-full max-w-md" style={panelStyle}>
          <CardHeader className="text-center">
            {!b?.logoUrl && (
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${b?.primaryColor ?? "#6366f1"}20` }}>
                <UserPlus className="h-6 w-6" style={{ color: b?.primaryColor ?? "#6366f1" }} />
              </div>
            )}
            <CardTitle className="text-xl">{b?.welcomeHeadline || "Create Account"}</CardTitle>
            <CardDescription style={{ color: b ? `${b.textColor}99` : undefined }}>
              {b?.registrationText || "Register with an invitation code"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap }}>
              <div className="space-y-1.5">
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
                    style={{ borderRadius: radius }}
                  />
                  {tokenValid !== null && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${tokenValid ? "text-emerald-600" : "text-red-500"}`}>
                      {tokenValid ? "Valid" : "Invalid"}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
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
                  style={{ borderRadius: radius }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  autoComplete="name"
                  style={{ borderRadius: radius }}
                />
              </div>

              <div className="space-y-1.5">
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
                    style={{ borderRadius: radius }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                  style={{ borderRadius: radius }}
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading} style={btnStyle}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {(b?.footerText || b?.supportText || footerLinks.length > 0) && (
          <div className="mt-6 text-center text-xs space-y-1" style={{ color: b ? `${b.textColor}80` : undefined }}>
            {b?.footerText && <p>{b.footerText}</p>}
            {b?.supportText && <p>{b.supportText}</p>}
            {footerLinks.length > 0 && (
              <div className="flex items-center justify-center gap-3 pt-1">
                {footerLinks.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-100 opacity-70">
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
