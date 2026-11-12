import { z } from "zod";

// Mirrors backend/src/modules/auth/auth.validation.ts so users see errors before submitting.
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

const email = z.email("Enter a valid email address");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

const passwordsMatch = (v: { password: string; confirmPassword: string }) => v.password === v.confirmPassword;
const mismatch = { path: ["confirmPassword"], message: "Passwords don't match" };

// Mirrors backend gstinSchema/panSchema: optional, upper-cased, validated only when filled in.
const optionalPattern = (re: RegExp, message: string) =>
  z.string().trim().transform((v) => v.toUpperCase()).refine((v) => v === "" || re.test(v), message);

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(150),
    email,
    password,
    confirmPassword: z.string(),
    legal_name: z.string().trim().min(2, "Enter your company's legal name").max(200),
    trade_name: z.string().trim().max(200),
    gstin: optionalPattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"),
    pan: optionalPattern(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid 10-character PAN"),
    state: z.string().trim().max(60),
  })
  .refine(passwordsMatch, mismatch);
export const setPasswordSchema = z.object({ password, confirmPassword: z.string() }).refine(passwordsMatch, mismatch);
export const forgotPasswordSchema = z.object({ email });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
