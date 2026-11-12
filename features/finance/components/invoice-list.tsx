"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientOptions } from "@/features/clients/hooks/use-client-options";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatINR, formatPeriod, humanize } from "@/lib/format";
import { useInvoices, useSetInvoiceStatus } from "../hooks/use-finance";
import { INVOICE_STATUSES, type Invoice, type InvoiceStatus } from "../types/finance.types";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { MoneyStats } from "./money-stats";

const STATUS_OPTIONS = INVOICE_STATUSES.map((s) => ({ value: s, label: humanize(s) }));

function StatusCell({ invoice }: { invoice: Invoice }) {
  const setStatus = useSetInvoiceStatus();
  const change = async (status: string) => {
    try {
      await setStatus.mutateAsync({ id: invoice.id, status: status as InvoiceStatus });
      toast.success(`${invoice.invoice_number} marked ${humanize(status).toLowerCase()}`);
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Select value={invoice.status} onValueChange={change} disabled={setStatus.isPending}>
      <SelectTrigger size="sm" className="w-32" aria-label={`Status of ${invoice.invoice_number}`}><SelectValue /></SelectTrigger>
      <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const columns: Column<Invoice>[] = [
  { key: "number", header: "Invoice", cell: (i) => <span className="font-mono text-xs font-medium">{i.invoice_number}</span> },
  { key: "client", header: "Client", cell: (i) => i.client_name },
  { key: "period", header: "Period", hideOnMobile: true, cell: (i) => formatPeriod(i.period) },
  { key: "amount", header: "Amount", hideOnMobile: true, className: "text-right", cell: (i) => <span className="tabular-nums">{formatINR(i.amount, true)}</span> },
  { key: "gst", header: "GST", hideOnMobile: true, className: "text-right", cell: (i) => <span className="tabular-nums">{formatINR(i.gst_amount, true)}</span> },
  { key: "total", header: "Total", className: "text-right", cell: (i) => <span className="font-medium tabular-nums">{formatINR(i.total, true)}</span> },
  { key: "due", header: "Due", hideOnMobile: true, cell: (i) => formatDate(i.due_date) },
  { key: "status", header: "Status", cell: (i) => <StatusCell invoice={i} /> },
];

export function InvoiceList() {
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState<string>();
  const [status, setStatus] = useState<InvoiceStatus>();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const clients = useClientOptions();
  const query = useInvoices({ q, client_id: clientId, status, page });
  const s = query.data?.summary;

  return (
    <>
      <PageHeader
        title="Service Invoices"
        description="Raised from active engagements at the package fee plus GST."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New invoice</Button>}
      />
      <MoneyStats
        loading={!s}
        stats={[
          { label: "Billed", value: formatINR(s?.billed, true) },
          { label: "Collected", value: formatINR(s?.collected, true) },
          { label: "Outstanding", value: formatINR(s?.outstanding, true) },
        ]}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search invoice number" />
          <FilterSelect allLabel="All clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1); }} options={clients.data ?? []} />
          <FilterSelect allLabel="All statuses" value={status} onChange={(v) => { setStatus(v as InvoiceStatus | undefined); setPage(1); }} options={STATUS_OPTIONS} />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(i) => i.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: q || clientId || status ? "No invoices match" : "No invoices yet", description: "Invoices are raised from active engagements." }}
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
      <InvoiceFormDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
