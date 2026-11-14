"use client";

import { CalendarClock, CalendarPlus, CheckCircle2, Download, Plus, Undo2, Video, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/hooks/use-session";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatIsoDateTime, formatMeetingTime, formatPeriod, humanize, parseUtc } from "@/lib/format";
import {
  useDecideApproval,
  usePortalApprovals,
  usePortalMeetingRequests,
  usePortalMeetings,
  usePortalReports,
  useRequestMeeting,
  useWithdrawMeetingRequest,
} from "../hooks/use-client-portal";
import { portalFileUrl } from "../services/client-portal-service";
import type { PortalApproval, PortalCompany, PortalMeetingRequest } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";
import { Card, ListBody } from "./portal-ui";

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

const REQUEST_DURATIONS = [15, 30, 45, 60];
const REQUEST_STATUS: Record<PortalMeetingRequest["status"], string> = { pending: "Waiting for your team", scheduled: "Scheduled", declined: "Not scheduled", withdrawn: "Withdrawn" };

function RequestMeetingForm({ onDone }: { onDone: () => void }) {
  const request = useRequestMeeting();
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("30");
  const [slots, setSlots] = useState([{ date: "", time: "10:00" }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setSlot = (i: number, patch: Partial<{ date: string; time: string }>) => setSlots((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (topic.trim().length < 2) next.topic = "Tell us what you'd like to discuss";
    const filled = slots.filter((s) => s.date && s.time);
    const times = filled.map((s) => new Date(`${s.date}T${s.time}`));
    if (times.length === 0) next.times = "Suggest at least one time";
    else if (times.some((t) => t <= new Date())) next.times = "Suggest times in the future";
    else if (new Set(times.map((t) => t.getTime())).size !== times.length) next.times = "Suggest different times";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await request.mutateAsync({ topic: topic.trim(), notes: notes.trim() || null, preferred_times: times.map((t) => t.toISOString()), duration_minutes: Number(duration) });
      toast.success("Request sent. Your team will confirm a time.");
      onDone();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't send your request";
      if (err instanceof ApiError && (err.fieldErrors.topic || err.fieldErrors.preferred_times)) {
        setErrors({ topic: err.fieldErrors.topic?.[0] ?? "", times: err.fieldErrors.preferred_times?.[0] ?? "" });
      } else toast.error(message);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Request a meeting</DialogTitle>
        <DialogDescription>Suggest up to three times that suit you. Your team will confirm one and send you an invitation.</DialogDescription>
      </DialogHeader>
      <form id="meeting-request-form" onSubmit={submit} className="grid gap-4" noValidate>
        <FormField id="mr-topic" label="What would you like to discuss?" error={errors.topic || undefined}>
          <Input id="mr-topic" placeholder="Questions about last month's GST" value={topic} onChange={(e) => setTopic(e.target.value)} aria-invalid={!!errors.topic} maxLength={200} />
        </FormField>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Times that suit you</legend>
          {slots.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input type="date" aria-label={`Option ${i + 1} date`} value={s.date} onChange={(e) => setSlot(i, { date: e.target.value })} className="flex-1" aria-invalid={!!errors.times} />
              <Input type="time" aria-label={`Option ${i + 1} time`} value={s.time} onChange={(e) => setSlot(i, { time: e.target.value })} className="w-32" />
              {slots.length > 1 && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove option ${i + 1}`} onClick={() => setSlots((all) => all.filter((_, k) => k !== i))}>
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {slots.length < 3 && (
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setSlots((s) => [...s, { date: "", time: "10:00" }])}>
              <Plus className="size-4" /> Add another time
            </Button>
          )}
          {errors.times && <p className="text-destructive text-xs">{errors.times}</p>}
        </fieldset>
        <FormField id="mr-duration" label="Length">
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger id="mr-duration" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{REQUEST_DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField id="mr-notes" label="Anything we should prepare?" hint="Optional.">
          <Textarea id="mr-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="meeting-request-form" pending={request.isPending}>Send request</SubmitButton>
      </DialogFooter>
    </>
  );
}

function WithdrawButton({ request }: { request: PortalMeetingRequest }) {
  const withdraw = useWithdrawMeetingRequest();
  const run = async () => {
    try {
      await withdraw.mutateAsync(request.id);
      toast.success("Request withdrawn");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't withdraw the request");
    }
  };
  return (
    <Button variant="ghost" size="sm" disabled={withdraw.isPending} onClick={() => void run()} aria-label={`Withdraw request: ${request.topic}`}>
      <Undo2 className="size-4" /> Withdraw
    </Button>
  );
}

function MeetingRequests({ company }: { company: PortalCompany }) {
  const q = usePortalMeetingRequests();
  const { data: me } = useSession();
  if (!q.data?.length) return null;
  return (
    <Card title="Your requests" subtitle="Requests from the last 30 days.">
      <ul className="divide-y">
        {q.data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
            <CalendarClock className="text-muted-foreground mt-0.5 size-5" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{r.topic}</p>
              <p className="text-muted-foreground text-xs">
                {r.preferred_times.map(formatIsoDateTime).join(" · ")} · {r.duration_minutes} min{r.requester ? ` · asked by ${r.requester}` : ""}
              </p>
              {r.status === "declined" && r.decline_reason && (
                <p className="mt-1 text-xs">
                  <span className="font-medium">{r.decided_by_name ?? "Your team"}:</span> {r.decline_reason}
                </p>
              )}
              {r.status === "scheduled" && <p className="text-muted-foreground mt-1 text-xs">See the meeting below.</p>}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} label={REQUEST_STATUS[r.status]} />
              {r.status === "pending" && (r.requested_by === me?.id || company.role === "owner") && <WithdrawButton request={r} />}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MeetingsBody({ company }: { company: PortalCompany }) {
  const q = usePortalMeetings();
  const [requesting, setRequesting] = useState(false);
  return (
    <>
      <PageHeader
        title="Meetings"
        description="Calls with your accounting team."
        actions={<Button onClick={() => setRequesting(true)}><CalendarPlus className="size-4" /> Request a meeting</Button>}
      />
      <div className="space-y-6">
      <MeetingRequests company={company} />
      <Card title="Meetings">
        <ListBody query={q} empty={{ title: "No meetings scheduled", description: "Your team schedules review calls here. Need to talk? Request a meeting." }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((m) => {
                const upcoming = parseUtc(m.starts_at) > new Date();
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <CalendarClock className={upcoming ? "text-primary size-5" : "text-muted-foreground size-5"} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatMeetingTime(m.starts_at, m.ends_at)}{m.organiser ? ` · with ${m.organiser}` : ""}
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
      </div>
      <Dialog open={requesting} onOpenChange={setRequesting}>
        <DialogContent className="sm:max-w-lg">{requesting && <RequestMeetingForm onDone={() => setRequesting(false)} />}</DialogContent>
      </Dialog>
    </>
  );
}

export function ClientMeetings() {
  return <CompanyGate>{(company) => <MeetingsBody company={company} />}</CompanyGate>;
}
