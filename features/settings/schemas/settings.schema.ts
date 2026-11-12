import { z } from "zod";

const upper = (re: RegExp, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || re.test(v), message);

export const settingsFormSchema = z.object({
  company_name: z.string().trim().min(2, "Enter the company name").max(150),
  legal_name: z.string().trim().max(200),
  gstin: upper(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"),
  pan: upper(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid 10-character PAN"),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(500),
  gst_rate: z.coerce.number<string | number>({ message: "Enter the GST rate" }).min(0, "Can't be negative").max(28, "Can't exceed 28%"),
});

export type SettingsFormValues = z.input<typeof settingsFormSchema>;
export type SettingsFormOutput = z.output<typeof settingsFormSchema>;
