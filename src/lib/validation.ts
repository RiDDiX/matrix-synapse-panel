import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createTokenSchema = z.object({
  token: z
    .string()
    .regex(/^[A-Za-z0-9._~-]*$/, "Token may only contain A-Z, a-z, 0-9, ._~-")
    .max(64)
    .optional(),
  length: z.number().int().min(8).max(64).optional(),
  uses_allowed: z.number().int().min(0).nullable().optional(),
  expiry_time: z.number().int().positive().nullable().optional(),
  label: z.string().max(255).optional(),
  note: z.string().max(1000).optional(),
});

export const updateTokenSchema = z.object({
  uses_allowed: z.number().int().min(0).nullable().optional(),
  expiry_time: z.number().int().positive().nullable().optional(),
  label: z.string().max(255).optional(),
  note: z.string().max(1000).optional(),
});

export const registrationSchema = z
  .object({
    username: z
      .string()
      .min(1, "Username is required")
      .max(255)
      .regex(
        /^[a-z0-9._=-]+$/,
        "Username may only contain lowercase letters, numbers, and ._=-"
      ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    displayName: z.string().max(255).optional(),
    token: z.string().min(1, "Invitation code is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const tokenValidationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").nullable().optional();
const safeText = z.string().max(500).nullable().optional();
const safeUrl = z.string().url().max(2048).nullable().optional().or(z.literal("").transform(() => null));

export const brandingUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  appTitle: safeText,
  subtitle: safeText,
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  backgroundColor: hexColor,
  panelColor: hexColor,
  textColor: hexColor,
  buttonStyle: z.enum(["solid", "outline", "ghost"]).nullable().optional(),
  inputStyle: z.enum(["default", "filled", "underline"]).nullable().optional(),
  borderRadius: z.enum(["none", "sm", "md", "lg", "xl", "full"]).nullable().optional(),
  shadowIntensity: z.enum(["none", "sm", "md", "lg"]).nullable().optional(),
  spacingDensity: z.enum(["compact", "normal", "relaxed"]).nullable().optional(),
  layoutPreset: z.enum(["centered", "split", "left-image", "top-branding", "compact"]).nullable().optional(),
  welcomeHeadline: safeText,
  registrationText: z.string().max(1000).nullable().optional(),
  successMessage: z.string().max(1000).nullable().optional(),
  footerText: safeText,
  supportText: safeText,
  privacyPolicyUrl: safeUrl,
  imprintUrl: safeUrl,
  termsUrl: safeUrl,
  helpUrl: safeUrl,
  homeserverDisplayName: safeText,
  homeserverUrlText: safeText,
  clientRecommendation: safeText,
  postRegistrationText: z.string().max(2000).nullable().optional(),
});

export const brandingCreateSchema = z.object({
  name: z.string().min(1, "Profile name is required").max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type BrandingUpdateInput = z.infer<typeof brandingUpdateSchema>;
export type BrandingCreateInput = z.infer<typeof brandingCreateSchema>;
