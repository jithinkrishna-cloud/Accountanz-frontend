"use client";

import { ArrowRight, BriefcaseBusiness, CheckCircle2, Eye, MessageSquare, SearchCheck } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_INFO } from "@/features/client-portal/components/portal-ui";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useExploreProfile, type ExploreAccountant, type ExploreProfile } from "./explore";

/** What each role usually takes care of for a company (shown on the profile, in plain language). */
const ROLE_WORK: Record<string, string[]> = {
  bookkeeper: ["Records your sales, purchases and expenses", "Reconciles your bank accounts every month", "Prepares GST, TDS and payroll entries", "Asks you for missing documents"],
  finance_manager: ["Reviews every month's books before they're final", "Checks GST and statutory figures", "Closes your month once everything is right", "Approves the reports you receive"],
  reviewer: ["Reviews every month's books before they're final", "Checks GST and statutory figures", "Sends work back when something needs fixing"],
  cfo: ["Oversees all the work on your account", "Explains your numbers and trends", "Advises on cash flow, tax planning and growth", "Leads quarterly review calls"],
};

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const monthYear = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const roleLabel = (r: string) => ROLE_INFO[r]?.label ?? r.replaceAll("_", " ");
const PART_LABEL = { did: "Done", checked: "Checked", oversaw: "Overseen" } as const;

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-muted-foreground mb-2 text-xs font-medium">{children}</h3>;
}

function Tile({ label, value, hint, warn }: { label: string; value: React.ReactNode; hint?: string; warn?: boolean }) {
  return (
    <div className="bg-muted/40 rounded-lg border px-3 py-2.5">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", warn && "text-amber-700 dark:text-amber-400")}>{value}</p>
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

/** What a person in this role does for a company. */
export function RoleWork({ role }: { role: string }) {
  const items = ROLE_WORK[role];
  if (!items) return null;
  const label = roleLabel(role);
  return (
    <div>
      {/* Acronyms like CFO keep their capitals. */}
      <Heading>What a {label === label.toUpperCase() ? label : label.toLowerCase()} does for you</Heading>
      <ul className="grid gap-1.5">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2">
            <CheckCircle2 className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkingWithYou({ a, w }: { a: ExploreAccountant; w: NonNullable<ExploreProfile["with_you"]> }) {
  const first = a.full_name.split(" ")[0];
  const onTeam = a.team_roles.length > 0;
  const past = w.assignments.filter((x) => !x.current);
  return (
    <section className="grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-medium"><BriefcaseBusiness className="size-4" aria-hidden /> Working with you</h3>
        {w.since && <span className="text-muted-foreground text-xs">{onTeam ? "On your team since" : "Worked with you from"} {monthYear(w.since)}</span>}
      </div>
      {w.oversees && <p className="text-muted-foreground text-xs">As your CFO, {first} oversees all the work on your account, so these numbers cover every task.</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Done for you" value={w.done_total} hint="tasks, all time" />
        <Tile label={`This month`} value={w.month_total ? `${w.month_done}/${w.month_total}` : "—"} hint={w.month_total ? "approved" : "no tasks"} />
        <Tile label="In progress" value={w.open_now} hint="right now" />
        <Tile label="Being checked" value={w.waiting_review} hint="with a reviewer" />
      </div>
      {w.open_requests > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {first} is waiting for {w.open_requests} document {w.open_requests === 1 ? "request" : "requests"} from you. <Link href="/app/requests" className="font-medium underline">Open requests</Link>
        </p>
      )}

      {w.recent.length > 0 && (
        <div>
          <Heading>Recently finished</Heading>
          <ul className="divide-y rounded-lg border">
            {w.recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span className="min-w-0 truncate"><span className="font-medium">{t.title}</span> <span className="text-muted-foreground">· {formatPeriod(t.period)}</span></span>
                <span className="text-muted-foreground shrink-0">{PART_LABEL[t.part]}{t.finished_on ? ` ${dateLabel(t.finished_on)}` : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <Heading>Earlier roles with you</Heading>
          <ul className="text-muted-foreground grid gap-1 text-xs">
            {past.map((x, i) => (
              <li key={i}>{roleLabel(x.team_role)} · {dateLabel(x.valid_from)} – {x.valid_to ? dateLabel(x.valid_to) : "ended"}</li>
            ))}
          </ul>
        </div>
      )}

      {onTeam && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/app/team?member=${a.id}`} className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline">
            <Eye className="size-3.5" aria-hidden /> See everything {first} does for you <ArrowRight className="size-3" aria-hidden />
          </Link>
          <Link href={`/app/messages?${new URLSearchParams({ to: String(a.id) })}`} className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline">
            <MessageSquare className="size-3.5" aria-hidden /> Message {first}
          </Link>
        </div>
      )}
    </section>
  );
}

/** The richer part of the profile: what the role covers, and this accountant's work for the company (if any). */
export function AccountantProfileDetails({ a }: { a: ExploreAccountant }) {
  const q = useExploreProfile(a.id);
  return (
    <>
      <RoleWork role={a.role} />
      {q.isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : q.data?.with_you ? (
        <WorkingWithYou a={a} w={q.data.with_you} />
      ) : q.data ? (
        <p className="bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
          <SearchCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {a.full_name.split(" ")[0]} hasn&apos;t worked on your account yet. Request them below; Accountanz checks they&apos;re a good fit and confirms the change with you before anything starts.
        </p>
      ) : null}
    </>
  );
}
