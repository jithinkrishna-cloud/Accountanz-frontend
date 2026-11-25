"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { usePortalRequests } from "../hooks/use-client-portal";
import type { PortalRequest } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";
import { DocumentExplorer } from "./document-explorer";
import { Card, ListBody } from "./portal-ui";
import { UploadDialog } from "./upload-dialog";

/** Document Centre: the client's folders (any depth) and files. */
export function ClientDocuments() {
  return <CompanyGate>{() => <DocumentExplorer />}</CompanyGate>;
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
