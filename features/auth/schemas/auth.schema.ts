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

const BUSINESS_TYPES = ["private_limited", "public_limited", "llp", "partnership", "proprietorship", "opc"] as const;
const ACCOUNTING_SOFTWARE = ["journl", "none"] as const;
const optionalEmail = z.string().trim().email("Enter a valid email address").or(z.literal(""));
const optionalDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").or(z.literal(""));

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(150),
    email,
    password,
    confirmPassword: z.string(),
    legal_name: z.string().trim().min(2, "Enter your company's legal name").max(200),
    trade_name: z.string().trim().max(200),
    business_type: z.union([z.enum(BUSINESS_TYPES), z.literal("")]),
    date_of_establishment: optionalDate,
    gstin: optionalPattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"),
    pan: optionalPattern(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid 10-character PAN"),
    state: z.string().trim().max(60),
    address: z.string().trim().max(500),
    primary_contact_name: z.string().trim().max(150),
    primary_contact_email: optionalEmail,
    primary_contact_phone: z.string().trim().max(30),
    accounting_software: z.enum(ACCOUNTING_SOFTWARE),
  })
  .refine(passwordsMatch, mismatch);

export const registerAccountantSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(150),
    email,
    phone: z.string().trim().max(30),
    password,
    confirmPassword: z.string(),
    portal_role: z.enum(["bookkeeper", "finance_manager", "cfo"]),
  })
  .refine(passwordsMatch, mismatch);

export const setPasswordSchema = z.object({ password, confirmPassword: z.string() }).refine(passwordsMatch, mismatch);
export const forgotPasswordSchema = z.object({ email });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type RegisterAccountantValues = z.infer<typeof registerAccountantSchema>;
export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
