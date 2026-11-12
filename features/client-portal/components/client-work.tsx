"use client";

import { CalendarClock, CheckCircle2, Download, Undo2, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPeriod, humanize } from "@/lib/format";
import { useDecideApproval, usePortalApprovals, usePortalMeetings, usePortalReports, usePortalTasks } from "../hooks/use-client-portal";
import { portalFileUrl } from "../services/client-portal-service";
import type { PortalApproval, PortalCompany } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";
import { CLIENT_TASK_STATUS, Card, ListBody } from "./portal-ui";

// ───────────── Tasks & Progress ─────────────

function ProgressBody() {
  const [period, setPeriod] = useState<string>();
  const { data, isLoading, error, refetch } = usePortalTasks(period);
  const tasks = data ? { data: data.tasks, isLoading, error, refetch } : { data: undefined, isLoading, error, refetch };
  const done = data?.tasks.filter((t) => t.status === "approved").length ?? 0;
  return (
    <>
      <PageHeader
        title="Tasks & Progress"
        description="The work your team is doing for you this month."
        actions={
          data && (
            <Select value={data.period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40" aria-label="Period"><SelectValue /></SelectTrigger>
              <SelectContent>{data.periods.map((p) => <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>)}</SelectContent>
            </Select>
          )
        }
      />
      <Card title={data ? `${formatPeriod(data.period)} · ${done} of ${data.tasks.length} done` : "Tasks"} subtitle="Some internal checks are done behind the scenes and don't appear here.">
        <ListBody query={tasks} empty={{ title: "No work scheduled for this month yet" }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((t) => {
                const s = CLIENT_TASK_STATUS[t.status] ?? { label: humanize(t.status), tone: t.status };
                const ticked = t.checklist.filter((c) => c.done).length;
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-muted-foreground text-xs">{t.due_date ? `Due ${formatDate(t.due_date)} · ` : ""}{ticked}/{t.checklist.length} steps done</p>
                      <div className="bg-muted mt-1.5 h-1 w-40 overflow-hidden rounded-full" aria-hidden>
                        <div className="bg-primary h-full" style={{ width: `${t.checklist.length ? (ticked / t.checklist.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <StatusBadge status={s.tone} label={s.label} />
                  </li>
                );
              })}
            </ul>
          )}
        </ListBody>
      </Card>
    </>
  );
}

export function ClientProgress() {
  return <CompanyGate>{() => <ProgressBody />}</CompanyGate>;
}

// ───────────── Reports ─────────────

function ReportsBody() {
  const q = usePortalReports();
  return (
    <>
      <PageHeader title="Reports" description="Financial reports your team has prepared and approved for you." />
      <Card title="Published reports">
        <ListBody query={q} empty={{ title: "No reports published yet", description: "Your monthly reports appear here once your team signs them off." }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{humanize(r.report_type)} · {formatPeriod(r.period)}</p>
                    {r.summary && <p className="text-muted-foreground mt-0.5 text-sm">{r.summary}</p>}
                    <p className="text-muted-foreground mt-1 text-xs">Published {formatDate(r.published_date)}</p>
                  </div>
                  {r.file_name && (
                    <Button asChild size="sm" variant="outline">
                      <a href={portalFileUrl.report(r.id)} target="_blank" rel="noopener"><Download className="size-4" /> Download</a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ListBody>
      </Card>
    </>
  );
}

export function ClientReports() {
  return <CompanyGate>{() => <ReportsBody />}</CompanyGate>;
}

// ───────────── Approvals ─────────────

function DecisionDialog({ approval, decision, onClose }: { approval: PortalApproval; decision: "approved" | "rejected"; onClose: () => void }) {
  const decide = useDecideApproval();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (decision === "rejected" && !comment.trim()) return setError("Tell your team why you're rejecting this");
    try {
      await decide.mutateAsync({ id: approval.id, decision, comment });
      toast.success(decision === "approved" ? "Approved. Your team has been told." : "Rejected. Your team has been told.");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{decision === "approved" ? "Approve" : "Reject"}: {approval.subject}</DialogTitle>
          <DialogDescription>{approval.description ?? "Your decision is recorded and shared with your accounting team."}</DialogDescription>
        </DialogHeader>
        <FormField id="comment" label={decision === "approved" ? "Comment (optional)" : "Reason"} error={error ?? undefined}>
          <Textarea id="comment" rows={3} value={comment} onChange={(e) => { setComment(e.target.value); setError(null); }} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" variant={decision === "approved" ? "default" : "destructive"} pending={decide.isPending} onClick={() => void submit()}>
            {decision === "approved" ? "Approve" : "Reject"}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalsBody({ company }: { company: PortalCompany }) {
  const q = usePortalApprovals();
  const [deciding, setDeciding] = useState<{ approval: PortalApproval; decision: "approved" | "rejected" } | null>(null);
  return (
    <>
      <PageHeader title="Approvals" description="Decisions your accounting team needs from you." />
      {!company.can_approve && (
        <Alert className="mb-4"><AlertDescription>You can see approvals, but only the owner or someone allowed to approve can decide them.</AlertDescription></Alert>
      )}
      <Card title="Requests for approval">
        <ListBody query={q} empty={{ title: "Nothing to approve", description: "When your team needs your sign-off, it appears here." }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.subject}</p>
                    {a.description && <p className="text-muted-foreground mt-0.5 text-sm">{a.description}</p>}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {a.requested_by ? `Asked by ${a.requested_by} · ` : ""}{formatDate(a.created_at)}
                      {a.decided_by ? ` · ${a.status} by ${a.decided_by} on ${formatDate(a.decided_at)}` : ""}
                    </p>
                    {a.comment && <p className="mt-1 text-sm">“{a.comment}”</p>}
                  </div>
                  {a.status === "pending" && company.can_approve ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDeciding({ approval: a, decision: "rejected" })}><Undo2 className="size-4" /> Reject</Button>
                      <Button size="sm" onClick={() => setDeciding({ approval: a, decision: "approved" })}><CheckCircle2 className="size-4" /> Approve</Button>
                    </div>
                  ) : (
                    <StatusBadge status={a.status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </ListBody>
      </Card>
      {deciding && <DecisionDialog approval={deciding.approval} decision={deciding.decision} onClose={() => setDeciding(null)} />}
    </>
  );
}

export function ClientApprovals() {
  return <CompanyGate>{(company) => <ApprovalsBody company={company} />}</CompanyGate>;
}

// ───────────── Meetings ─────────────

function MeetingsBody() {
  const q = usePortalMeetings();
  const now = new Date().toISOString().replace("T", " ");
  return (
    <>
      <PageHeader title="Meetings" description="Calls with your accounting team." />
      <Card title="Meetings">
        <ListBody query={q} empty={{ title: "No meetings scheduled", description: "Your team schedules review calls here." }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((m) => {
                const upcoming = m.starts_at > now;
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <CalendarClock className={upcoming ? "text-primary size-5" : "text-muted-foreground size-5"} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(m.starts_at, true)} – {m.ends_at.slice(11, 16)}{m.organiser ? ` · with ${m.organiser}` : ""}
                      </p>
                      {m.attendees && <p className="text-muted-foreground text-xs">Attendees: {m.attendees}</p>}
                    </div>
                    {upcoming && m.meeting_link ? (
                      <Button asChild size="sm"><a href={m.meeting_link} target="_blank" rel="noopener noreferrer"><Video className="size-4" /> Join</a></Button>
                    ) : (
                      <StatusBadge status={upcoming ? "scheduled" : "closed"} label={upcoming ? "Upcoming" : "Past"} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ListBody>
      </Card>
    </>
  );
}

export function ClientMeetings() {
  return <CompanyGate>{() => <MeetingsBody />}</CompanyGate>;
}
