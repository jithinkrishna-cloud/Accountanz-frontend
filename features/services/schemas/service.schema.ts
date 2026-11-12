import { z } from "zod";
import { BILLING_CYCLES } from "../types/service.types";

// Mirrors backend service.validation.ts / package.validation.ts.
export const serviceFormSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z0-9-]{2,20}$/.test(v), "Use 2–20 letters, digits or dashes (e.g. BK-M)"),
  name: z.string().trim().min(2, "Enter a name").max(150),
  description: z.string().trim().max(500),
});

export const packageFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a package name").max(150),
  monthly_fee: z.coerce.number<string | number>({ message: "Enter the monthly fee" }).positive("Enter the monthly fee").max(9_999_999_999),
  billing_cycle: z.enum(BILLING_CYCLES),
  description: z.string().trim().max(500),
  scope_notes: z.string().trim().max(1000),
  is_active: z.boolean(),
  service_ids: z.array(z.number()).min(1, "Pick at least one service"),
});

export type ServiceFormValues = z.input<typeof serviceFormSchema>;
export type ServiceFormOutput = z.output<typeof serviceFormSchema>;
export type PackageFormValues = z.input<typeof packageFormSchema>;
export type PackageFormOutput = z.output<typeof packageFormSchema>;
