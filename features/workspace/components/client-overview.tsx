"use client";

import { ArrowLeft, BookOpen, CalendarPlus, CircleCheck, FilePlus2, FileText, MessageSquarePlus, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestApprovalDialog } from "@/features/client-approvals/components/request-approval-dialog";
import { NewThreadDialog } from "@/features/communication/components/new-thread-dialog";
import { ScheduleMeetingDialog } from "@/features/communication/components/schedule-meeting-dialog";
import { RequestDocumentsDialog, UploadDocumentDialog } from "@/features/documents/components/document-dialogs";
import { NewReportDialog } from "@/features/reports/components/new-report-dialog";
import { ACCOUNTING_SOFTWARE_LABELS } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/format";
import { JournlDataSheet, type JournlDataSource } from "@/features/integrations/components/journl-data-sheet";
import { useClientOverview } from "../hooks/use-workspace";
import { workspaceService } from "../services/workspace-service";

type Action = "request" | "upload" | "message" | "meeting" | "approval" | "report" | null;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card min-w-0 rounded-xl border shadow-xs">
      <h2 className="border-b px-5 py-4 font-medium">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{value || "—"}</dd>
    </div>
  );
}

export function ClientOverviewView({ id }: { id: number }) {
  const { data, isLoading, error, refetch } = useClientOverview(id);
  const [action, setAction] = useState<Action>(null);
  const [books, setBooks] = useState<JournlDataSource | null>(null);
  const close = (o: boolean) => !o && setAction(null);

  const back = (
    <Link href="/team/clients" className="text-muted-foreground mb-4 inline-flex items-center gap-1 text-sm hover:underline">
      <ArrowLeft className="size-4" /> My Clients
    </Link>
  );
  if (error) return <>{back}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !data) return <>{back}<Skeleton className="mb-6 h-8 w-64" /><Skeleton className="h-48 w-full rounded-xl" /></>;

  const { client, engagement, team, contacts, summary, journl, journl_connection: jc } = data;
  const myModules = journl.flatMap((p) => p.modules.filter((m) => m.effective_actions.length > 0));
  const journlOn = journl.some((p) => p.journl_access);
  return (
    <>
      {back}
      <PageHeader title={client.name} description={client.legal_name} actions={<StatusBadge status={client.status} />} />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button onClick={() => setAction("request")}><FilePlus2 className="size-4" /> Request documents</Button>
        <Button variant="outline" onClick={() => setAction("upload")}><Upload className="size-4" /> Upload</Button>
        <Button variant="outline" onClick={() => setAction("message")}><MessageSquarePlus className="size-4" /> Message</Button>
        <Button variant="outline" onClick={() => setAction("meeting")}><CalendarPlus className="size-4" /> Schedule meeting</Button>
        <Button variant="outline" onClick={() => setAction("approval")}><CircleCheck className="size-4" /> Request approval</Button>
        <Button variant="outline" onClick={() => setAction("report")}><FileText className="size-4" /> New report</Button>
      </div>

      {summary && (
        <div className="bg-card mb-6 grid grid-cols-2 gap-4 rounded-xl border p-5 shadow-xs sm:grid-cols-5">
          <Fact label="Open tasks" value={String(summary.open_tasks)} />
          <Fact label="Overdue" value={String(summary.overdue_tasks)} />
          <Fact label="Documents owed" value={String(summary.open_requests)} />
          <Fact label="Messages to reply" value={String(summary.awaiting_reply)} />
          <Fact label="This month" value={<StatusBadge status={summary.closing_status} />} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Engagement and scope">
            {engagement ? (
              <>
                <dl className="grid gap-4 sm:grid-cols-3">
                  <Fact label="Package" value={engagement.package_name} />
                  <Fact label="Started" value={formatDate(engagement.start_date)} />
                  <Fact label="Renews" value={formatDate(engagement.renewal_date)} />
                </dl>
                {engagement.services.length > 0 && (
                  <div className="mt-4">
                    <p className="text-muted-foreground text-xs">Services included</p>
                    <ul className="mt-2 flex flex-wrap gap-2">{engagement.services.map((s) => <li key={s} className="bg-muted rounded-full px-3 py-1 text-xs">{s}</li>)}</ul>
                  </div>
                )}
                {engagement.scope_notes && <p className="text-muted-foreground mt-4 text-sm whitespace-pre-wrap">{engagement.scope_notes}</p>}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No active engagement. An admin activates it in Engagements.</p>
            )}
          </Card>
          <Card title="Business details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="GSTIN" value={client.gstin && <span className="font-mono">{client.gstin}</span>} />
              <Fact label="PAN" value={client.pan && <span className="font-mono">{client.pan}</span>} />
              <Fact label="State" value={client.state} />
              <Fact label="Accounting software" value={ACCOUNTING_SOFTWARE_LABELS[client.accounting_software] ?? humanize(client.accounting_software)} />
            </dl>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Accounting team">
            <ul className="space-y-3">
              {team.map((m) => (
                <li key={`${m.user_id}-${m.team_role}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{m.full_name}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">{humanize(m.team_role)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="JournL books">
            {!jc || jc.status !== "connected" ? (
              <p className="text-muted-foreground text-sm">The client hasn&apos;t connected JournL yet. They do it from their portal (Accounting Software).</p>
            ) : (
              <>
                <p className="text-sm">
                  {jc.org_name ?? "JournL company"} <span className="text-muted-foreground font-mono text-xs">· ID {jc.org_id}</span>
                </p>
                {!journlOn && journl.length > 0 ? (
                  <p className="text-muted-foreground mt-2 text-sm">Your assignment doesn&apos;t include JournL access. An admin can turn it on.</p>
                ) : jc.session_until ? (
                  <>
                    <p className="text-muted-foreground mt-1 text-xs">Readable until {formatDate(jc.session_until, true)}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() =>
                        setBooks({
                          key: ["team", "workspace", "journl-data", client.id],
                          title: client.name,
                          orgId: jc.org_id,
                          sessionUntil: jc.session_until,
                          load: (period) => workspaceService.journlData(client.id, period),
                        })
                      }
                    >
                      <BookOpen className="size-4" aria-hidden /> View JournL data
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground mt-2 text-sm">The JournL session has expired. Ask the client owner to refresh it from their portal (Accounting Software).</p>
                )}
              </>
            )}
          </Card>
          {journl.length > 0 && (
            <Card title="My JournL access">
              {!journlOn ? (
                <p className="text-muted-foreground text-sm">JournL access is off for your assignment. An admin can turn it on.</p>
              ) : myModules.length === 0 ? (
                <p className="text-muted-foreground text-sm">No JournL modules have been granted to you yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {[...new Map(myModules.map((m) => [m.module_key, m])).values()].map((m) => (
                    <li key={m.module_key} className="bg-muted rounded-full px-2.5 py-0.5 text-xs">{m.label}</li>
                  ))}
                </ul>
              )}
              <p className="text-muted-foreground mt-3 text-xs">Read-only for now: open them under Accounting — JournL in the sidebar. The client&apos;s JournL plan also applies.</p>
            </Card>
          )}
          <Card title="Client contacts">
            {contacts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No portal users yet. An admin invites them from the client page.</p>
            ) : (
              <ul className="space-y-3">
                {contacts.map((u) => (
                  <li key={u.email} className="text-sm">
                    <p className="font-medium">{u.full_name} <span className="text-muted-foreground font-normal">· {humanize(u.role)}</span></p>
                    <p className="text-muted-foreground text-xs break-all">{u.email}{u.can_approve ? " · can approve" : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <RequestDocumentsDialog portal="team" clientId={id} open={action === "request"} onOpenChange={close} />
      <UploadDocumentDialog portal="team" clientId={id} open={action === "upload"} onOpenChange={close} />
      <NewThreadDialog portal="team" clientId={id} open={action === "message"} onOpenChange={close} />
      <ScheduleMeetingDialog portal="team" clientId={id} open={action === "meeting"} onOpenChange={close} />
      <RequestApprovalDialog portal="team" clientId={id} open={action === "approval"} onOpenChange={close} />
      <NewReportDialog portal="team" clientId={id} open={action === "report"} onOpenChange={close} />
      <JournlDataSheet source={books} onClose={() => setBooks(null)} />
    </>
  );
}
