"use client";

import { Eye, FileText, ListChecks, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, formatPeriod, humanize, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortalRequests } from "../hooks/use-client-portal";
import { portalFileUrl } from "../services/client-portal-service";
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

/** The requester's role on the company's team (or at Accountanz), in plain words. */
export const REQUESTER_ROLE: Record<string, string> = {
  bookkeeper: "Bookkeeper",
  finance_manager: "Finance manager",
  reviewer: "Reviewer",
  cfo: "CFO",
  super_admin: "Accountanz admin",
  ops_admin: "Accountanz operations",
};

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
            <ul className="grid gap-4 p-4 sm:p-5">
              {rows.map((r) => {
                const overdue = r.status === "open" && !!r.due_date && r.due_date < today;
                return (
                  <li key={r.id} className="bg-card overflow-hidden rounded-xl border shadow-xs">
                    {/* Header: what's needed, where it stands, and the action */}
                    <div className="bg-muted/40 flex flex-wrap items-center gap-3 border-b px-4 py-3">
                      <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden />
                      <p className="min-w-0 flex-1 font-medium">{r.description}</p>
                      {r.status === "open" ? (
                        <>
                          <StatusBadge status={overdue ? "rejected" : "pending"} label={overdue ? "Overdue" : "Waiting for you"} />
                          <Button size="sm" onClick={() => setAnswering(r)}><Upload className="size-4" /> Upload</Button>
                        </>
                      ) : (
                        <StatusBadge status="approved" label="Done" />
                      )}
                    </div>

                    {/* Details */}
                    <dl className="grid gap-4 px-4 py-3.5 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:gap-0 sm:divide-x">
                      <div className="min-w-0 sm:pr-5">
                        <dt className="text-muted-foreground text-[11px] tracking-wide uppercase">Requested by</dt>
                        <dd className="mt-1 flex min-w-0 items-center gap-2">
                          {r.requested_by ? (
                            <>
                              <Avatar className="size-6"><AvatarFallback className="bg-secondary text-[10px] font-semibold">{initials(r.requested_by)}</AvatarFallback></Avatar>
                              <span className="min-w-0 truncate">
                                <span className="font-medium">{r.requested_by}</span>
                                {r.requested_by_role && <span className="text-muted-foreground"> · {REQUESTER_ROLE[r.requested_by_role] ?? humanize(r.requested_by_role)}</span>}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Your accounting team</span>
                          )}
                        </dd>
                      </div>
                      <div className="min-w-0 sm:px-5">
                        <dt className="text-muted-foreground text-[11px] tracking-wide uppercase">For task</dt>
                        <dd className="mt-1 min-w-0">
                          {r.task ? (
                            <Link href={`/app/progress?task=${r.task.id}&period=${r.task.period}`} className="group inline-flex max-w-full items-center gap-1.5" title="Open this task">
                              <ListChecks className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              <span className="truncate font-medium group-hover:underline">{r.task.title}</span>
                              <span className="text-muted-foreground shrink-0">· {formatPeriod(r.task.period)}</span>
                              <StagePill stage={STAGE_OF[r.task.status]} className="shrink-0" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Not linked to a task</span>
                          )}
                        </dd>
                      </div>
                      <div className="sm:pl-5">
                        <dt className="text-muted-foreground text-[11px] tracking-wide uppercase">Due</dt>
                        <dd className={cn("mt-1 whitespace-nowrap", overdue && "text-destructive font-medium")}>{r.due_date ? formatDate(r.due_date) : "—"}</dd>
                      </div>
                    </dl>

                    {/* Files sent for this request */}
                    <div className="border-t px-4 py-3">
                      <p className="text-muted-foreground mb-2 text-[11px] tracking-wide uppercase">Files sent ({r.documents.length})</p>
                      {r.documents.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{r.status === "open" ? "Nothing sent yet. Use Upload to send the file." : "No files."}</p>
                      ) : (
                        <ul className="divide-y rounded-lg border" aria-label={`Files sent for ${r.description}`}>
                          {r.documents.map((d) => (
                            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                              <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{d.file_name}</span>
                                <span className="text-muted-foreground block text-xs">Sent {formatDate(d.created_at)}</span>
                              </span>
                              <Button size="sm" variant="outline" onClick={() => setViewing(d)} aria-label={`View ${d.file_name}`}><Eye className="size-4" /> View</Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ListBody>
      </Card>
      <DocumentViewer
        doc={viewing}
        viewUrl={portalFileUrl.view}
        downloadUrl={portalFileUrl.document}
        onClose={() => setViewing(null)}
      />
      <UploadDialog open={answering !== null} onOpenChange={(o) => !o && setAnswering(null)} request={answering} />
    </>
  );
}

export function ClientRequests() {
  return <CompanyGate>{() => <RequestsBody />}</CompanyGate>;
}
