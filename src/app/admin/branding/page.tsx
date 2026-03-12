"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Paintbrush, Type, Layout, FileText, Link2, Globe, Upload, Trash2,
  Save, Send, RotateCcw, Plus, Image as ImageIcon, Palette,
} from "lucide-react";
import {
  BORDER_RADIUS_OPTIONS, SHADOW_OPTIONS, SPACING_OPTIONS,
  BUTTON_STYLE_OPTIONS, INPUT_STYLE_OPTIONS, LAYOUT_PRESETS,
  ASSET_PURPOSES,
} from "@/lib/branding-defaults";

interface ProfileData {
  id: string;
  name: string;
  isActive: boolean;
  isDraft: boolean;
  version: number;
  appTitle: string | null;
  subtitle: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  panelColor: string | null;
  textColor: string | null;
  buttonStyle: string | null;
  inputStyle: string | null;
  borderRadius: string | null;
  shadowIntensity: string | null;
  spacingDensity: string | null;
  layoutPreset: string | null;
  welcomeHeadline: string | null;
  registrationText: string | null;
  successMessage: string | null;
  footerText: string | null;
  supportText: string | null;
  privacyPolicyUrl: string | null;
  imprintUrl: string | null;
  termsUrl: string | null;
  helpUrl: string | null;
  homeserverDisplayName: string | null;
  homeserverUrlText: string | null;
  clientRecommendation: string | null;
  postRegistrationText: string | null;
  publishedAt: string | null;
  assets: AssetData[];
}

interface AssetData {
  id: string;
  purpose: string;
  filename: string;
  mimeType: string;
  size: number;
}

type Tab = "identity" | "theme" | "layout" | "content" | "links" | "presentation";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "identity", label: "Identity", icon: <Type className="h-4 w-4" /> },
  { key: "theme", label: "Theme", icon: <Palette className="h-4 w-4" /> },
  { key: "layout", label: "Layout", icon: <Layout className="h-4 w-4" /> },
  { key: "content", label: "Content", icon: <FileText className="h-4 w-4" /> },
  { key: "links", label: "Links", icon: <Link2 className="h-4 w-4" /> },
  { key: "presentation", label: "Presentation", icon: <Globe className="h-4 w-4" /> },
];

