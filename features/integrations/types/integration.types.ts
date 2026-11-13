export const PROVIDERS = ["journl"] as const;
export type Provider = (typeof PROVIDERS)[number];
export const PROVIDER_LABELS: Record<Provider, string> = { journl: "JournL" };
export const CONNECTION_STATUSES = ["pending", "connected", "error", "disconnected"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export interface Connection {
  id: number;
  client_id: number;
  client_name: string;
  provider: Provider;
  external_org_id: string | null;
  external_org_name: string | null;
  status: ConnectionStatus;
  last_health_check: string | null;
  last_error: string | null;
  verified_at: string | null;
  verified_by_name: string | null;
  verification_note: string | null;
  disconnected_at: string | null;
  authorized_at: string | null;
  authorized_by_name: string | null;
  /** Set while Accountanz holds a live JournL session (from the owner's sign-in) for reading data. */
  journl_session_until: string | null;
}

export interface JournlSection<T> {
  data: T | null;
  error: string | null;
}

/** Read-only view of a client's JournL books, fetched live from JournL. */
export interface JournlOverview {
  period: { from: string; to: string };
  session_expires_at: string;
  company: JournlSection<{ id: string; name: string; code: string | null; email: string | null; phone: string | null; gstin: string | null; address: string | null; state: string | null; books_start: string | null }>;
  branches: JournlSection<{ id: number; code: string | null; name: string }[]>;
  profit_loss: JournlSection<{ total_income: number; total_expense: number; net_profit: number; groups: { nature: string; name: string; amount: number }[] }>;
  trial_balance: JournlSection<{ id: number; name: string; debit: number; credit: number; ledgers: { name: string; debit: number; credit: number }[] }[]>;
  vouchers: JournlSection<{ total: number; rows: { id: number; number: string | null; date: string | null; type: string | null; account: string | null; description: string | null; amount: number }[] }>;
}
