"use client";

import { FilePlus2, FileText, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStaffClientOptions } from "@/features/workspace/hooks/use-workspace";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatPeriod, humanize } from "@/lib/format";
import type { StaffPortal } from "@/types/auth";
import { useCancelRequest, useDocumentRequests, useDocuments, useSetDocumentStatus } from "../hooks/use-documents";
import { documentFileUrl } from "../services/document-service";
import {
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  REQUEST_STATUSES,
  type ClientDocument,
  type DocumentCategory,
  type DocumentRequest,
  type DocumentStatus,
  type RequestStatus,
} from "../types/document.types";
import { RequestDocumentsDialog, UploadDocumentDialog } from "./document-dialogs";

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

function DocumentStatusCell({ portal, doc }: { portal: StaffPortal; doc: ClientDocument }) {
  const setStatus = useSetDocumentStatus(portal);
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

function CancelRequestButton({ portal, request }: { portal: StaffPortal; request: DocumentRequest }) {
  const cancel = useCancelRequest(portal);
  if (request.status !== "open") return null;
  const run = async () => {
    try {
      await cancel.mutateAsync(request.id);
      toast.success("Request cancelled");
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Button variant="ghost" size="sm" disabled={cancel.isPending} onClick={() => void run()} aria-label={`Cancel request: ${request.description}`}>
      <X className="size-4" /> Cancel
    </Button>
  );
}

const docColumns = (portal: StaffPortal): Column<ClientDocument>[] => [
  {
    key: "document",
    header: "Document",
    cell: (d) => (
      <a href={documentFileUrl(portal, d.id)} target="_blank" rel="noopener" className="text-primary inline-flex max-w-64 items-center gap-1.5 font-medium hover:underline">
        <FileText className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{d.file_name}</span>
      </a>
    ),
  },
  { key: "client", header: "Client", cell: (d) => d.client_name },
  { key: "category", header: "Category", hideOnMobile: true, cell: (d) => CATEGORY_LABELS[d.category] },
  { key: "period", header: "Period", hideOnMobile: true, cell: (d) => (d.period ? formatPeriod(d.period) : "—") },
  {
    key: "uploaded",
    header: "Uploaded by",
    hideOnMobile: true,
    cell: (d) => (
      <span className="text-muted-foreground">
        {d.uploaded_by_name ?? d.uploaded_by_email ?? "—"}
        {d.uploaded_by_name && <span className="text-xs"> · {d.from_client ? "client" : "team"}</span>}
      </span>
    ),
  },
  { key: "status", header: "Status", cell: (d) => <DocumentStatusCell portal={portal} doc={d} /> },
];

const requestColumns = (portal: StaffPortal): Column<DocumentRequest>[] => [
  { key: "request", header: "Request", cell: (r) => <span className="font-medium">{r.description}</span> },
  { key: "client", header: "Client", cell: (r) => r.client_name },
  { key: "period", header: "Period", hideOnMobile: true, cell: (r) => (r.period ? formatPeriod(r.period) : "—") },
  { key: "asked", header: "Asked by", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.requested_by_email ?? "—"}</span> },
  { key: "due", header: "Due", hideOnMobile: true, cell: (r) => formatDate(r.due_date) },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  { key: "actions", header: "", cell: (r) => <CancelRequestButton portal={portal} request={r} /> },
];

export function DocumentCentre({ portal = "admin" }: { portal?: StaffPortal }) {
  const clients = useStaffClientOptions(portal);
  const [docQ, setDocQ] = useState("");
  const [clientId, setClientId] = useState<string>();
  const [category, setCategory] = useState<DocumentCategory>();
  const [status, setStatus] = useState<DocumentStatus>();
  const [docPage, setDocPage] = useState(1);
  const [reqQ, setReqQ] = useState("");
  const [reqStatus, setReqStatus] = useState<RequestStatus>("open");
  const [reqPage, setReqPage] = useState(1);
  const [requesting, setRequesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const docs = useDocuments(portal, { q: docQ, client_id: clientId, category, status, page: docPage });
  const requests = useDocumentRequests(portal, { q: reqQ, client_id: clientId, status: reqStatus, page: reqPage });
  const filtered = !!(docQ || clientId || category || status);

  return (
    <>
      <PageHeader
        title={portal === "admin" ? "Document Centre" : "Documents"}
        description={portal === "admin" ? "Every file and every request, across all clients." : "Files and requests for the clients you're assigned to."}
        actions={
          <>
            <Button variant="outline" onClick={() => setUploading(true)}><Upload className="size-4" /> Upload</Button>
            <Button onClick={() => setRequesting(true)}><FilePlus2 className="size-4" /> Request documents</Button>
          </>
        }
      />
      <div className="mb-4">
        <FilterSelect allLabel="All clients" value={clientId} onChange={(v) => { setClientId(v); setDocPage(1); setReqPage(1); }} options={clients.data ?? []} className="sm:w-64" />
      </div>
      <div className="space-y-6">
        <Section title="Document requests" subtitle="What the team has asked clients for. Uploading against a request marks it fulfilled.">
          <div className="flex flex-col flex-wrap gap-3 border-b p-4 sm:flex-row">
            <SearchInput value={reqQ} onChange={(v) => { setReqQ(v); setReqPage(1); }} placeholder="Search requests" />
            <FilterSelect
              allLabel="Open"
              value={reqStatus === "open" ? undefined : reqStatus}
              onChange={(v) => { setReqStatus((v as RequestStatus | undefined) ?? "open"); setReqPage(1); }}
              options={REQUEST_STATUSES.filter((s) => s !== "open").map((s) => ({ value: s, label: humanize(s) }))}
            />
          </div>
          <DataTable
            columns={requestColumns(portal)}
            rows={requests.data?.items}
            rowKey={(r) => r.id}
            isLoading={requests.isLoading}
            error={requests.error}
            onRetry={() => void requests.refetch()}
            empty={{ title: reqStatus === "open" ? "Nothing outstanding" : `No ${reqStatus} requests`, description: reqStatus === "open" ? "No client owes the team a document right now." : undefined }}
            pagination={requests.data && { ...requests.data, onPageChange: setReqPage }}
          />
        </Section>

        <Section title="Documents" subtitle="Stored privately. Only people with access to the client can open them.">
          <div className="flex flex-col flex-wrap gap-3 border-b p-4 sm:flex-row">
            <SearchInput value={docQ} onChange={(v) => { setDocQ(v); setDocPage(1); }} placeholder="Search documents" />
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
            columns={docColumns(portal)}
            rows={docs.data?.items}
            rowKey={(d) => d.id}
            isLoading={docs.isLoading}
            error={docs.error}
            onRetry={() => void docs.refetch()}
            empty={{ title: filtered ? "No documents match" : "No documents yet", description: filtered ? undefined : "Files clients upload appear here." }}
            pagination={docs.data && { ...docs.data, onPageChange: setDocPage }}
          />
        </Section>
      </div>
      <RequestDocumentsDialog portal={portal} open={requesting} onOpenChange={setRequesting} />
      <UploadDocumentDialog portal={portal} open={uploading} onOpenChange={setUploading} />
    </>
  );
}