export default function BrandingPage() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [selected, setSelected] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("identity");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/branding");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles);
        if (data.profiles.length > 0) {
          const active = data.profiles.find((p: ProfileData) => p.isActive);
          setSelected(active ?? data.profiles[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  async function createProfile() {
    const res = await fetch("/api/admin/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Profile ${profiles.length + 1}` }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfiles((prev) => [data.profile, ...prev]);
      setSelected(data.profile);
      toast({ title: "Profile created" });
    }
  }

  async function saveDraft() {
    if (!selected) return;
    setSaving(true);
    try {
      const { id, assets, isActive, isDraft, version, publishedAt, ...fields } = selected;
      void isActive; void isDraft; void version; void publishedAt; void assets;
      const res = await fetch(`/api/admin/branding/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const data = await res.json();
        setSelected(data.profile);
        setProfiles((prev) => prev.map((p) => (p.id === id ? data.profile : p)));
        toast({ title: "Draft saved" });
      } else {
        const err = await res.json();
        toast({ title: "Save failed", description: err.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!selected) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/branding/${selected.id}/publish`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSelected(data.profile);
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === data.profile.id ? data.profile : { ...p, isActive: false }
          )
        );
        toast({ title: "Branding published" });
      } else {
        const err = await res.json();
        toast({ title: "Publish failed", description: err.error, variant: "destructive" });
      }
    } finally {
      setPublishing(false);
    }
  }

  async function resetToDefaults() {
    if (!selected) return;
    const res = await fetch(`/api/admin/branding/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (res.ok) {
      const data = await res.json();
      setSelected(data.profile);
      setProfiles((prev) => prev.map((p) => (p.id === data.profile.id ? data.profile : p)));
      toast({ title: "Reset to defaults" });
    }
  }

  function updateField(field: string, value: string | null) {
    if (!selected) return;
    setSelected({ ...selected, [field]: value || null });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Paintbrush className="h-6 w-6" /> Branding
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customize the public registration experience
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profiles.length === 0 && (
            <Button onClick={createProfile} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Create Profile
            </Button>
          )}
          {selected && (
            <>
              <Badge variant={selected.isActive ? "default" : "secondary"}>
                {selected.isActive ? "Active" : "Draft"} v{selected.version}
              </Badge>
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
              <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button size="sm" onClick={publish} disabled={publishing}>
                <Send className="h-4 w-4 mr-1" /> {publishing ? "Publishing..." : "Publish"}
              </Button>
            </>
          )}
        </div>
      </div>

      {!selected && profiles.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Paintbrush className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No branding profile yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a branding profile to customize the public registration page.
            </p>
            <Button onClick={createProfile}>
              <Plus className="h-4 w-4 mr-1" /> Create Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {selected && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex gap-1 overflow-x-auto border-b pb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <Card>
              <CardContent className="pt-6 space-y-5">
                {activeTab === "identity" && (
                  <IdentityTab profile={selected} onChange={updateField} toast={toast} onAssetChange={(assets) => setSelected({ ...selected, assets })} />
                )}
                {activeTab === "theme" && (
                  <ThemeTab profile={selected} onChange={updateField} />
                )}
                {activeTab === "layout" && (
                  <LayoutTab profile={selected} onChange={updateField} />
                )}
                {activeTab === "content" && (
                  <ContentTab profile={selected} onChange={updateField} />
                )}
                {activeTab === "links" && (
                  <LinksTab profile={selected} onChange={updateField} />
                )}
                {activeTab === "presentation" && (
                  <PresentationTab profile={selected} onChange={updateField} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-1">
            <BrandingPreview profile={selected} />
          </div>
        </div>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({
  label, value, onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <FieldGroup label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border cursor-pointer"
        />
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="#000000"
          className="font-mono text-sm"
        />
      </div>
    </FieldGroup>
  );
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string;
  value: string | null;
  options: readonly { value: string; label: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <FieldGroup label={label}>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Default</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FieldGroup>
  );
}

interface TabProps {
  profile: ProfileData;
  onChange: (field: string, value: string | null) => void;
}

function AssetUpload({
  profile, purpose, label, toast, onAssetChange,
}: {
  profile: ProfileData;
  purpose: string;
  label: string;
  toast: ReturnType<typeof useToast>["toast"];
  onAssetChange: (assets: AssetData[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const asset = profile.assets.find((a) => a.purpose === purpose);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("profileId", profile.id);
      form.append("purpose", purpose);
      const res = await fetch("/api/admin/branding/assets", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        const newAssets = [...profile.assets.filter((a) => a.purpose !== purpose), data.asset];
        onAssetChange(newAssets);
        toast({ title: `${label} uploaded` });
      } else {
        const err = await res.json();
        toast({ title: "Upload failed", description: err.error, variant: "destructive" });
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!asset) return;
    const res = await fetch(`/api/admin/branding/assets/${asset.id}`, { method: "DELETE" });
    if (res.ok) {
      onAssetChange(profile.assets.filter((a) => a.id !== asset.id));
      toast({ title: `${label} removed` });
    }
  }

  return (
    <FieldGroup label={label}>
      <div className="flex items-center gap-3">
        {asset ? (
          <div className="flex items-center gap-3 flex-1">
            <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/branding/assets/${asset.id}`}
                alt={purpose}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-sm text-muted-foreground truncate flex-1">
              {(asset.size / 1024).toFixed(1)} KB
            </span>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        )}
      </div>
    </FieldGroup>
  );
}

function IdentityTab({
  profile, onChange, toast, onAssetChange,
}: TabProps & { toast: ReturnType<typeof useToast>["toast"]; onAssetChange: (assets: AssetData[]) => void }) {
  return (
    <>
      <FieldGroup label="Application Title">
        <Input
          value={profile.appTitle ?? ""}
          onChange={(e) => onChange("appTitle", e.target.value)}
          placeholder="RiDDiX Invite Portal"
        />
      </FieldGroup>
      <FieldGroup label="Subtitle">
        <Input
          value={profile.subtitle ?? ""}
          onChange={(e) => onChange("subtitle", e.target.value)}
          placeholder="Create your Matrix account with an invitation code"
        />
      </FieldGroup>
      {(ASSET_PURPOSES as readonly string[]).map((purpose) => (
        <AssetUpload
          key={purpose}
          profile={profile}
          purpose={purpose}
          label={purpose.charAt(0).toUpperCase() + purpose.slice(1)}
          toast={toast}
          onAssetChange={onAssetChange}
        />
      ))}
    </>
  );
}

