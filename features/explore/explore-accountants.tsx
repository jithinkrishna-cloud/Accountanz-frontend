"use client";

import { CalendarDays, Check, Search, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyGate } from "@/features/client-portal/components/company-gate";
import { usePortalTeam } from "@/features/client-portal/hooks/use-client-portal";
import { ROLE_INFO } from "@/features/client-portal/components/portal-ui";
import type { PortalCompany } from "@/features/client-portal/types/client-portal.types";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  KIND_LABEL,
  STATUS_LABEL,
  type AccountantRequest,
  type ExploreAccountant,
  type RequestKind,
  useExploreAccountants,
  useMyAccountantRequests,
  useRequestAccountant,
  useWithdrawAccountantRequest,
} from "./explore";

const ROLE_FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "cfo", label: "CFOs" },
  { key: "finance_manager", label: "Finance managers" },
  { key: "bookkeeper", label: "Bookkeepers" },
] as const;

const roleLabel = (r: string) => ROLE_INFO[r]?.label ?? r.replaceAll("_", " ");
const sinceLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

function Avatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <span className={cn("bg-primary/15 text-primary ring-primary/25 grid shrink-0 place-content-center rounded-full font-semibold ring-1 ring-inset", large ? "size-16 text-lg" : "size-11 text-sm")}>
      {initials(name)}
    </span>
  );
}

/** Where things stand between this company and the accountant, in one line. */
function Relation({ a }: { a: ExploreAccountant }) {
  if (a.team_roles.length) {
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="size-3.5" aria-hidden /> On your team</span>;
  }
  if (a.pending_request_id) return <span className="text-xs text-amber-700">Requested · waiting for Accountanz</span>;
  return null;
}

