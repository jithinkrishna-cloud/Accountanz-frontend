"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientOptions } from "@/features/clients/hooks/use-client-options";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatPeriod, humanize } from "@/lib/format";
import { useDocuments, useOpenRequests, useSetDocumentStatus } from "../hooks/use-documents";
import { documentFileUrl } from "../services/document-service";
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  type ClientDocument,
  type DocumentCategory,
  type DocumentRequest,
  type DocumentStatus,
} from "../types/document.types";

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <header className="border-b px-5 py-4">
        <h2 className="font-medium">{title}</h2>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function DocumentStatusCell({ doc }: { doc: ClientDocument }) {
  const setStatus = useSetDocumentStatus();
  const change = async (status: string) => {
    try {
      await setStatus.mutateAsync({ id: doc.id, status: status as DocumentStatus });
      toast.success(`${doc.file_name} marked ${status}`);
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Select value={doc.status} onValueChange={change} disabled={setStatus.isPending}>
      <SelectTrigger size="sm" className="w-32" aria-label={`Status of ${doc.file_name}`}><SelectValue /></SelectTrigger>
      <SelectContent>{DOCUMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent>
    </Select>
  );
}

const docColumns: Column<ClientDocument>[] = [
  {
    key: "document",
    header: "Document",
    cell: (d) => (
      <a href={documentFileUrl(d.id)} target="_blank" rel="noopener" className="text-primary inline-flex max-w-64 items-center gap-1.5 font-medium hover:underline">
        <FileText className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{d.file_name}</span>
      </a>
    ),
  },
  { key: "client", header: "Client", cell: (d) => d.client_name },
  { key: "category", header: "Category", hideOnMobile: true, cell: (d) => CATEGORY_LABELS[d.category] },
  { key: "period", header: "Period", hideOnMobile: true, cell: (d) => (d.period ? formatPeriod(d.period) : "—") },
  { key: "uploaded", header: "Uploaded by", hideOnMobile: true, cell: (d) => <span className="text-muted-foreground">{d.uploaded_by_email ?? "—"}</span> },
  { key: "status", header: "Status", cell: (d) => <DocumentStatusCell doc={d} /> },
];

const requestColumns: Column<DocumentRequest>[] = [
  { key: "request", header: "Request", cell: (r) => <span className="font-medium">{r.description}</span> },
  { key: "client", header: "Client", cell: (r) => r.client_name },
  { key: "asked", header: "Asked by", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.requested_by_email ?? "—"}</span> },
  { key: "due", header: "Due", hideOnMobile: true, cell: (r) => formatDate(r.due_date) },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

export function DocumentCentre() {
  const clients = useClientOptions();
  const [docQ, setDocQ] = useState("");
  const [clientId, setClientId] = useState<string>();
  const [category, setCategory] = useState<DocumentCategory>();
  const [status, setStatus] = useState<DocumentStatus>();
  const [docPage, setDocPage] = useState(1);
  const [reqQ, setReqQ] = useState("");
  const [reqPage, setReqPage] = useState(1);
  const docs = useDocuments({ q: docQ, client_id: clientId, category, status, page: docPage });
  const requests = useOpenRequests({ q: reqQ, page: reqPage });
  const filtered = !!(docQ || clientId || category || status);

  return (
    <>
      <PageHeader title="Document Centre" description="Every file and every outstanding ask, across all clients." />
      <div className="space-y-6">
        <Section title="Documents" subtitle="Stored privately — only signed-in portal users can open them.">
          <div className="flex flex-col flex-wrap gap-3 border-b p-4 sm:flex-row">
            <SearchInput value={docQ} onChange={(v) => { setDocQ(v); setDocPage(1); }} placeholder="Search documents" />
            <FilterSelect allLabel="All clients" value={clientId} onChange={(v) => { setClientId(v); setDocPage(1); }} options={clients.data ?? []} />
            <FilterSelect
              allLabel="All categories"
              value={category}
              onChange={(v) => { setCategory(v as DocumentCategory | undefined); setDocPage(1); }}
              options={DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
            />
            <FilterSelect
              allLabel="All statuses"
              value={status}
              onChange={(v) => { setStatus(v as DocumentStatus | undefined); setDocPage(1); }}
              options={DOCUMENT_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
            />
          </div>
          <DataTable
            columns={docColumns}
            rows={docs.data?.items}
            rowKey={(d) => d.id}
            isLoading={docs.isLoading}
            error={docs.error}
            onRetry={() => void docs.refetch()}
            empty={{ title: filtered ? "No documents match" : "No documents yet", description: filtered ? undefined : "Files clients upload appear here." }}
            pagination={docs.data && { ...docs.data, onPageChange: setDocPage }}
          />
        </Section>

        <Section title="Open document requests" subtitle="What the team is waiting on from clients.">
          <div className="border-b p-4">
            <SearchInput value={reqQ} onChange={(v) => { setReqQ(v); setReqPage(1); }} placeholder="Search requests" />
          </div>
          <DataTable
            columns={requestColumns}
            rows={requests.data?.items}
            rowKey={(r) => r.id}
            isLoading={requests.isLoading}
            error={requests.error}
            onRetry={() => void requests.refetch()}
            empty={{ title: reqQ ? "No requests match" : "Nothing outstanding", description: reqQ ? undefined : "No client owes the team a document right now." }}
            pagination={requests.data && { ...requests.data, onPageChange: setReqPage }}
          />
        </Section>
      </div>
    </>
  );
}
