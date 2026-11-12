"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/format";
import { usePayments } from "../hooks/use-finance";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type Payment, type PaymentMethod } from "../types/finance.types";
import { PaymentFormDialog } from "./payment-form-dialog";

const columns: Column<Payment>[] = [
  { key: "invoice", header: "Invoice", cell: (p) => <span className="font-mono text-xs font-medium">{p.invoice_number}</span> },
  { key: "client", header: "Client", cell: (p) => p.client_name },
  { key: "amount", header: "Amount", className: "text-right", cell: (p) => <span className="font-medium tabular-nums">{formatINR(p.amount, true)}</span> },
  { key: "paid", header: "Paid on", hideOnMobile: true, cell: (p) => formatDate(p.paid_date) },
  { key: "method", header: "Method", hideOnMobile: true, cell: (p) => PAYMENT_METHOD_LABELS[p.method] },
  { key: "reference", header: "Reference", hideOnMobile: true, cell: (p) => <span className="text-muted-foreground">{p.reference ?? "—"}</span> },
];

export function PaymentList() {
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<PaymentMethod>();
  const [page, setPage] = useState(1);
  const [recording, setRecording] = useState(false);
  const query = usePayments({ q, method, page });

  return (
    <>
      <PageHeader
        title="Payments"
        description="Money received against service invoices. Paying the full total marks the invoice paid."
        actions={<Button onClick={() => setRecording(true)}><Plus className="size-4" /> Record payment</Button>}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search reference" />
          <FilterSelect
            allLabel="All methods"
            value={method}
            onChange={(v) => { setMethod(v as PaymentMethod | undefined); setPage(1); }}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
          />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(p) => p.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: q || method ? "No payments match" : "No payments recorded yet" }}
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
      <PaymentFormDialog open={recording} onOpenChange={setRecording} />
    </>
  );
}
