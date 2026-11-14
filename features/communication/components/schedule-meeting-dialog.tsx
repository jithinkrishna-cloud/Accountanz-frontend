"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/features/auth/hooks/use-session";
import { ClientPicker } from "@/features/workspace/components/client-picker";
import { useClientOverview } from "@/features/workspace/hooks/use-workspace";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { formatIsoDateTime, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffPortal } from "@/types/auth";
import { useScheduleMeeting, useScheduleRequest } from "../hooks/use-communication";
import type { MeetingRequest } from "../types/communication.types";

const DURATIONS = [15, 30, 45, 60, 90];

/** Local date (YYYY-MM-DD) and time (HH:MM) inputs for an ISO timestamp. */
const localParts = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

function MeetingForm({ portal, clientId: fixedClientId, request, onDone }: { portal: StaffPortal; clientId?: number; request?: MeetingRequest; onDone: () => void }) {
  const clientId = request?.client_id ?? fixedClientId;
  const firstSlot = request?.preferred_times[0] ? localParts(request.preferred_times[0]) : null;
  const schedule = useScheduleMeeting(portal);
  const scheduleRequest = useScheduleRequest(portal);
  const pending = schedule.isPending || scheduleRequest.isPending;
  const { data: me } = useSession();
  const [client, setClient] = useState(clientId ? String(clientId) : "");
  const overview = useClientOverview(client ? Number(client) : null, portal);
  const [title, setTitle] = useState(request?.topic ?? "");
  const [date, setDate] = useState(firstSlot?.date ?? "");
  const [time, setTime] = useState(firstSlot?.time ?? "10:00");
  const [duration, setDuration] = useState(String(request && DURATIONS.includes(request.duration_minutes) ? request.duration_minutes : 30));
  const [link, setLink] = useState("");
  const [inviteClient, setInviteClient] = useState(true);
  const [staff, setStaff] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const colleagues = (overview.data?.team ?? []).filter((m, i, all) => m.user_id !== me?.id && all.findIndex((x) => x.user_id === m.user_id) === i);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!client) next.client = "Choose a client";
    if (title.trim().length < 2) next.title = "Add a title";
    if (!date || !time) next.when = "Choose the date and time";
    const starts = new Date(`${date}T${time}`);
    if (!next.when && starts <= new Date()) next.when = "Choose a time in the future";
    if (!inviteClient && staff.length === 0) next.attendees = "Invite the client or a colleague";
    setErrors(next);
    if (Object.keys(next).length) return;
    const ends = new Date(starts.getTime() + Number(duration) * 60_000);
    try {
      const body = { client_id: Number(client), title: title.trim(), starts_at: starts.toISOString(), ends_at: ends.toISOString(), meeting_link: link.trim() || null, invite_client: inviteClient, staff_ids: staff };
      if (request) await scheduleRequest.mutateAsync({ id: request.id, body });
      else await schedule.mutateAsync(body);
      toast.success("Meeting scheduled. Invitations have been emailed.");
      onDone();
    } catch (err) {
      const message = applyApiError(err);
      if (err instanceof ApiError && err.fieldErrors.meeting_link) setErrors({ link: err.fieldErrors.meeting_link[0] ?? message });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{request ? `Schedule ${request.client_name}’s request` : "Schedule a meeting"}</DialogTitle>
        <DialogDescription>Invitees are emailed, and the meeting appears in the client portal under Meetings.</DialogDescription>
      </DialogHeader>
      <form id="meeting-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!clientId && (
          <FormField id="mt-client" label="Client" error={errors.client} className="sm:col-span-2">
            <ClientPicker portal={portal} id="mt-client" value={client} onChange={(v) => { setClient(v); setStaff([]); }} invalid={!!errors.client} />
          </FormField>
        )}
        {request && (
          <div className="bg-muted/50 grid gap-2 rounded-lg border p-3 text-sm sm:col-span-2">
            <p><span className="font-medium">{request.requester ?? "The client"}</span> suggested (pick one, or set another time below):</p>
            <div className="flex flex-wrap gap-2">
              {request.preferred_times.map((t) => {
                const p = localParts(t);
                const chosen = p.date === date && p.time === time;
                return (
                  <Button key={t} type="button" size="sm" variant={chosen ? "default" : "outline"} aria-pressed={chosen} onClick={() => { setDate(p.date); setTime(p.time); }} className={cn(chosen && "pointer-events-none")}>
                    {formatIsoDateTime(t)}
                  </Button>
                );
              })}
            </div>
            {request.notes && <p className="text-muted-foreground whitespace-pre-line">“{request.notes}”</p>}
          </div>
        )}
        <FormField id="mt-title" label="Title" error={errors.title} className="sm:col-span-2">
          <Input id="mt-title" placeholder="October books review" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
        </FormField>
        <FormField id="mt-date" label="Date" error={errors.when}>
          <Input id="mt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.when} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="mt-time" label="Start">
            <Input id="mt-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </FormField>
          <FormField id="mt-duration" label="Length">
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="mt-duration" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField id="mt-link" label="Meeting link" hint="Optional: Google Meet, Zoom or Teams." error={errors.link} className="sm:col-span-2">
          <Input id="mt-link" type="url" placeholder="https://meet.google.com/…" value={link} onChange={(e) => setLink(e.target.value)} />
        </FormField>
        <fieldset className="grid gap-2 sm:col-span-2">
          <legend className="mb-1 text-sm font-medium">Invite</legend>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={inviteClient} onCheckedChange={(c) => setInviteClient(c === true)} />
            The client&apos;s portal users{overview.data ? ` (${overview.data.contacts.length})` : ""}
          </Label>
          {colleagues.map((m) => (
            <Label key={m.user_id} className="flex items-center gap-2 font-normal">
              <Checkbox checked={staff.includes(m.user_id)} onCheckedChange={(c) => setStaff((s) => (c === true ? [...s, m.user_id] : s.filter((x) => x !== m.user_id)))} />
              {m.full_name} <span className="text-muted-foreground text-xs">· {humanize(m.team_role)}</span>
            </Label>
          ))}
          {errors.attendees && <p className="text-destructive text-xs">{errors.attendees}</p>}
        </fieldset>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="meeting-form" pending={pending}>Schedule</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function ScheduleMeetingDialog({ portal, clientId, request, open, onOpenChange }: { portal: StaffPortal; clientId?: number; request?: MeetingRequest; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <MeetingForm portal={portal} clientId={clientId} request={request} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
