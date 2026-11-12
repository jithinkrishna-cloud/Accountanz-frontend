import { z } from "zod";
import { COMPLEXITIES } from "../types/onboarding.types";

// Mirrors backend/src/modules/onboarding/onboarding.validation.ts.
const optionalPattern = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || re.test(v), message);

export const prospectFormSchema = z.object({
  legal_name: z.string().trim().min(2, "Enter the legal name").max(200),
  trade_name: z.string().trim().max(200),
  gstin: optionalPattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"),
  pan: optionalPattern(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid 10-character PAN"),
  state: z.string().max(60),
  notes: z.string().trim().max(2000),
});

/** Optional numeric text input: "" → null, otherwise must match `re`. */
const optionalNumber = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || re.test(v), message)
    .transform((v) => (v === "" ? null : Number(v)));

export const assessmentFormSchema = z.object({
  monthly_transaction_volume: optionalNumber(/^\d{1,8}$/, "Enter a whole number"),
  complexity: z.union([z.enum(COMPLEXITIES), z.literal("")]).transform((v) => (v === "" ? null : v)),
  suggested_package_id: z.string().transform((v) => (v ? Number(v) : null)),
  suggested_monthly_fee: optionalNumber(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount with at most 2 decimals"),
  notes: z.string().trim().max(2000),
});

export type ProspectFormValues = z.input<typeof prospectFormSchema>;
export type ProspectFormOutput = z.output<typeof prospectFormSchema>;
export type AssessmentFormValues = z.input<typeof assessmentFormSchema>;
export type AssessmentFormOutput = z.output<typeof assessmentFormSchema>;
