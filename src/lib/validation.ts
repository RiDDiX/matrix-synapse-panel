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

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