function ThemeTab({ profile, onChange }: TabProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ColorField label="Primary Color" value={profile.primaryColor} onChange={(v) => onChange("primaryColor", v)} />
        <ColorField label="Secondary Color" value={profile.secondaryColor} onChange={(v) => onChange("secondaryColor", v)} />
        <ColorField label="Accent Color" value={profile.accentColor} onChange={(v) => onChange("accentColor", v)} />
        <ColorField label="Background Color" value={profile.backgroundColor} onChange={(v) => onChange("backgroundColor", v)} />
        <ColorField label="Panel Color" value={profile.panelColor} onChange={(v) => onChange("panelColor", v)} />
        <ColorField label="Text Color" value={profile.textColor} onChange={(v) => onChange("textColor", v)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
        <SelectField label="Button Style" value={profile.buttonStyle} options={BUTTON_STYLE_OPTIONS} onChange={(v) => onChange("buttonStyle", v)} />
        <SelectField label="Input Style" value={profile.inputStyle} options={INPUT_STYLE_OPTIONS} onChange={(v) => onChange("inputStyle", v)} />
        <SelectField label="Border Radius" value={profile.borderRadius} options={BORDER_RADIUS_OPTIONS} onChange={(v) => onChange("borderRadius", v)} />
        <SelectField label="Shadow Intensity" value={profile.shadowIntensity} options={SHADOW_OPTIONS} onChange={(v) => onChange("shadowIntensity", v)} />
        <SelectField label="Spacing Density" value={profile.spacingDensity} options={SPACING_OPTIONS} onChange={(v) => onChange("spacingDensity", v)} />
      </div>
    </>
  );
}

