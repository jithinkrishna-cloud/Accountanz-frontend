import { z } from "zod";
import { ACCOUNTING_SOFTWARE, CLIENT_STATUSES } from "../types/client.types";

// Mirrors backend/src/modules/clients/client.validation.ts.
const optionalPattern = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || re.test(v), message);

export const clientFormSchema = z.object({
  legal_name: z.string().trim().min(2, "Enter the legal name").max(200),
  trade_name: z.string().trim().max(200),
  gstin: optionalPattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"),
  pan: optionalPattern(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid 10-character PAN"),
  state: z.string().max(60),
  address: z.string().trim().max(500),
  status: z.enum(CLIENT_STATUSES),
  accounting_software: z.enum(ACCOUNTING_SOFTWARE),
});

export type ClientFormValues = z.input<typeof clientFormSchema>;
export type ClientFormOutput = z.output<typeof clientFormSchema>;
