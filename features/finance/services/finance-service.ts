import { api, type Paged } from "@/lib/api-client";
import type { PaymentFormOutput } from "../schemas/finance.schema";
import type { Invoice, InvoiceStatus, InvoiceSummary, OpenInvoice, Payment, PaymentMethod, Payout, PayoutRunResult, PayoutSummary } from "../types/finance.types";

export const invoiceService = {
  list: (params: { q?: string; client_id?: string; status?: InvoiceStatus; page?: number }) =>
    api<Paged<Invoice> & { summary: InvoiceSummary }>("/admin/invoices", { query: { ...params } }),
  create: (engagementId: number, period: string) => api<Invoice>("/admin/invoices", { method: "POST", body: { engagement_id: engagementId, period } }),
  setStatus: (id: number, status: InvoiceStatus) => api<Invoice>(`/admin/invoices/${id}/status`, { method: "PATCH", body: { status } }),
};

export const paymentService = {
  list: (params: { q?: string; method?: PaymentMethod; page?: number }) => api<Paged<Payment>>("/admin/payments", { query: { ...params } }),
  openInvoices: () => api<{ items: OpenInvoice[] }>("/admin/payments/open-invoices").then((r) => r.items),
  record: (v: PaymentFormOutput) =>
    api<{ id: number; invoice_paid: boolean }>("/admin/payments", {
      method: "POST",
      body: { ...v, invoice_id: Number(v.invoice_id), reference: v.reference || null },
    }),
};

export const payoutService = {
  list: (period: string) => api<{ items: Payout[]; summary: PayoutSummary }>("/admin/payouts", { query: { period } }),
  generate: (period: string) => api<PayoutRunResult>("/admin/payouts/generate", { method: "POST", body: { period } }),
  approve: (id: number) => api<void>(`/admin/payouts/${id}/approve`, { method: "POST" }),
  markPaid: (id: number, reference: string | null) => api<void>(`/admin/payouts/${id}/mark-paid`, { method: "POST", body: { reference } }),
};
