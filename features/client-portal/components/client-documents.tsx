"use client";

import { FileText, Upload } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type DocumentCategory } from "@/features/documents/types/document.types";
import { formatDate, formatPeriod } from "@/lib/format";
import { usePortalDocuments, usePortalRequests } from "../hooks/use-client-portal";
import { portalFileUrl } from "../services/client-portal-service";
import type { PortalRequest } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";
import { Card, ListBody } from "./portal-ui";
import { UploadDialog } from "./upload-dialog";

const DOC_STATUS_LABEL = { new: "Received", reviewed: "Reviewed", rejected: "Rejected" } as const;

function DocumentsBody() {
  const q = usePortalDocuments();
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <PageHeader title="Document Centre" description="Everything you've shared with your accounting team." actions={<Button onClick={() => setUploading(true)}><Upload className="size-4" /> Upload</Button>} />
      <Card title="Your documents" subtitle="Stored privately: only you and your accounting team can open them.">
        <ListBody query={q} empty={{ title: "No documents yet", description: "Upload bank statements, bills and invoices here, or answer a document request." }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <FileText className="text-primary size-5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <a href={portalFileUrl.document(d.id)} target="_blank" rel="noopener" className="block truncate text-sm font-medium hover:underline">{d.file_name}</a>
                    <p className="text-muted-foreground text-xs">
                      {CATEGORY_LABELS[d.category as DocumentCategory] ?? d.category}{d.period ? ` · ${formatPeriod(d.period)}` : ""} · {formatDate(d.created_at)}{d.uploaded_by ? ` · ${d.uploaded_by}` : ""}
                    </p>
                    {d.status === "rejected" && d.review_note && <p className="text-destructive mt-1 text-xs">Rejected: {d.review_note}</p>}
                  </div>
                  <StatusBadge status={d.status === "new" ? "submitted" : d.status} label={DOC_STATUS_LABEL[d.status]} />
                </li>
              ))}
            </ul>
          )}
        </ListBody>
      </Card>
      <UploadDialog open={uploading} onOpenChange={setUploading} />
    </>
  );
}

export function ClientDocuments() {
  return <CompanyGate>{() => <DocumentsBody />}</CompanyGate>;
}

function RequestsBody() {
  const q = usePortalRequests();
  const [answering, setAnswering] = useState<PortalRequest | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Document Requests" description="What your accounting team needs from you." />
      <Card title="Requests" subtitle="Upload a file against a request and your team is told straight away.">
        <ListBody query={q} empty={{ title: "Nothing requested", description: "When your team needs a document, it appears here." }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((r) => {
                const overdue = r.status === "open" && !!r.due_date && r.due_date < today;
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.description}</p>
                      <p className={overdue ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
                        {r.requested_by ? `Asked by ${r.requested_by}` : "Requested"}{r.due_date ? ` · due ${formatDate(r.due_date)}` : ""}{overdue ? " · overdue" : ""}{r.files ? ` · ${r.files} file(s) sent` : ""}
                      </p>
                    </div>
                    {r.status === "open" ? (
                      <Button size="sm" onClick={() => setAnswering(r)}><Upload className="size-4" /> Upload</Button>
                    ) : (
                      <StatusBadge status="approved" label="Done" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ListBody>
      </Card>
      <UploadDialog open={answering !== null} onOpenChange={(o) => !o && setAnswering(null)} request={answering} />
    </>
  );
}

export function ClientRequests() {
  return <CompanyGate>{() => <RequestsBody />}</CompanyGate>;
}
