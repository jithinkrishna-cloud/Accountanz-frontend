import { z } from "zod";
import { PAYMENT_METHODS } from "../types/finance.types";

// Mirrors backend invoices/payments validation.
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month");

export const invoiceFormSchema = z.object({
  engagement_id: z.string().min(1, "Pick an engagement"),
  period,
});

export const paymentFormSchema = z.object({
  invoice_id: z.string().min(1, "Pick an invoice"),
  amount: z.coerce.number<string | number>({ message: "Enter the amount received" }).positive("Enter the amount received").multipleOf(0.01, "At most 2 decimals"),
  paid_date: z.iso.date("Pick the payment date"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(100),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type PaymentFormValues = z.input<typeof paymentFormSchema>;
export type PaymentFormOutput = z.output<typeof paymentFormSchema>;
