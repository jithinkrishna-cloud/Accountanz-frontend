import { z } from "zod";
import { VERIFICATION_STATUSES } from "../types/staff.types";

const role = z.enum(["bookkeeper", "finance_manager", "cfo", "ops_admin"]);

export const inviteFormSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name").max(150),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().max(30),
  portal_role: role,
});

export const editFormSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name").max(150),
  phone: z.string().trim().max(30),
  portal_role: role,
  status: z.enum(["active", "disabled"]),
  hourly_rate: z.string().trim().refine((v) => v === "" || (Number(v) >= 0 && Number(v) <= 100000), "Enter a rate between 0 and 1,00,000"),
  expertise: z.string().max(600),
  verification_status: z.enum(VERIFICATION_STATUSES),
  bank_account_name: z.string().trim().max(150),
  /** Left blank = keep the stored number (the full number is never sent to the browser). */
  bank_account_number: z.string().trim().refine((v) => v === "" || /^\d{9,18}$/.test(v), "Enter 9–18 digits"),
  bank_ifsc: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), "Enter a valid 11-character IFSC"),
});

export type InviteFormValues = z.infer<typeof inviteFormSchema>;
export type EditFormValues = z.input<typeof editFormSchema>;
export type EditFormOutput = z.output<typeof editFormSchema>;
