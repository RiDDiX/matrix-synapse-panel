export interface BrandingDefaults {
  appTitle: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
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
  homeserverDisplayName: string;
  clientRecommendation: string;
  postRegistrationText: string;
}

export const BRANDING_DEFAULTS: BrandingDefaults = {
  appTitle: "RiDDiX Invite Portal",
  subtitle: "Create your Matrix account with an invitation code",
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  accentColor: "#f59e0b",
  backgroundColor: "#f8fafc",
  panelColor: "#ffffff",
  textColor: "#0f172a",
  buttonStyle: "solid",
  inputStyle: "default",
  borderRadius: "md",
  shadowIntensity: "md",
  spacingDensity: "normal",
  layoutPreset: "centered",
  welcomeHeadline: "Join the Network",
  registrationText: "Enter your invitation code and choose your credentials to get started.",
  successMessage: "Your account has been created. You can now sign in with any Matrix client.",
  footerText: "",
  supportText: "",
  homeserverDisplayName: "",
  clientRecommendation: "We recommend Element as your Matrix client.",
  postRegistrationText: "",
};

export const BORDER_RADIUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" },
  { value: "full", label: "Full" },
] as const;

export const SHADOW_OPTIONS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Subtle" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Strong" },
] as const;

export const SPACING_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
] as const;

export const BUTTON_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
] as const;

export const INPUT_STYLE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "filled", label: "Filled" },
  { value: "underline", label: "Underline" },
] as const;

export const LAYOUT_PRESETS = [
  { value: "centered", label: "Centered Card", description: "Form centered on page" },
  { value: "split", label: "Split Screen", description: "Image left, form right" },
  { value: "left-image", label: "Left Image", description: "Branding image with form" },
  { value: "top-branding", label: "Top Branding", description: "Logo and title above form" },
  { value: "compact", label: "Compact", description: "Minimal invite page" },
] as const;

export const ALLOWED_ASSET_TYPES: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "image/x-icon": [".ico"],
  "image/vnd.microsoft.icon": [".ico"],
};

export const MAX_ASSET_SIZE = 2 * 1024 * 1024; // 2 MB
export const MAX_FAVICON_SIZE = 256 * 1024; // 256 KB

export const ASSET_PURPOSES = ["logo", "favicon", "hero", "background"] as const;
export type AssetPurpose = (typeof ASSET_PURPOSES)[number];
