"use client";

import { AlertCircle, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, CircleDot, Clock, FileUp, Minus, MessageSquare, Pencil, Plus, SearchCheck, Stamp, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeriod, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { usePortalApprovals, usePortalReports, usePortalRequests, usePortalTasks, usePortalTeam, useOwnTaskActions } from "../hooks/use-client-portal";
import type { PortalRequest, PortalTask } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";
import { NewTaskDialog } from "./new-task-dialog";

/**
 * Client view of the month's work, in plain language. Clients don't need the review workflow: four stages
 * (a returned task is simply still being worked on), what each job means, who's on it, and what's waiting on them.
 */
export const STAGES = [
  { label: "Not started", help: "Scheduled for this month. Your team hasn't begun yet.", pill: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground/40" },
  { label: "Working on it", help: "Your accountant is doing this job now.", pill: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30", dot: "bg-amber-400" },
  { label: "Being checked", help: "Finished, and a senior accountant is reviewing it before it's final.", pill: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30", dot: "bg-sky-500" },
  { label: "Done", help: "Checked and complete. Nothing more needed.", pill: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30", dot: "bg-emerald-500" },
] as const;

export const STAGE_OF: Record<PortalTask["status"], number> = { todo: 0, in_progress: 1, returned: 1, submitted: 2, approved: 3 };
/** How much of a job is done at each stage, for the month's progress percentage. */
export const STAGE_WEIGHT = [0, 0.4, 0.8, 1];

/** Plain-language meaning of the standard monthly jobs (used when the team hasn't written a description). */
const PLAIN: [RegExp, string][] = [
  [/bank reconcil/i, "We match every transaction in your bank statements with your books, so nothing is missing or counted twice."],
  [/sales register|sales invoice/i, "We record all of this month's sales invoices in your books."],
  [/purchase register|purchase bill/i, "We record all of this month's purchase bills in your books."],
  [/gst/i, "We check that the GST on your sales and purchases is correct and ready to file."],
  [/accrual/i, "We record income and expenses that belong to this month but haven't been billed yet."],
  [/tds/i, "We check the tax deducted at source on your payments and that it's been paid."],
  [/payroll|salary/i, "We record salaries and the statutory deductions on them."],
  [/fixed asset|depreciation/i, "We update your list of assets and this month's depreciation."],
  [/vendor|supplier/i, "We review what you owe your suppliers and flag anything unusual."],
  [/customer|debtor/i, "We review what your customers owe you and flag overdue amounts."],
  [/trial balance/i, "A final check that your books balance and nothing is parked in the wrong place."],
  [/management|mis|p&l/i, "We prepare your monthly profit & loss and balance sheet."],
];
const explain = (t: PortalTask) => t.description?.trim() || PLAIN.find(([re]) => re.test(t.title))?.[1] || null;

export const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const todayIso = () => new Date().toISOString().slice(0, 10);
export const isLate = (t: PortalTask) => STAGE_OF[t.status] < 2 && !!t.due_date && t.due_date < todayIso();
const firstName = (name: string) => name.split(" ")[0];

// ───────────── Small pieces ─────────────

export function StagePill({ stage, className }: { stage: number; className?: string }) {
  const s = STAGES[stage]!;
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", s.pill, className)}>{s.label}</span>;
}

/**
 * An accountant's name with their initials. With a userId of someone on the company's team, it links to their page on
 * My Accounting Team (onNavigate lets a sheet close first). Anyone no longer on the team is shown as plain text.
 */
function Person({ name, userId, onNavigate, size = "sm" }: { name: string | null; userId?: number | null; onNavigate?: () => void; size?: "sm" | "default" }) {
  const team = usePortalTeam();
  if (!name) return <span className="text-muted-foreground text-sm">Not assigned yet</span>;
  const body = (
    <>
      <Avatar size={size}>
        <AvatarFallback className="bg-primary/15 text-primary ring-primary/25 text-[10px] font-semibold ring-1 ring-inset">{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{name}</span>
    </>
  );
  const onTeam = !!userId && (team.data ?? []).some((m) => m.user_id === userId);
  if (!onTeam) return <span className="inline-flex items-center gap-2">{body}</span>;
  return (
    <Link href={`/app/team?member=${userId}`} onClick={onNavigate} className="group inline-flex items-center gap-2 rounded-md hover:underline" title={`See everything ${name.split(" ")[0]} does for you`}>
      {body}
      <ChevronRight className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </Link>
  );
}

function StageTracker({ stage }: { stage: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Stage ${stage + 1} of 4: ${STAGES[stage]!.label}`}>
      {STAGES.map((s, i) => {
        const complete = i < stage || stage === 3;
        return (
          <li key={s.label} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                complete ? "bg-emerald-500 text-white" : i === stage ? cn(s.dot, i === 0 ? "text-foreground" : "text-white") : "bg-muted text-muted-foreground",
              )}
              aria-hidden
            >
              {complete ? <Check className="size-3" /> : i + 1}
            </span>
            {i < STAGES.length - 1 && <span className={cn("h-0.5 w-4 rounded sm:w-6", i < stage ? "bg-emerald-500" : "bg-muted")} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

const stepCount = (t: PortalTask) => `${t.checklist.filter((c) => c.done).length}/${t.checklist.length}`;

// ───────────── Month overview ─────────────

/** Each job counts for its stage (not started 0, working 40%, being checked 80%, done 100%). */
const monthPercent = (tasks: PortalTask[]) =>
  tasks.length ? Math.round((tasks.reduce((n, t) => n + STAGE_WEIGHT[STAGE_OF[t.status]]!, 0) / tasks.length) * 100) : 0;

function ProgressRing({ percent }: { percent: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-24 shrink-0" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Month progress">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          className="stroke-emerald-500 transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-xl font-semibold tabular-nums">{percent}%</span>
        <span className="text-muted-foreground mt-1 text-[10px]">done</span>
      </span>
    </div>
  );
}

/** The month at a glance. The four counts double as filters for the job list. */
function MonthOverview({ period, tasks, filter, onFilter }: { period: string; tasks: PortalTask[]; filter: number | null; onFilter: (stage: number | null) => void }) {
  const counts = [0, 0, 0, 0];
  for (const t of tasks) counts[STAGE_OF[t.status]]! += 1;
  const done = counts[3]!;
  const nextTarget = tasks.filter((t) => STAGE_OF[t.status] < 3 && t.due_date).map((t) => t.due_date!).sort()[0];
  const lastTarget = tasks.map((t) => t.due_date).filter(Boolean).sort().at(-1);
  const late = tasks.filter(isLate).length;
  const headline =
    tasks.length === 0 ? "Nothing scheduled yet" : done === tasks.length ? "All done. Your books for this month are complete." : `${done} of ${tasks.length} jobs finished`;
  const sub =
    tasks.length === 0
      ? "Your team plans each month's jobs at the start of the month."
      : done === tasks.length
        ? "Every job has been checked. Nothing more is needed."
        : [nextTarget && `Next job due ${shortDate(nextTarget)}`, lastTarget && `everything planned by ${shortDate(lastTarget)}`].filter(Boolean).join(" · ") || "Your team is on it.";
  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-xs" aria-labelledby="month-heading">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <ProgressRing percent={monthPercent(tasks)} />
        <div className="min-w-0 flex-1">
          <p id="month-heading" className="text-muted-foreground text-sm">Your {formatPeriod(period)} books</p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight">{headline}</p>
          <p className="text-muted-foreground mt-1 text-sm">{sub}</p>
          {late > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <Clock className="size-3.5" aria-hidden /> {late} {late === 1 ? "job is" : "jobs are"} taking a little longer than planned
            </p>
          )}
        </div>
      </div>
      {tasks.length > 0 && (
        <div className="bg-border grid grid-cols-2 gap-px border-t sm:grid-cols-4">
          {STAGES.map((s, i) => {
            const active = filter === i;
            return (
              <button
                key={s.label}
                type="button"
                aria-pressed={active}
                title={active ? "Show all jobs" : `Show only jobs that are ${s.label.toLowerCase()}`}
                onClick={() => onFilter(active ? null : i)}
                className={cn(
                  "bg-card hover:bg-muted/50 focus-visible:bg-muted/50 flex items-center gap-3 px-4 py-3.5 text-left transition-colors focus-visible:outline-none sm:px-5",
                  active && "bg-muted hover:bg-muted",
                )}
              >
                <StageIcon stage={i} />
                <span className="min-w-0">
                  <span className="block text-lg leading-tight font-semibold tabular-nums">{counts[i]}</span>
                  <span className="text-muted-foreground block text-xs leading-tight">{s.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ───────────── Waiting on you ─────────────

/** Open document requests for a month (or with no month). These are what can hold the month's jobs up. */
const blockingRequests = (requests: PortalRequest[] | undefined, period: string) => (requests ?? []).filter((r) => r.status === "open" && (!r.period || r.period === period));

function WaitingOnYou({ period }: { period: string }) {
  const requests = usePortalRequests();
  const approvals = usePortalApprovals();
  const docs = blockingRequests(requests.data, period).length;
  const signoffs = (approvals.data ?? []).filter((a) => a.status === "pending").length;
  if (!docs && !signoffs) return null;
  const item = (icon: React.ReactNode, title: string, text: string, href: string, action: string) => (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300" aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{text}</p>
      </div>
      <Button asChild size="sm" className="shrink-0"><Link href={href}>{action}</Link></Button>
    </div>
  );
  return (
    <section aria-labelledby="waiting-heading">
      <h2 id="waiting-heading" className="mb-2 text-sm font-medium">Waiting on you</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {docs > 0 && item(<FileUp className="size-4" />, `${docs} document${docs === 1 ? "" : "s"} to upload`, `Some jobs can't finish until ${docs === 1 ? "it arrives" : "they arrive"}.`, "/app/requests", "Upload")}
        {signoffs > 0 && item(<Stamp className="size-4" />, `${signoffs} item${signoffs === 1 ? "" : "s"} to approve`, "Your team needs your sign-off to finish the month.", "/app/approvals", "Review")}
      </div>
    </section>
  );
}

// ───────────── Jobs ─────────────

const STAGE_ICON = [
  { icon: CircleDashed, tone: "bg-muted text-muted-foreground" },
  { icon: CircleDot, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { icon: SearchCheck, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
] as const;

function StageIcon({ stage, small }: { stage: number; small?: boolean }) {
  const { icon: Icon, tone } = STAGE_ICON[stage]!;
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full", small ? "size-6" : "size-9", tone)} aria-hidden>
      <Icon className={small ? "size-3.5" : "size-4.5"} />
    </span>
  );
}

function StepBar({ task }: { task: PortalTask }) {
  const done = task.checklist.filter((c) => c.done).length;
  const pct = Math.round((done / task.checklist.length) * 100);
  return (
    <span className="flex items-center gap-2" title={`${done} of ${task.checklist.length} steps done`}>
      <span className="bg-muted h-1.5 w-20 overflow-hidden rounded-full" aria-hidden>
        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">{done}/{task.checklist.length}</span>
    </span>
  );
}

function JobRow({ task, onOpen }: { task: PortalTask; onOpen: () => void }) {
  const stage = STAGE_OF[task.status];
  const meaning = explain(task);
  return (
    <li>
      <button type="button" onClick={onOpen} className="hover:bg-muted/40 focus-visible:bg-muted/40 group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors focus-visible:outline-none">
        <StageIcon stage={stage} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-medium">{task.title}</p>
            {!!task.created_by_client && <span className="bg-secondary text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px] font-medium">Added by you</span>}
            {isLate(task) && <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">Taking a little longer</span>}
          </div>
          {meaning && <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">{meaning}</p>}
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {task.handled_by && (
              <span className="inline-flex items-center gap-1.5">
                <Avatar size="sm"><AvatarFallback className="bg-primary/15 text-primary text-[9px] font-semibold">{initials(task.handled_by)}</AvatarFallback></Avatar>
                {task.handled_by}
              </span>
            )}
            {task.due_date && (
              <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{stage === 3 ? `Planned for ${shortDate(task.due_date)}` : `Due ${shortDate(task.due_date)}`}</span>
            )}
            {task.checklist.length > 0 && <span className="sm:hidden">{stepCount(task)} steps</span>}
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <StagePill stage={stage} />
          {task.checklist.length > 0 && <StepBar task={task} />}
        </div>
        <ChevronRight className="text-muted-foreground mt-2.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </button>
    </li>
  );
}

const GROUPS = [
  { title: "In progress", hint: "Your team is working on these, or checking them.", stages: [1, 2] },
  { title: "Coming up", hint: "Scheduled for this month. Not started yet.", stages: [0] },
  { title: "Done", hint: "Checked and complete.", stages: [3] },
] as const;

function JobGroup({ title, hint, tasks, onOpen, collapsible }: { title: string; hint: string; tasks: PortalTask[]; onOpen: (t: PortalTask) => void; collapsible?: boolean }) {
  const [shown, setShown] = useState(!collapsible);
  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <header className={cn("flex items-center justify-between gap-3 px-5 py-3", shown && "border-b")}>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-medium">{title} <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">{tasks.length}</span></h3>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
        {collapsible && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShown((s) => !s)} aria-expanded={shown}>
            {shown ? "Hide" : "Show"} <ChevronDown className={cn("size-4 transition-transform", shown && "rotate-180")} aria-hidden />
          </Button>
        )}
      </header>
      {shown && <ul className="divide-y">{tasks.map((t) => <JobRow key={t.id} task={t} onOpen={() => onOpen(t)} />)}</ul>}
    </section>
  );
}

function Jobs({ tasks, filter, onClearFilter, onOpen }: { tasks: PortalTask[]; filter: number | null; onClearFilter: () => void; onOpen: (t: PortalTask) => void }) {
  if (tasks.length === 0) {
    return <div className="bg-card rounded-xl border shadow-xs"><EmptyState title="No work scheduled for this month yet" description="Your team plans each month's jobs at the start of the month." /></div>;
  }
  if (filter !== null) {
    const items = tasks.filter((t) => STAGE_OF[t.status] === filter);
    const label = STAGES[filter]!.label;
    return (
      <div className="space-y-3">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          Showing jobs that are <span className="text-foreground font-medium">{label.toLowerCase()}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClearFilter}><X className="size-3.5" /> Show all</Button>
        </div>
        {items.length ? <JobGroup title={label} hint={STAGES[filter]!.help} tasks={items} onOpen={onOpen} /> : (
          <div className="bg-card text-muted-foreground rounded-xl border p-6 text-center text-sm">No jobs are {label.toLowerCase()} right now.</div>
        )}
      </div>
    );
  }
  const anyOpen = tasks.some((t) => STAGE_OF[t.status] < 3);
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const items = tasks.filter((t) => (g.stages as readonly number[]).includes(STAGE_OF[t.status]));
        if (!items.length) return null;
        // While work is still open, finished jobs fold away so the list leads with what's happening.
        return <JobGroup key={g.title} title={g.title} hint={g.hint} tasks={items} onOpen={onOpen} collapsible={g.title === "Done" && anyOpen} />;
      })}
    </div>
  );
}

// ───────────── Side column: the month's path and what the statuses mean ─────────────

type MilestoneState = "done" | "current" | "you" | "upcoming" | "skipped";

/**
 * The month as client-friendly milestones, worked out from what already exists: open document requests, the jobs'
 * stages, approvals waiting on the client, and reports published for the month.
 */
function MonthPath({ period, tasks }: { period: string; tasks: PortalTask[] }) {
  const requests = usePortalRequests().data;
  const approvals = usePortalApprovals().data;
  const reports = usePortalReports().data;
  const stages = tasks.map((t) => STAGE_OF[t.status]);
  const openDocs = blockingRequests(requests, period).length;
  const pendingApprovals = (approvals ?? []).filter((a) => a.status === "pending").length;
  // Approvals aren't tied to a period, so "this month's" are the ones asked for during it.
  const monthApprovals = (approvals ?? []).filter((a) => a.created_at.slice(0, 7) === period);
  const reportsReady = (reports ?? []).some((r) => r.period === period);
  const bookkeepingDone = stages.length > 0 && stages.every((s) => s >= 2);
  const reviewDone = stages.length > 0 && stages.every((s) => s === 3);

  const steps: { label: string; state: MilestoneState; note: string; href?: string }[] = [
    { label: "Documents received", state: openDocs ? "you" : "done", note: openDocs ? `Waiting for ${openDocs} from you` : "All received", href: openDocs ? "/app/requests" : undefined },
    {
      label: "Bookkeeping",
      state: bookkeepingDone ? "done" : stages.some((s) => s >= 1) ? "current" : "upcoming",
      note: bookkeepingDone ? "Done" : stages.some((s) => s >= 1) ? "In progress" : "Starting soon",
    },
    {
      label: "Review",
      state: reviewDone ? "done" : stages.some((s) => s === 2) ? "current" : "upcoming",
      note: reviewDone ? "Checked" : stages.some((s) => s === 2) ? "Being checked" : "After bookkeeping",
    },
    // Sign-off is only asked for when something needs it: tell "you approved" apart from "nothing was asked".
    pendingApprovals
      ? { label: "Your approval", state: "you", note: `${pendingApprovals} waiting for you`, href: "/app/approvals" }
      : monthApprovals.some((a) => a.status === "rejected") && !monthApprovals.some((a) => a.status === "approved")
        ? { label: "Your approval", state: "current", note: "Changes requested" }
        : monthApprovals.length
          ? { label: "Your approval", state: "done", note: "Approved" }
          : reviewDone
            ? { label: "Your approval", state: "skipped", note: "None needed" }
            : { label: "Your approval", state: "upcoming", note: "Only if something needs your sign-off" },
    { label: "Reports ready", state: reportsReady ? "done" : reviewDone ? "current" : "upcoming", note: reportsReady ? "Published" : reviewDone ? "Being prepared" : "At month end", href: reportsReady ? "/app/reports" : undefined },
  ];
  const dot: Record<MilestoneState, string> = {
    done: "bg-emerald-500 text-white",
    current: "border-2 border-sky-500 bg-card text-sky-600 dark:text-sky-400",
    you: "border-2 border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    upcoming: "border bg-card text-muted-foreground",
    skipped: "bg-muted text-muted-foreground",
  };
  return (
    <section className="bg-card rounded-xl border shadow-xs" aria-labelledby="path-heading">
      <header className="border-b px-5 py-3">
        <h3 id="path-heading" className="font-medium">How the month is going</h3>
        <p className="text-muted-foreground text-xs">The steps to close your {formatPeriod(period)} books.</p>
      </header>
      <ol className="px-5 py-4">
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span className={cn("absolute top-7 bottom-1 left-3 w-0.5 -translate-x-1/2 rounded", s.state === "done" || s.state === "skipped" ? "bg-emerald-500/60" : "bg-border")} aria-hidden />
            )}
            <span className={cn("relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", dot[s.state])} aria-hidden>
              {s.state === "done" ? <Check className="size-3.5" /> : s.state === "skipped" ? <Minus className="size-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm leading-tight font-medium">{s.label}</p>
              {s.href ? (
                <Link href={s.href} className={cn("text-xs hover:underline", s.state === "you" ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>{s.note}</Link>
              ) : (
                <p className="text-muted-foreground text-xs">{s.note}</p>
              )}
              <span className="sr-only">{s.state === "done" ? "done" : s.state === "skipped" ? "not needed" : s.state === "you" ? "waiting for you" : s.state === "current" ? "in progress" : "not started"}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StageGuide() {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <header className="border-b px-5 py-3"><h3 className="font-medium">What the statuses mean</h3></header>
      <ul className="grid gap-3 px-5 py-4 text-sm">
        {STAGES.map((s, i) => (
          <li key={s.label} className="flex gap-3">
            <StageIcon stage={i} small />
            <span><span className="font-medium">{s.label}</span><span className="text-muted-foreground block text-xs">{s.help}</span></span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground border-t px-5 py-3 text-xs">Your team also does some internal checks that aren&apos;t listed. You don&apos;t need to do anything unless something shows under &ldquo;Waiting on you&rdquo;.</p>
    </section>
  );
}

// ───────────── Job details panel ─────────────

/** A task's detail panel for the client: what it means, who's on it, its stage and steps. Also used on My Accounting Team. */
export function JobSheet({ task, period, onClose, isOwner, onEdit }: { task: PortalTask | null; period: string; onClose: () => void; isOwner: boolean; onEdit: (t: PortalTask) => void }) {
  const requests = usePortalRequests();
  const { remove } = useOwnTaskActions();
  const addedByClient = !!task?.created_by_client;
  const canChange = isOwner && addedByClient && task?.status === "todo";
  const deleteTask = async () => {
    if (!task || !window.confirm(`Delete the task "${task.title}"? Your team will no longer see it.`)) return;
    try {
      await remove.mutateAsync(task.id);
      toast.success("Task deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the task");
    }
  };
  const stage = task ? STAGE_OF[task.status] : 0;
  const blockers = task && stage < 2 ? blockingRequests(requests.data, period) : [];
  const done = task?.checklist.filter((c) => c.done).length ?? 0;
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {task && (
          <>
            <SheetHeader className="gap-1.5 border-b px-6 py-6 sm:px-8">
              <p className="text-muted-foreground text-xs">{formatPeriod(period)} / Tasks &amp; Progress</p>
              <SheetTitle className="pr-8 text-2xl">{task.title}</SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">{explain(task) ?? "Part of your monthly bookkeeping."}</SheetDescription>
            </SheetHeader>

            <div className="grid gap-8 px-6 py-7 sm:px-8">
              {addedByClient && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Added by you</p>
                    <p className="text-muted-foreground text-xs">
                      {canChange ? "You can change or delete it until your team starts working on it." : isOwner ? "Your team has started it, so it can't be changed now. Message them if something needs to change." : "Only the company owner can change it."}
                    </p>
                  </div>
                  {canChange && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(task)}><Pencil className="size-4" /> Edit</Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => void deleteTask()}><Trash2 className="size-4" /> Delete</Button>
                    </div>
                  )}
                </div>
              )}

              <dl className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-x-6 gap-y-5 text-sm">
                <dt className="text-muted-foreground">Due</dt>
                <dd>{task.due_date ? longDate(task.due_date) : "No date set"}</dd>
                <dt className="text-muted-foreground">Handled by</dt>
                <dd><Person name={task.handled_by} userId={task.assignee_id} onNavigate={onClose} /></dd>
                <dt className="text-muted-foreground">Checked by</dt>
                <dd><Person name={task.checked_by} userId={task.reviewer_id} onNavigate={onClose} /></dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <StagePill stage={stage} />
                  {isLate(task) && <span className="text-xs text-amber-700">taking a little longer than planned</span>}
                </dd>
              </dl>

              <div className="bg-muted/40 rounded-xl border p-5">
                <StageTracker stage={stage} />
                <p className="text-muted-foreground mt-3 text-sm">{STAGES[stage]!.help}</p>
              </div>

              {blockers.length > 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-800 dark:text-red-300">
                  <p className="flex items-center gap-1.5 font-medium"><AlertCircle className="size-4" aria-hidden /> Waiting on you</p>
                  <ul className="mt-2.5 list-disc space-y-1.5 pl-5">
                    {blockers.map((r) => <li key={r.id}>{r.description}{r.due_date ? ` (by ${shortDate(r.due_date)})` : ""}</li>)}
                  </ul>
                  <Button asChild size="sm" className="mt-4"><Link href="/app/requests"><FileUp className="size-4" /> Upload documents</Link></Button>
                </div>
              )}

              {task.checklist.length > 0 && (
                <section aria-labelledby="steps-heading">
                  <div className="flex items-baseline justify-between">
                    <h3 id="steps-heading" className="font-medium">Steps your team follows</h3>
                    <span className="text-muted-foreground text-sm tabular-nums">{done} of {task.checklist.length}</span>
                  </div>
                  <ul className="mt-4 grid gap-2.5">
                    {task.checklist.map((c, i) => (
                      <li key={i} className={cn("flex items-start gap-3 rounded-lg border px-4 py-3.5 text-sm", c.done && "bg-muted/40")}>
                        <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border", c.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40")} aria-hidden>
                          {c.done && <Check className="size-3" />}
                        </span>
                        <span className={cn(c.done && "text-muted-foreground line-through")}>{c.text}</span>
                        <span className="sr-only">{c.done ? "(done)" : "(not done yet)"}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <SheetFooter className="mt-auto flex-row items-center justify-between gap-4 border-t px-6 py-5 sm:px-8">
              <p className="text-muted-foreground text-xs">Questions about this job?</p>
              <Button asChild size="sm">
                <Link href={`/app/messages?${new URLSearchParams({ ...(task.assignee_id ? { to: String(task.assignee_id) } : {}), subject: `About: ${task.title}` })}`}>
                  <MessageSquare className="size-4" /> Message {task.handled_by ? firstName(task.handled_by) : "your team"}
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ───────────── Page ─────────────

/** Month picker with previous / next buttons. */
function MonthPicker({ value, periods, onChange }: { value: string; periods: string[]; onChange: (p: string) => void }) {
  const sorted = [...new Set([...periods, value])].sort();
  const i = sorted.indexOf(value);
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" disabled={i <= 0} onClick={() => onChange(sorted[i - 1]!)} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-36" aria-label="Month"><SelectValue /></SelectTrigger>
        <SelectContent>{[...sorted].reverse().map((p) => <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>)}</SelectContent>
      </Select>
      <Button type="button" variant="outline" size="icon" disabled={i >= sorted.length - 1} onClick={() => onChange(sorted[i + 1]!)} aria-label="Next month"><ChevronRight className="size-4" /></Button>
    </div>
  );
}

function ProgressBody({ isOwner }: { isOwner: boolean }) {
  // ?task=&period= (e.g. from a document request) opens that job straight away, in its month.
  const params = useSearchParams();
  const router = useRouter();
  const [period, setPeriodState] = useState<string | undefined>(() => params.get("period") ?? undefined);
  const [filter, setFilter] = useState<number | null>(null);
  const setPeriod = (p: string) => {
    setPeriodState(p);
    setFilter(null);
  };
  const [openId, setOpenId] = useState<number | null>(() => Number(params.get("task")) || null);
  const closeJob = () => {
    setOpenId(null);
    if (params.get("task")) router.replace("/app/progress", { scroll: false });
  };
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PortalTask | null>(null);
  const { data, isLoading, error, refetch } = usePortalTasks(period);
  // Late jobs first, then by due date.
  const tasks = [...(data?.tasks ?? [])].sort((a, b) => Number(isLate(b)) - Number(isLate(a)) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const open = tasks.find((t) => t.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Tasks & Progress"
        description="What your accounting team is doing on your books, and how far along it is."
        actions={
          <>
            {data && <MonthPicker value={data.period} periods={data.periods} onChange={setPeriod} />}
            {isOwner && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New task</Button>}
          </>
        }
      />
      {isOwner && <NewTaskDialog open={creating} onOpenChange={setCreating} onCreated={setPeriod} />}
      {isOwner && <NewTaskDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} onCreated={setPeriod} task={editing} />}
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-4"><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-72 w-full rounded-xl" /></div>
      ) : (
        <div className="space-y-6">
          <MonthOverview period={data.period} tasks={tasks} filter={filter} onFilter={setFilter} />
          <WaitingOnYou period={data.period} />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-3">
              <div>
                <h2 className="font-medium">Jobs this month</h2>
                <p className="text-muted-foreground text-xs">Click a job to see its steps, who&apos;s on it and when it&apos;s due.</p>
              </div>
              <Jobs tasks={tasks} filter={filter} onClearFilter={() => setFilter(null)} onOpen={(t) => setOpenId(t.id)} />
            </div>
            <aside className="space-y-4 lg:sticky lg:top-6">
              {tasks.length > 0 && <MonthPath period={data.period} tasks={tasks} />}
              <StageGuide />
            </aside>
          </div>
          <JobSheet task={open} period={data.period} onClose={closeJob} isOwner={isOwner} onEdit={(t) => setEditing(t)} />
        </div>
      )}
    </>
  );
}

export function ClientProgress() {
  return <CompanyGate>{(company) => <ProgressBody isOwner={company.role === "owner"} />}</CompanyGate>;
}
