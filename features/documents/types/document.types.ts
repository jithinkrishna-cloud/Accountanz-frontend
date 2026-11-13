export const DOCUMENT_CATEGORIES = ["sales_invoice", "purchase_bill", "receipt", "bank_statement", "gst", "other"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export const DOCUMENT_STATUSES = ["new", "reviewed", "rejected"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  sales_invoice: "Sales invoice",
  purchase_bill: "Purchase bill",
  receipt: "Receipt",
  bank_statement: "Bank statement",
  gst: "GST",
  other: "Other",
};

export const REQUEST_STATUSES = ["open", "fulfilled", "cancelled"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface ClientDocument {
  id: number;
  client_id: number;
  client_name: string;
  category: DocumentCategory;
  period: string | null;
  file_name: string;
  mime_type: string | null;
  status: DocumentStatus;
  uploaded_by_email: string | null;
  uploaded_by_name: string | null;
  from_client: 0 | 1;
  created_at: string;
}

export interface DocumentRequest {
  id: number;
  client_id: number;
  client_name: string;
  description: string;
  requested_by_email: string | null;
  due_date: string | null;
  period: string | null;
  status: RequestStatus;
  created_at: string;
}
