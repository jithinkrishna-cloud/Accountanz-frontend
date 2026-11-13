export const CLOSING_STATUSES = ["open", "ready", "closed"] as const;
export type ClosingStatus = (typeof CLOSING_STATUSES)[number];

export interface ClosingCell {
  status: ClosingStatus;
  approved: number;
  total: number;
  closed_by_email: string | null;
  closed_at: string | null;
  /** Why it was marked ready with checklist items open; kept once closed. */
  ready_override: string | null;
}

export interface ClosingRow {
  client_id: number;
  client_name: string;
  client_status: string;
  cells: Record<string, ClosingCell>;
}

export interface ClosingGrid {
  periods: string[];
  rows: ClosingRow[];
}
