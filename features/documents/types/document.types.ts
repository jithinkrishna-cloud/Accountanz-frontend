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
  /** Document Centre folder; null = top level. */
  folder_id: number | null;
  /** Where it is filed in the Document Centre ("Bank / 2026"); null = top level. */
  folder_path?: string | null;
  request_id: number | null;
  created_at: string;
}

/** A Document Centre folder of one client, as staff see it. Any depth: parent_id is another folder (null = top level). */
export interface StaffFolder {
  id: number;
  client_id: number;
  parent_id: number | null;
  name: string;
  /** 1 = made by the accounting team (shared with the client and the team); 0 = the client's own folder. */
  staff_folder: 0 | 1;
  created_at: string;
  /** For client folders: the accountants the client shared it with directly. */
  shared_with: { user_id: number; full_name: string }[];
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
  task_id: number | null;
  task_title: string | null;
  /** The folder files sent for this request land in ("Nov 2026 / Bank reconciliation / Bank statements"). */
  folder_id: number | null;
  created_at: string;
}
