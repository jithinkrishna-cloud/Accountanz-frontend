"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TEAM_ROLE_LABELS, TEAM_ROLES, type TeamRole } from "@/features/assignments/types/assignment.types";
import { KIND_LABEL, type AccountantRequest, type RequestStatus, useAdminAccountantRequests, useDecideAccountantRequest } from "./explore";

const FILTERS: { key: RequestStatus | "all"; label: string }[] = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
  { key: "withdrawn", label: "Withdrawn" },
  { key: "all", label: "All" },
];

const TONE: Record<RequestStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  declined: "bg-red-50 text-red-800 ring-red-200",
  withdrawn: "bg-muted text-muted-foreground ring-border",
};
const STATUS: Record<RequestStatus, string> = { pending: "Waiting", approved: "Approved", declined: "Declined", withdrawn: "Withdrawn" };

const todayIso = () => new Date().toLocaleDateString("en-CA");

/** One request: approve (and, by default, assign in the same step) or decline. Keyed per request so its form starts fresh. */
function ReviewBody({ r, onClose }: { r: AccountantRequest; onClose: () => void }) {
  const decide = useDecideAccountantRequest();
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<AccountantRequest | null>(null);
  // Assign in the same step: role starts at the accountant's own role, start at the client's preferred date (or today).
  // A replacement is always approved by handing over: same role as the person being replaced, starting today
  // (the old assignment ends today), and their JournL permissions carry over.
  const isReplace = r.kind === "replace";
  const [assign, setAssign] = useState(true);
  const [role, setRole] = useState<TeamRole | "">(
    isReplace && r.replaces_role ? (r.replaces_role as TeamRole) : (TEAM_ROLES as readonly string[]).includes(r.accountant_role) ? (r.accountant_role as TeamRole) : "",
  );
  const [from, setFrom] = useState(!isReplace && r.preferred_start && r.preferred_start > todayIso() ? r.preferred_start : todayIso());
  const [to, setTo] = useState("");

  const act = async (decision: "approved" | "declined") => {
    const withAssign = decision === "approved" && (assign || isReplace);
    if (withAssign && !role) return setErrors({ team_role: "Choose a team role" });
    setErrors({});
    try {
      const updated = await decide.mutateAsync({
        id: r.id,
        decision,
        note: note.trim() || null,
        assign: withAssign ? { team_role: role, valid_from: from, valid_to: to || null } : null,
      });
      toast.success(
        decision === "declined"
          ? "Request declined"
          : isReplace
            ? `${r.accountant_name} has taken over from ${r.replaces_name ?? "the previous team member"}`
            : withAssign
              ? `Approved and ${r.accountant_name} assigned`
              : "Request approved",
      );
      if (decision === "approved") setDone(updated);
      else onClose();
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(fe)) if (v?.[0]) mapped[k.replace(/^assign\./, "")] = v[0];
      if (Object.keys(mapped).length) setErrors(mapped);
      else applyApiError(err);
    }
  };

  if (done) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{done.assignment_id ? (isReplace ? `${done.accountant_name} has taken over` : `${done.accountant_name} is assigned`) : "Approved"}</DialogTitle>
          <DialogDescription>
            {done.assignment_id
              ? isReplace
                ? `${done.accountant_name} replaces ${r.replaces_name ?? "the previous team member"} as ${TEAM_ROLE_LABELS[role as TeamRole]?.toLowerCase() ?? "team member"} on ${done.client_name} from ${formatDate(from)}, with the same JournL permissions. ${done.client_name} has been told, and ${r.replaces_name?.split(" ")[0] ?? "the previous team member"} was told only that their assignment ended.`
                : `${done.accountant_name} now works on ${done.client_name} from ${formatDate(from)}. ${done.client_name} has been told.`
              : `${done.client_name} has been told. Assign ${done.accountant_name} when you're ready.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
          <Button asChild>
            <Link href={`/admin/assignments?clientId=${done.client_id}`}>{done.assignment_id ? "View assignments" : "Create assignment"}</Link>
          </Button>
        </DialogFooter>
      </>
    );
  }

  const pending = r.status === "pending";
  return (
    <>
      <DialogHeader>
        <DialogTitle>{isReplace ? `${r.client_name} wants ${r.accountant_name} to replace ${r.replaces_name ?? "a team member"}` : `${r.client_name} asked for ${r.accountant_name}`}</DialogTitle>
        <DialogDescription>{KIND_LABEL[r.kind]}{r.preferred_start ? ` · from ${formatDate(r.preferred_start)}` : ""}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 text-sm">
        <div>
          {isReplace && <p className="text-muted-foreground mb-1 text-xs">Their reason. Only Accountanz sees this.</p>}
          <blockquote className="bg-muted/50 rounded-lg border-l-4 px-4 py-3 whitespace-pre-line">{r.message}</blockquote>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div><dt className="text-muted-foreground">{isReplace ? "New accountant" : "Accountant"}</dt><dd className="mt-0.5 text-sm">{r.accountant_name} · {humanize(r.accountant_role)}</dd></div>
          {isReplace && <div><dt className="text-muted-foreground">Replacing</dt><dd className="mt-0.5 text-sm">{r.replaces_name ?? "No longer on the team"}{r.replaces_role ? ` · ${TEAM_ROLE_LABELS[r.replaces_role as TeamRole] ?? humanize(r.replaces_role)}` : ""}</dd></div>}
          <div><dt className="text-muted-foreground">Asked by</dt><dd className="mt-0.5 text-sm">{r.requester_name ?? "—"} on {formatDate(r.created_at)}</dd></div>
        </dl>
        {pending && isReplace ? (
          <>
            <section className="border-primary/40 bg-primary/5 rounded-lg border p-3" aria-label="Hand over">
              <p className="font-medium">Approve and hand over</p>
              <ul className="text-muted-foreground mt-1 list-disc space-y-0.5 pl-5 text-xs">
                <li>{r.replaces_name ?? "The current team member"}&apos;s assignment ends today.</li>
                <li>{r.accountant_name} starts as {TEAM_ROLE_LABELS[role as TeamRole]?.toLowerCase() ?? "the same role"}, with the same JournL access and feature permissions.</li>
                <li>{r.replaces_name?.split(" ")[0] ?? "They"} {r.replaces_name ? "is" : "are"} only told their assignment ended, not why.</li>
              </ul>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FormField id="assign-from" label="Starts" error={errors.valid_from}>
                  <Input id="assign-from" type="date" value={from} min={todayIso()} onChange={(e) => setFrom(e.target.value)} />
                </FormField>
                <FormField id="assign-to" label="Ends" hint="Optional" error={errors.valid_to}>
                  <Input id="assign-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                </FormField>
              </div>
              {(errors.user_id || errors.client_id || errors.team_role) && <p className="text-destructive mt-2 text-xs" role="alert">{errors.user_id ?? errors.client_id ?? errors.team_role}</p>}
            </section>
            <FormField id="decision-note" label="Reply to the client" hint="Shown to the client. Required when you decline." error={errors.note}>
              <Textarea
                id="decision-note"
                rows={3}
                maxLength={1000}
                value={note}
                aria-invalid={!!errors.note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setErrors((x) => ({ ...x, note: "" }));
                }}
                placeholder={`${r.accountant_name.split(" ")[0]} takes over from ${formatDate(from)}.`}
              />
            </FormField>
          </>
        ) : pending ? (
          <>
            <section className={cn("rounded-lg border p-3", assign && "border-primary/40 bg-primary/5")} aria-label="Assign">
              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox checked={assign} onCheckedChange={(v) => setAssign(v === true)} className="mt-0.5" />
                <span>
                  <span className="block font-medium">Also assign {r.accountant_name} to {r.client_name}</span>
                  <span className="text-muted-foreground block text-xs">Creates the assignment when you approve. You can change it later in Assignments.</span>
                </span>
              </label>
              {assign && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <FormField id="assign-role" label="Team role" error={errors.team_role}>
                    <Select value={role || undefined} onValueChange={(v) => setRole(v as TeamRole)}>
                      <SelectTrigger id="assign-role" className="w-full" aria-invalid={!!errors.team_role}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{TEAM_ROLES.map((t) => <SelectItem key={t} value={t}>{TEAM_ROLE_LABELS[t]}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField id="assign-from" label="Starts" error={errors.valid_from}>
                    <Input id="assign-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </FormField>
                  <FormField id="assign-to" label="Ends" hint={r.kind === "one_off" ? "One-off: set an end" : "Optional"} error={errors.valid_to}>
                    <Input id="assign-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                  </FormField>
                </div>
              )}
              {(errors.user_id || errors.client_id) && <p className="text-destructive mt-2 text-xs" role="alert">{errors.user_id ?? errors.client_id}</p>}
            </section>
            <FormField id="decision-note" label="Reply to the client" hint="Shown to the client. Required when you decline." error={errors.note}>
              <Textarea
                id="decision-note"
                rows={3}
                maxLength={1000}
                value={note}
                aria-invalid={!!errors.note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setErrors((x) => ({ ...x, note: "" }));
                }}
                placeholder={`${r.accountant_name.split(" ")[0]} starts on ${formatDate(from)}.`}
              />
            </FormField>
          </>
        ) : (
          <p className="text-muted-foreground">
            {STATUS[r.status]}{r.decided_by_name ? ` by ${r.decided_by_name}` : ""}{r.decided_at ? ` on ${formatDate(r.decided_at)}` : ""}.
            {r.decision_note && <span className="text-foreground mt-1 block">“{r.decision_note}”</span>}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
        {pending && (
          <>
            <SubmitButton variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" pending={decide.isPending && decide.variables?.decision === "declined"} onClick={() => void act("declined")}>Decline</SubmitButton>
            <SubmitButton pending={decide.isPending && decide.variables?.decision === "approved"} onClick={() => void act("approved")}>{isReplace ? "Approve and hand over" : assign ? "Approve and assign" : "Approve"}</SubmitButton>
          </>
        )}
      </DialogFooter>
    </>
  );
}

function ReviewDialog({ r, onClose }: { r: AccountantRequest | null; onClose: () => void }) {
  return (
    <Dialog open={!!r} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">{r && <ReviewBody key={r.id} r={r} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

/** Admin → Accountant Requests: clients asking for a specific accountant from the portal's Explore section. */
export function AdminAccountantRequests() {
  const [filter, setFilter] = useState<RequestStatus | "all">("pending");
  const q = useAdminAccountantRequests(filter === "all" ? undefined : filter);
  const [open, setOpen] = useState<AccountantRequest | null>(null);

  return (
    <>
      <PageHeader title="Accountant Requests" description="Clients asking for a specific accountant from Explore in their portal." />
      <div role="group" aria-label="Status" className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn("rounded-full border px-3 py-1 text-sm transition-colors", filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {f.label}
          </button>
        ))}
      </div>
      {q.error ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : q.data.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-xl border px-6 py-12 text-center text-sm">
          {filter === "pending" ? "No requests waiting. Clients can ask for an accountant from Explore in their portal." : "Nothing here yet."}
        </div>
      ) : (
        <ul className="bg-card divide-y rounded-xl border shadow-xs">
          {q.data.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r)} className="hover:bg-muted/40 grid w-full gap-1 px-5 py-3 text-left text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="min-w-0">
                  <span className="block">
                    <span className="font-medium">{r.client_name}</span> asked for <span className="font-medium">{r.accountant_name}</span>
                    <span className="text-muted-foreground"> · {r.kind === "replace" ? `to replace ${r.replaces_name ?? "a team member"}` : KIND_LABEL[r.kind]}</span>
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">{r.message}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">{formatDate(r.created_at)}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs ring-1", TONE[r.status])}>{STATUS[r.status]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ReviewDialog r={open} onClose={() => setOpen(null)} />
    </>
  );
}