function RequestForm({ a, onDone, onBack }: { a: ExploreAccountant; onDone: () => void; onBack: () => void }) {
  const send = useRequestAccountant();
  const team = usePortalTeam().data;
  const [kind, setKind] = useState<RequestKind>(a.team_roles.length ? "one_off" : "join_team");
  const [replaces, setReplaces] = useState<string>("");
  const [message, setMessage] = useState("");
  const [start, setStart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [replacesError, setReplacesError] = useState<string | null>(null);
  const first = a.full_name.split(" ")[0];
  // People this accountant could take over from: anyone on the team except themselves, in a role they don't already hold.
  const replaceable = (team ?? []).filter((m) => m.user_id !== a.id && !a.team_roles.includes(m.team_role));
  const replacing = kind === "replace";
  const replacedPerson = replaceable.find((m) => String(m.assignment_id) === replaces);

  const submit = async () => {
    setError(null);
    setReplacesError(null);
    if (replacing && !replaces) return setReplacesError("Choose who they should replace");
    try {
      await send.mutateAsync({
        accountantId: a.id,
        body: { kind, replaces_assignment_id: replacing ? Number(replaces) : null, message: message.trim(), preferred_start: start || null },
      });
      toast.success(replacing ? `Request to replace ${replacedPerson?.full_name ?? "a team member"} with ${first} sent to Accountanz` : `Request for ${first} sent to Accountanz`);
      onDone();
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      if (fe.message?.[0] || fe.replaces_assignment_id?.[0]) {
        setError(fe.message?.[0] ?? null);
        setReplacesError(fe.replaces_assignment_id?.[0] ?? null);
      } else applyApiError(err);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Request {a.full_name}</DialogTitle>
        <DialogDescription>Accountanz reviews every request and replies here and by email. Nothing changes until it&apos;s approved.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">What do you need?</legend>
          {(Object.keys(KIND_LABEL) as RequestKind[]).map((k) => {
            const disabled = (k === "join_team" && a.team_roles.length > 0) || (k === "replace" && !!team && replaceable.length === 0);
            return (
              <label
                key={k}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                  kind === k ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input type="radio" name="kind" className="accent-primary mt-0.5" checked={kind === k} disabled={disabled} onChange={() => setKind(k)} />
                <span>
                  <span className="block font-medium">{KIND_LABEL[k]}</span>
                  <span className="text-muted-foreground block text-xs">
                    {k === "join_team"
                      ? disabled
                        ? `${first} already works on your account.`
                        : `${first} works on your accounts every month.`
                      : k === "replace"
                        ? disabled
                          ? `There's nobody on your team ${first} could take over from.`
                          : `${first} takes over from someone on your team, in the same role.`
                        : `${first} helps with one task, like a year-end close or a GST notice.`}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        {replacing && (
          <FormField id="req-replaces" label="Who should they replace?" error={replacesError ?? undefined}>
            <Select value={replaces || undefined} onValueChange={(v) => { setReplaces(v); setReplacesError(null); }}>
              <SelectTrigger id="req-replaces" className="w-full" aria-invalid={!!replacesError}><SelectValue placeholder="Choose a team member" /></SelectTrigger>
              <SelectContent>
                {replaceable.map((m) => (
                  <SelectItem key={m.assignment_id} value={String(m.assignment_id)}>{m.full_name} · {roleLabel(m.team_role)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
        <FormField
          id="req-message"
          label={replacing ? "Why would you like a change?" : "Tell us about the work"}
          error={error ?? undefined}
          hint={replacing ? `Only Accountanz reads this. ${replacedPerson ? replacedPerson.full_name.split(" ")[0] : "The person being replaced"} is only told their assignment ended, not why.` : "What you'd like help with, and anything we should know."}
        >
          <Textarea
            id="req-message"
            rows={4}
            maxLength={2000}
            value={message}
            aria-invalid={!!error}
            placeholder={replacing ? `We'd like someone with more GST experience for our monthly returns.` : `We'd like ${first} to help with our monthly GST returns and bank reconciliation.`}
            onChange={(e) => setMessage(e.target.value)}
          />
        </FormField>
        <FormField id="req-start" label="Preferred start" hint="Optional">
          <Input id="req-start" type="date" value={start} min={new Date().toLocaleDateString("en-CA")} onChange={(e) => setStart(e.target.value)} className="w-48" />
        </FormField>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={send.isPending}>Back</Button>
        <SubmitButton pending={send.isPending} disabled={message.trim().length < 10 || (replacing && !replaces)} onClick={() => void submit()}>
          <Send className="size-4" aria-hidden /> Send request
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

/** One accountant's profile; owners can switch it into the request form. */
function ProfileDialog({ a, company, onClose }: { a: ExploreAccountant | null; company: PortalCompany; onClose: () => void }) {
  const [requesting, setRequesting] = useState(false);
  const close = () => {
    setRequesting(false);
    onClose();
  };
  const isOwner = company.role === "owner";
  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {a && requesting ? (
          <RequestForm a={a} onBack={() => setRequesting(false)} onDone={close} />
        ) : a ? (
          <>
            <DialogHeader className="items-center text-center sm:text-center">
              <Avatar name={a.full_name} large />
              <DialogTitle className="mt-2 text-lg">{a.full_name}</DialogTitle>
              <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">{roleLabel(a.role)}</span>
              <DialogDescription>{ROLE_INFO[a.role]?.does ?? "Accountant at Accountanz"}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 text-sm">
              <div>
                <h3 className="text-muted-foreground mb-2 text-xs">Expertise</h3>
                {a.expertise.length ? (
                  <ul className="flex flex-wrap gap-1.5">{a.expertise.map((e) => <li key={e} className="bg-muted rounded-full px-2.5 py-1 text-xs">{e}</li>)}</ul>
                ) : (
                  <p className="text-muted-foreground">Not listed yet.</p>
                )}
              </div>
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <CalendarDays className="size-3.5" aria-hidden /> With Accountanz since {sinceLabel(a.member_since)}
              </p>
              {a.team_roles.length > 0 && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                  Already on your team as {a.team_roles.map(roleLabel).join(" and ")}.
                </p>
              )}
              {a.pending_request_id && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">You&apos;ve asked for {a.full_name.split(" ")[0]}. Accountanz will reply soon.</p>
              )}
              {!isOwner && <p className="text-muted-foreground text-xs">Only your company owner can request an accountant.</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>Close</Button>
              {isOwner && !a.pending_request_id && (
                <Button onClick={() => setRequesting(true)}>
                  <Send className="size-4" aria-hidden /> {a.team_roles.length ? "Request extra work" : `Request ${a.full_name.split(" ")[0]}`}
                </Button>
              )}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_TONE: Record<AccountantRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  declined: "bg-red-50 text-red-800 ring-red-200",
  withdrawn: "bg-muted text-muted-foreground ring-border",
};

function MyRequests({ company }: { company: PortalCompany }) {
  const q = useMyAccountantRequests();
  const withdraw = useWithdrawAccountantRequest();
  if (!q.data?.length) return null;
  return (
    <section aria-labelledby="my-requests" className="bg-card rounded-xl border shadow-xs">
      <h2 id="my-requests" className="border-b px-5 py-4 font-medium">Your requests</h2>
      <ul className="divide-y">
        {q.data.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 text-sm">
              <p>
                <span className="font-medium">{r.accountant_name}</span>
                <span className="text-muted-foreground"> · {r.kind === "replace" && r.replaces_name ? `To replace ${r.replaces_name}` : KIND_LABEL[r.kind]}</span>
              </p>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{r.message}</p>
              {r.decision_note && <p className="mt-1 text-xs">Reply from {r.decided_by_name ?? "Accountanz"}: {r.decision_note}</p>}
              <p className="text-muted-foreground mt-0.5 text-xs">Asked {formatDate(r.created_at)}{r.requester_name ? ` by ${r.requester_name}` : ""}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs ring-1", STATUS_TONE[r.status])}>{STATUS_LABEL[r.status]}</span>
              {r.status === "pending" && company.role === "owner" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={withdraw.isPending}
                  onClick={() => withdraw.mutateAsync(r.id).then(() => toast.success("Request withdrawn"), (err) => applyApiError(err))}
                >
                  Withdraw
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExploreBody({ company }: { company: PortalCompany }) {
  const q = useExploreAccountants();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<(typeof ROLE_FILTERS)[number]["key"]>("all");
  const [openId, setOpenId] = useState<number | null>(null);

  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;

  const term = search.trim().toLowerCase();
  const shown = q.data.filter(
    (a) => (role === "all" || a.role === role) && (!term || a.full_name.toLowerCase().includes(term) || a.expertise.some((e) => e.toLowerCase().includes(term))),
  );
  const open = q.data.find((a) => a.id === openId) ?? null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or expertise" className="pl-9" aria-label="Search accountants" />
        </div>
        <div role="group" aria-label="Role" className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={role === f.key}
              onClick={() => setRole(f.key)}
              className={cn("rounded-full border px-3 py-1 text-sm transition-colors", role === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="bg-card rounded-xl border px-6 py-12 text-center text-sm">
          <p className="font-medium">No accountants match</p>
          <p className="text-muted-foreground mt-1">Try another name or expertise, or show everyone.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setOpenId(a.id)}
                className="bg-card hover:border-primary/40 focus-visible:ring-ring/50 flex h-full w-full flex-col gap-3 rounded-xl border p-4 text-left shadow-xs transition-colors outline-none focus-visible:ring-[3px]"
              >
                <span className="flex items-center gap-3">
                  <Avatar name={a.full_name} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.full_name}</span>
                    <span className="text-muted-foreground block text-xs">{roleLabel(a.role)}</span>
                  </span>
                </span>
                <span className="text-muted-foreground text-sm">{ROLE_INFO[a.role]?.does ?? "Accountant at Accountanz"}.</span>
                {a.expertise.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {a.expertise.slice(0, 3).map((e) => <span key={e} className="bg-muted rounded-full px-2 py-0.5 text-xs">{e}</span>)}
                    {a.expertise.length > 3 && <span className="text-muted-foreground text-xs">+{a.expertise.length - 3} more</span>}
                  </span>
                )}
                <span className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <Relation a={a} />
                  <span className="text-primary ml-auto text-sm font-medium">View profile</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <MyRequests company={company} />
      <ProfileDialog a={open} company={company} onClose={() => setOpenId(null)} />
    </div>
  );
}

export function ExploreAccountants() {
  return (
    <CompanyGate>
      {(company) => (
        <>
          <PageHeader title="Explore accountants" description="Meet the accountants at Accountanz. Ask for someone to join your team or to help with a piece of work." />
          <ExploreBody company={company} />
        </>
      )}
    </CompanyGate>
  );
}
