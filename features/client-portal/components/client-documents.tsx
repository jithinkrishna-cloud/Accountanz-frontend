"use client";

import { Eye, FileText, ListChecks, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPeriod } from "@/lib/format";
import { usePortalRequests } from "../hooks/use-client-portal";
import type { PortalRequest } from "../types/client-portal.types";
import { STAGE_OF, StagePill } from "./client-progress";
import { CompanyGate } from "./company-gate";
import { DocumentExplorer } from "./document-explorer";
import { DocumentViewer } from "./document-viewer";
import { Card, ListBody } from "./portal-ui";
import { UploadDialog } from "./upload-dialog";

/** Document Centre: the client's folders (any depth) and files. */
export function ClientDocuments() {
  return <CompanyGate>{() => <DocumentExplorer />}</CompanyGate>;
}

function RequestsBody() {
  const q = usePortalRequests();
  const [answering, setAnswering] = useState<PortalRequest | null>(null);
  const [viewing, setViewing] = useState<{ id: number; file_name: string } | null>(null);
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
                  <li key={r.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{r.description}</p>
                        <p className={overdue ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
                          {r.requested_by ? `Asked by ${r.requested_by}` : "Requested"}{r.due_date ? ` · due ${formatDate(r.due_date)}` : ""}{overdue ? " · overdue" : ""}{r.files ? ` · ${r.files} file${r.files === 1 ? "" : "s"} sent` : ""}
                        </p>
                        {r.task && (
                          <Link href="/app/progress" className="text-muted-foreground hover:text-foreground mt-1 inline-flex max-w-full items-center gap-1.5 text-xs">
                            <ListChecks className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">For the job <span className="text-foreground font-medium">{r.task.title}</span> · {formatPeriod(r.task.period)}</span>
                            <StagePill stage={STAGE_OF[r.task.status]} className="shrink-0" />
                          </Link>
                        )}
                      </div>
                      {r.status === "open" ? (
                        <Button size="sm" onClick={() => setAnswering(r)}><Upload className="size-4" /> Upload</Button>
                      ) : (
                        <StatusBadge status="approved" label="Done" />
                      )}
                    </div>
                    {r.documents.length > 0 && (
                      <ul className="mt-2.5 grid gap-1.5" aria-label={`Files sent for ${r.description}`}>
                        {r.documents.map((d) => (
                          <li key={d.id} className="bg-muted/40 flex items-center gap-2.5 rounded-lg border px-3 py-2">
                            <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{d.file_name}</span>
                              <span className="text-muted-foreground block text-xs">Sent {formatDate(d.created_at)}</span>
                            </span>
                            <Button size="sm" variant="outline" onClick={() => setViewing(d)} aria-label={`View ${d.file_name}`}><Eye className="size-4" /> View</Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ListBody>
      </Card>
      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />
      <UploadDialog open={answering !== null} onOpenChange={(o) => !o && setAnswering(null)} request={answering} />
    </>
  );
}

export function ClientRequests() {
  return <CompanyGate>{() => <RequestsBody />}</CompanyGate>;
}
