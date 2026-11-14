"use client";

import { CalendarCheck, CalendarPlus, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/hooks/use-session";
import { useStaffClientOptions } from "@/features/workspace/hooks/use-workspace";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import type { StaffPortal } from "@/types/auth";
import { useCancelMeeting, useDeclineRequest, useMeetings, usePendingMeetingRequests } from "../hooks/use-communication";
import { formatIsoDateTime, formatLocalDateTime, formatMeetingTime, parseUtc } from "@/lib/format";
import type { Meeting, MeetingRequest } from "../types/communication.types";
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog";


function CancelButton({ portal, meeting }: { portal: StaffPortal; meeting: Meeting }) {
  const cancel = useCancelMeeting(portal);
  const run = async () => {
    try {
      await cancel.mutateAsync(meeting.id);
      toast.success(`${meeting.title} cancelled`);
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Button variant="ghost" size="sm" disabled={cancel.isPending} onClick={() => void run()} aria-label={`Cancel ${meeting.title}`}>
      <X className="size-4" /> Cancel
    </Button>
  );
}

function DeclineDialog({ portal, request, onClose }: { portal: StaffPortal; request: MeetingRequest | null; onClose: () => void }) {
  const decline = useDeclineRequest(portal);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (reason.trim().length < 2) return setError("Tell the client why, or suggest another way");
    try {
      await decline.mutateAsync({ id: request.id, reason: reason.trim() });
      toast.success("Request declined. The client has been emailed your reason.");
      setReason("");
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline meeting request</DialogTitle>
          <DialogDescription>{request ? `${request.client_name}: ${request.topic}. ` : ""}The client sees your reason in their portal and by email.</DialogDescription>
        </DialogHeader>
        <form id="decline-request-form" onSubmit={submit} noValidate>
          <FormField id="decline-reason" label="Reason" error={error}>
            <Textarea id="decline-reason" rows={3} placeholder="We can answer this by message. I've replied in Messages." value={reason} onChange={(e) => { setReason(e.target.value); setError(undefined); }} maxLength={500} aria-invalid={!!error} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton form="decline-request-form" variant="destructive" pending={decline.isPending}>Decline</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Clients' pending meeting requests (scoped to the clients this person works on). Hidden when there are none. */
function MeetingRequestsPanel({ portal, clientId, onSchedule, onDecline }: { portal: StaffPortal; clientId?: string; onSchedule: (r: MeetingRequest) => void; onDecline: (r: MeetingRequest) => void }) {
  const requests = usePendingMeetingRequests(portal, clientId);
  const rows = requests.data?.items ?? [];
  if (rows.length === 0) return null;
  return (
    <section className="bg-card mb-6 rounded-xl border shadow-xs" aria-labelledby="meeting-requests-heading">
      <header className="flex items-center gap-2 border-b px-5 py-4">
        <h2 id="meeting-requests-heading" className="font-medium">Meeting requests</h2>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 ring-inset">{requests.data?.total} waiting</span>
      </header>
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{r.topic}</p>
              <p className="text-muted-foreground text-xs">
                {r.client_name}{r.requester ? ` · ${r.requester}` : ""} · asked {formatLocalDateTime(r.created_at)} · {r.duration_minutes} min
              </p>
              <p className="mt-1 text-xs"><span className="text-muted-foreground">Suggested:</span> {r.preferred_times.map(formatIsoDateTime).join(" · ")}</p>
              {r.notes && <p className="text-muted-foreground mt-1 line-clamp-2 text-xs whitespace-pre-line">{r.notes}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onSchedule(r)}><CalendarCheck className="size-4" /> Schedule</Button>
              <Button size="sm" variant="outline" onClick={() => onDecline(r)}>Decline</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StaffMeetings({ portal }: { portal: StaffPortal }) {
  const clients = useStaffClientOptions(portal);
  const { data: me } = useSession();
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [clientId, setClientId] = useState<string>();
  const [page, setPage] = useState(1);
  const [scheduling, setScheduling] = useState(false);
  const [fromRequest, setFromRequest] = useState<MeetingRequest>();
  const [declining, setDeclining] = useState<MeetingRequest | null>(null);
  const meetings = useMeetings(portal, { when, client_id: clientId, page });

  const columns: Column<Meeting>[] = [
    {
      key: "title",
      header: "Meeting",
      cell: (m) => (
        <div className="min-w-0">
          <p className="font-medium">{m.title}</p>
          <p className="text-muted-foreground text-xs">{formatMeetingTime(m.starts_at, m.ends_at)}</p>
        </div>
      ),
    },
    { key: "client", header: "Client", cell: (m) => m.client_name },
    { key: "organiser", header: "Organiser", hideOnMobile: true, cell: (m) => <span className="text-muted-foreground">{m.organiser ?? "—"}</span> },
    { key: "attendees", header: "Invited", hideOnMobile: true, cell: (m) => <span className="text-muted-foreground line-clamp-2 max-w-xs text-xs">{m.attendees ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      cell: (m) => (
        <div className="flex justify-end gap-1">
          {m.meeting_link && when === "upcoming" && (
            <Button variant="outline" size="sm" asChild>
              <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Join</a>
            </Button>
          )}
          {when === "upcoming" && (m.organiser_id === me?.id || portal === "admin") && parseUtc(m.starts_at) > new Date() && <CancelButton portal={portal} meeting={m} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Meetings"
        description="Meetings with clients. Clients see them in their portal."
        actions={<Button onClick={() => { setFromRequest(undefined); setScheduling(true); }}><CalendarPlus className="size-4" /> Schedule meeting</Button>}
      />
      <MeetingRequestsPanel portal={portal} clientId={clientId} onSchedule={(r) => { setFromRequest(r); setScheduling(true); }} onDecline={setDeclining} />
      <section className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col flex-wrap gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div role="tablist" aria-label="When" className="bg-muted inline-grid grid-cols-2 rounded-lg p-1 text-sm">
            {(["upcoming", "past"] as const).map((w) => (
              <button
                key={w}
                role="tab"
                type="button"
                aria-selected={when === w}
                onClick={() => { setWhen(w); setPage(1); }}
                className={cn("rounded-md px-4 py-1.5 font-medium capitalize", when === w ? "bg-card shadow-xs" : "text-muted-foreground")}
              >
                {w}
              </button>
            ))}
          </div>
          <FilterSelect allLabel="All clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1); }} options={clients.data ?? []} />
        </div>
        <DataTable
          columns={columns}
          rows={meetings.data?.items}
          rowKey={(m) => m.id}
          isLoading={meetings.isLoading}
          error={meetings.error}
          onRetry={() => void meetings.refetch()}
          empty={{ title: when === "upcoming" ? "No upcoming meetings" : "No past meetings", description: when === "upcoming" ? "Schedule one with a client." : undefined }}
          pagination={meetings.data && { ...meetings.data, onPageChange: setPage }}
        />
      </section>
      <ScheduleMeetingDialog portal={portal} request={fromRequest} open={scheduling} onOpenChange={setScheduling} />
      <DeclineDialog portal={portal} request={declining} onClose={() => setDeclining(null)} />
    </>
  );
}
