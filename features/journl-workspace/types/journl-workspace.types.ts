export type ColumnKind = "text" | "money" | "date" | "mono";

export interface JournlWorkspaceClient {
  client_id: number;
  client_name: string;
  connected: boolean;
  org_id: string | null;
  org_name: string | null;
  /** Set while Accountanz holds a JournL session for this client (the owner's sign-in, ~8h). */
  session_until: string | null;
  /** Module keys this person may read for this client today. */
  modules: string[];
}

export interface JournlWorkspace {
  modules: { key: string; tabs: { key: string; label: string }[] }[];
  clients: JournlWorkspaceClient[];
}

export interface JournlViewResult {
  view: string;
  module: string;
  label: string;
  uses_period: boolean;
  period: { from: string; to: string };
  columns: { key: string; label: string; kind?: ColumnKind }[];
  rows: Record<string, string | number | null>[];
  total: number;
  page: number;
  page_size: number;
  drill: { view: string; label: string; param: "ledgerId"; rowKey: string } | null;
}

export interface JournlViewQuery {
  from?: string;
  to?: string;
  page?: number;
  search?: string;
  ledger_id?: number;
}

export const JOURNL_MODULE_META: Record<string, { label: string; description: string }> = {
  sales: { label: "Sales", description: "Sales invoices, credit notes (returns) and receipts in the client's JournL." },
  purchases: { label: "Purchases", description: "Purchase bills, debit notes (returns) and payments in the client's JournL." },
  expenses: { label: "Expenses", description: "Expense bookings recorded in the client's JournL." },
  accounting: { label: "Accounting & Ledgers", description: "Journal vouchers, ledgers, ledger groups and chart of accounts. Open a ledger for its statement." },
  customers: { label: "Customers", description: "Customer ledgers (sundry debtors) with closing balances." },
  vendors: { label: "Vendors", description: "Vendor ledgers (sundry creditors) with closing balances." },
  banking: { label: "Banking", description: "Bank accounts in JournL. Open one for its transactions. JournL has no reconciliation view yet." },
  inventory: { label: "Inventory", description: "Stock items, stock journals, closing stock and stock statements in the client's JournL." },
  gst: { label: "GST & Tax", description: "GSTR-1 and GSTR-2B from JournL. GSTR-3B isn't available in JournL." },
  financial_reports: { label: "Financial Reports", description: "Trial balance, profit & loss, balance sheet, cash flow and ageing, live from JournL." },
};