function LayoutTab({ profile, onChange }: TabProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {LAYOUT_PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onChange("layoutPreset", preset.value)}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            (profile.layoutPreset ?? "centered") === preset.value
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-primary/40"
          }`}
        >
          <Layout className="h-8 w-8 mb-2 text-muted-foreground" />
          <div className="font-medium text-sm">{preset.label}</div>
          <div className="text-xs text-muted-foreground">{preset.description}</div>
        </button>
      ))}
    </div>
  );
}

function ContentTab({ profile, onChange }: TabProps) {
  return (
    <>
      <FieldGroup label="Welcome Headline">
        <Input
          value={profile.welcomeHeadline ?? ""}
          onChange={(e) => onChange("welcomeHeadline", e.target.value)}
          placeholder="Join the Network"
        />
      </FieldGroup>
      <FieldGroup label="Registration Description">
        <Textarea
          value={profile.registrationText ?? ""}
          onChange={(e) => onChange("registrationText", e.target.value)}
          placeholder="Enter your invitation code..."
          rows={3}
        />
      </FieldGroup>
      <FieldGroup label="Success Message">
        <Textarea
          value={profile.successMessage ?? ""}
          onChange={(e) => onChange("successMessage", e.target.value)}
          placeholder="Your account has been created..."
          rows={3}
        />
      </FieldGroup>
      <FieldGroup label="Footer Text">
        <Input
          value={profile.footerText ?? ""}
          onChange={(e) => onChange("footerText", e.target.value)}
          placeholder="Optional footer text"
        />
      </FieldGroup>
      <FieldGroup label="Support / Contact Text">
        <Input
          value={profile.supportText ?? ""}
          onChange={(e) => onChange("supportText", e.target.value)}
          placeholder="Need help? Contact support@example.com"
        />
      </FieldGroup>
    </>
  );
}

function LinksTab({ profile, onChange }: TabProps) {
  return (
    <>
      <FieldGroup label="Privacy Policy URL">
        <Input
          type="url"
          value={profile.privacyPolicyUrl ?? ""}
          onChange={(e) => onChange("privacyPolicyUrl", e.target.value)}
          placeholder="https://example.com/privacy"
        />
      </FieldGroup>
      <FieldGroup label="Imprint / Legal Notice URL">
        <Input
          type="url"
          value={profile.imprintUrl ?? ""}
          onChange={(e) => onChange("imprintUrl", e.target.value)}
          placeholder="https://example.com/imprint"
        />
      </FieldGroup>
      <FieldGroup label="Terms of Service URL">
        <Input
          type="url"
          value={profile.termsUrl ?? ""}
          onChange={(e) => onChange("termsUrl", e.target.value)}
          placeholder="https://example.com/terms"
        />
      </FieldGroup>
      <FieldGroup label="Help Page URL">
        <Input
          type="url"
          value={profile.helpUrl ?? ""}
          onChange={(e) => onChange("helpUrl", e.target.value)}
          placeholder="https://example.com/help"
        />
      </FieldGroup>
    </>
  );
}

function PresentationTab({ profile, onChange }: TabProps) {
  return (
    <>
      <FieldGroup label="Homeserver Display Name">
        <Input
          value={profile.homeserverDisplayName ?? ""}
          onChange={(e) => onChange("homeserverDisplayName", e.target.value)}
          placeholder="My Matrix Server"
        />
      </FieldGroup>
      <FieldGroup label="Public Homeserver URL Text">
        <Input
          value={profile.homeserverUrlText ?? ""}
          onChange={(e) => onChange("homeserverUrlText", e.target.value)}
          placeholder="matrix.example.com"
        />
      </FieldGroup>
      <FieldGroup label="Client Recommendation">
        <Input
          value={profile.clientRecommendation ?? ""}
          onChange={(e) => onChange("clientRecommendation", e.target.value)}
          placeholder="We recommend Element as your Matrix client."
        />
      </FieldGroup>
      <FieldGroup label="Post-Registration Instructions">
        <Textarea
          value={profile.postRegistrationText ?? ""}
          onChange={(e) => onChange("postRegistrationText", e.target.value)}
          placeholder="After creating your account, download Element..."
          rows={4}
        />
      </FieldGroup>
    </>
  );
}

const RADIUS_MAP: Record<string, string> = {
  none: "0", sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", full: "9999px",
};

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px rgba(0,0,0,0.07)",
  lg: "0 10px 15px rgba(0,0,0,0.1)",
};

function BrandingPreview({ profile }: { profile: ProfileData }) {
  const d = {
    appTitle: profile.appTitle || "RiDDiX Invite Portal",
    subtitle: profile.subtitle || "Create your account",
    welcomeHeadline: profile.welcomeHeadline || "Join the Network",
    registrationText: profile.registrationText || "Enter your invitation code to get started.",
    primaryColor: profile.primaryColor || "#6366f1",
    backgroundColor: profile.backgroundColor || "#f8fafc",
    panelColor: profile.panelColor || "#ffffff",
    textColor: profile.textColor || "#0f172a",
    borderRadius: RADIUS_MAP[profile.borderRadius ?? "md"] ?? "0.5rem",
    shadow: SHADOW_MAP[profile.shadowIntensity ?? "md"] ?? "0 4px 6px rgba(0,0,0,0.07)",
    footerText: profile.footerText || "",
    logoAsset: profile.assets.find((a) => a.purpose === "logo"),
  };

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: d.backgroundColor }}
        >
          <div className="p-4 flex flex-col items-center" style={{ minHeight: "320px" }}>
            {d.logoAsset && (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/branding/assets/${d.logoAsset.id}`}
                  alt="Logo"
                  className="h-10 w-auto"
                />
              </div>
            )}
            <div className="text-xs font-bold mb-0.5" style={{ color: d.textColor }}>
              {d.appTitle}
            </div>
            <div className="text-[10px] mb-3" style={{ color: d.textColor, opacity: 0.6 }}>
              {d.subtitle}
            </div>
            <div
              className="w-full max-w-[200px] p-3 space-y-2"
              style={{
                backgroundColor: d.panelColor,
                borderRadius: d.borderRadius,
                boxShadow: d.shadow,
              }}
            >
              <div className="text-[10px] font-semibold" style={{ color: d.textColor }}>
                {d.welcomeHeadline}
              </div>
              <div className="text-[8px]" style={{ color: d.textColor, opacity: 0.6 }}>
                {d.registrationText}
              </div>
              <div className="space-y-1.5">
                <div className="h-5 rounded border bg-gray-50" style={{ borderRadius: d.borderRadius }} />
                <div className="h-5 rounded border bg-gray-50" style={{ borderRadius: d.borderRadius }} />
                <div className="h-5 rounded border bg-gray-50" style={{ borderRadius: d.borderRadius }} />
                <div
                  className="h-5 rounded flex items-center justify-center text-white text-[8px] font-medium"
                  style={{ backgroundColor: d.primaryColor, borderRadius: d.borderRadius }}
                >
                  Register
                </div>
              </div>
            </div>
            {d.footerText && (
              <div className="text-[8px] mt-3" style={{ color: d.textColor, opacity: 0.4 }}>
                {d.footerText}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
