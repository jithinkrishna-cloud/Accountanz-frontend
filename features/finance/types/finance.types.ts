export const INVOICE_STATUSES = ["draft", "issued", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface Invoice {
  id: number;
  invoice_number: string;
  engagement_id: number;
  client_id: number;
  client_name: string;
  period: string;
  amount: number;
  gst_amount: number;
  total: number;
  due_date: string;
  status: InvoiceStatus;
  paid_amount: number;
}

export interface InvoiceSummary {
  billed: number;
  collected: number;
  outstanding: number;
}

export const PAYMENT_METHODS = ["bank_transfer", "upi", "cheque", "cash", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
  other: "Other",
};

export interface Payment {
  id: number;
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  amount: number;
  paid_date: string;
  method: PaymentMethod;
  reference: string | null;
}

export interface OpenInvoice {
  id: number;
  invoice_number: string;
  client_name: string;
  total: number;
  balance: number;
}

export type PayoutStatus = "draft" | "approved" | "paid";

export interface Payout {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  period: string;
  minutes: number;
  hourly_rate: number;
  amount: number;
  status: PayoutStatus;
  paid_date: string | null;
  reference: string | null;
  bank_account_last4: string | null;
  verification_status: "pending" | "verified" | "rejected" | null;
}

export interface PayoutSummary {
  payable: number;
  paid: number;
  logged_minutes: number;
}

export interface PayoutRunResult {
  period: string;
  created: number;
  refreshed: number;
  payable: number;
  skipped_unverified: string[];
}
