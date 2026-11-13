export const REPORT_TYPES = ["profit_and_loss", "balance_sheet", "cash_flow", "gst_summary", "mis", "other"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  profit_and_loss: "Profit & Loss",
  balance_sheet: "Balance Sheet",
  cash_flow: "Cash Flow",
  gst_summary: "GST Summary",
  mis: "MIS Report",
  other: "Other report",
};

export interface Report {
  id: number;
  client_id: number;
  client_name: string;
  period: string;
  report_type: ReportType;
  file_name: string | null;
  has_file: boolean;
  summary: string | null;
  prepared_by_name: string | null;
  approved_by_name: string | null;
  published_date: string | null;
  created_at: string;
}
