export interface AppSettings {
  company_name: string;
  legal_name: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  gst_rate: number;
  remind_document_due: boolean;
  remind_task_overdue: boolean;
  remind_invoice_overdue: boolean;
  updated_at: string;
}
