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

export const installIntegrationSchema = z.object({
  catalogId: z.string().min(1).max(100),
});

export const integrationConfigSchema = z.object({
  config: z.record(z.unknown()),
});

export const integrationSecretSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(10000),
});

export const createBotSchema = z.object({
  templateId: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  localpart: z
    .string()
    .regex(/^[a-z0-9._=-]+$/, "Localpart may only contain lowercase letters, numbers, and ._=-")
    .max(64)
    .optional(),
  avatarUrl: safeUrl.optional(),
  config: z.record(z.unknown()).optional(),
});

export const updateBotSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  avatarUrl: safeUrl.optional(),
  config: z.record(z.unknown()).optional(),
});

export const botRoomAssignmentSchema = z.object({
  roomId: z.string().min(1).max(500).regex(/^!/, "Must be a valid Matrix room ID starting with !"),
  roomAlias: z.string().max(500).optional(),
  config: z.record(z.unknown()).optional(),
});

export const botFeatureSchema = z.object({
  featureKey: z.string().min(1).max(100),
  enabled: z.boolean(),
  scope: z.enum(["global", "room"]).default("global"),
  scopeId: z.string().max(500).optional(),
  config: z.record(z.unknown()).optional(),
});

export const createServerSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  serverName: z.string().min(1).max(500),
  internalUrl: z.string().url().max(2048),
  publicUrl: z.string().url().max(2048),
  adminToken: z.string().min(1).max(10000),
  notes: z.string().max(5000).optional(),
  publicDomain: z.string().max(500).optional(),
  routePrefix: z.string().max(100).optional(),
  brandingProfileId: z.string().max(100).optional(),
});

export const updateServerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens").optional(),
  serverName: z.string().min(1).max(500).optional(),
  internalUrl: z.string().url().max(2048).optional(),
  publicUrl: z.string().url().max(2048).optional(),
  notes: z.string().max(5000).nullable().optional(),
  publicDomain: z.string().max(500).nullable().optional(),
  routePrefix: z.string().max(100).nullable().optional(),
  brandingProfileId: z.string().max(100).nullable().optional(),
  registrationMode: z.string().max(100).nullable().optional(),
  managedMode: z.string().max(100).nullable().optional(),
});

export const rotateServerTokenSchema = z.object({
  adminToken: z.string().min(1).max(10000),
});

export const createUserSchema = z.object({
  localpart: z
    .string()
    .min(1, "Username is required")
    .max(64)
    .regex(/^[a-z0-9._=\-/]+$/, "Username may only contain lowercase letters, numbers, and ._=-/"),
  password: z.string().min(8, "Password must be at least 8 characters").max(512),
  displayname: z.string().max(256).optional(),
  admin: z.boolean().optional(),
});

export const modifyUserSchema = z.object({
  password: z.string().min(8).max(512).optional(),
  displayname: z.string().max(256).optional(),
  admin: z.boolean().optional(),
  locked: z.boolean().optional(),
  deactivated: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type BrandingUpdateInput = z.infer<typeof brandingUpdateSchema>;
export type BrandingCreateInput = z.infer<typeof brandingCreateSchema>;
export type InstallIntegrationInput = z.infer<typeof installIntegrationSchema>;
export type IntegrationConfigInput = z.infer<typeof integrationConfigSchema>;
export type IntegrationSecretInput = z.infer<typeof integrationSecretSchema>;
export type CreateBotInput = z.infer<typeof createBotSchema>;
export type UpdateBotInput = z.infer<typeof updateBotSchema>;
export type BotRoomAssignmentInput = z.infer<typeof botRoomAssignmentSchema>;
export type BotFeatureInput = z.infer<typeof botFeatureSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ModifyUserInput = z.infer<typeof modifyUserSchema>;
