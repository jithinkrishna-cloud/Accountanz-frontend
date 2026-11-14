"use client";

import { AlertCircle, CalendarDays, Check, ChevronDown, FileUp, Kanban, List, ListChecks, MessageSquare, Stamp } from "lucide-react";
import Link from "next/link";
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
import { usePortalApprovals, usePortalRequests, usePortalTasks } from "../hooks/use-client-portal";
import type { PortalRequest, PortalTask } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";

/**
 * Client view of the month's work, in plain language. Clients don't need the review workflow: four stages
 * (a returned task is simply still being worked on), what each job means, who's on it, and what's waiting on them.
 */
export const STAGES = [
  { label: "Not started", help: "Scheduled for this month. Your team hasn't begun yet.", pill: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground/40" },
  { label: "Working on it", help: "Your accountant is doing this job now.", pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-400" },
  { label: "Being checked", help: "Finished, and a senior accountant is reviewing it before it's final.", pill: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  { label: "Done", help: "Checked and complete. Nothing more needed.", pill: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
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

function Person({ name, size = "sm" }: { name: string | null; size?: "sm" | "default" }) {
  if (!name) return <span className="text-muted-foreground text-sm">Not assigned yet</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar size={size}>
        <AvatarFallback className="bg-primary/15 text-primary ring-primary/25 text-[10px] font-semibold ring-1 ring-inset">{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{name}</span>
    </span>
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

// ───────────── Month summary and "waiting on you" ─────────────

function MonthSummary({ period, tasks }: { period: string; tasks: PortalTask[] }) {
  const counts = [0, 0, 0, 0];
  for (const t of tasks) counts[STAGE_OF[t.status]]! += 1;
  const done = counts[3]!;
  const nextTarget = tasks.filter((t) => STAGE_OF[t.status] < 3 && t.due_date).map((t) => t.due_date!).sort()[0];
  const lastTarget = tasks.map((t) => t.due_date).filter(Boolean).sort().at(-1);
  const headline =
    tasks.length === 0 ? "Nothing scheduled yet" : done === tasks.length ? "All done. Your books for this month are complete." : `${done} of ${tasks.length} jobs finished`;
  // How far the month is: each job counts for its stage (not started 0, working 40%, being checked 80%, done 100%).
  const percent = tasks.length ? Math.round((tasks.reduce((n, t) => n + STAGE_WEIGHT[STAGE_OF[t.status]]!, 0) / tasks.length) * 100) : 0;
  const ordered = [...tasks].sort((a, b) => STAGE_OF[b.status] - STAGE_OF[a.status]);
  // Same order as the dots: done first.
  const breakdown = STAGES.map((s, i) => (counts[i] ? `${counts[i]} ${s.label.toLowerCase()}` : null)).filter(Boolean).reverse().join(" · ");
  return (
    <section className="bg-card rounded-xl border shadow-xs" aria-labelledby="month-heading">
      <div className="px-5 pt-5 pb-4 sm:px-6">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase" id="month-heading">Your {formatPeriod(period)} books</p>
        <p className="mt-1 text-lg font-semibold">{headline}</p>
        {done < tasks.length && (
          <p className="text-muted-foreground mt-0.5 text-sm">
            {nextTarget ? `Next job due ${shortDate(nextTarget)}` : "Your team is on it"}
            {lastTarget ? ` · everything planned to finish by ${shortDate(lastTarget)}` : ""}.
          </p>
        )}
      </div>
      {tasks.length > 0 && (
        <div className="border-t px-5 py-4 sm:px-6">
          <div className="flex items-baseline justify-between">
            <p className="text-xs tracking-wide uppercase"><span className="text-muted-foreground">Month</span> <span className="font-semibold">progress</span></p>
            <p className="text-lg font-semibold tabular-nums">{percent}%</p>
          </div>
          <div
            className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Month progress"
          >
            <div className={cn("h-full rounded-full transition-[width] duration-500", percent === 100 ? "bg-emerald-500" : "from-primary bg-linear-to-r to-emerald-500")} style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">Jobs</span>
            <ol className="flex items-center" aria-hidden>
              {ordered.map((t, i) => {
                const stage = STAGE_OF[t.status];
                return (
                  <li key={t.id} className="flex items-center">
                    {i > 0 && <span className={cn("h-px w-3", stage === 3 ? "bg-emerald-300" : "bg-border")} />}
                    <span
                      title={`${t.title}: ${STAGES[stage]!.label}`}
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full",
                        stage === 3 ? "bg-emerald-500 text-white" : stage === 0 ? "border-border border bg-white" : cn("border-2 bg-white", stage === 1 ? "border-amber-400" : "border-sky-500"),
                      )}
                    >
                      {stage === 3 && <Check className="size-2.5" />}
                    </span>
                  </li>
                );
              })}
            </ol>
            <span className="text-muted-foreground text-xs">{done === tasks.length ? "All finished" : breakdown}</span>
          </div>
        </div>
      )}
    </section>
  );
}

/** Open document requests for a month (or with no month). These are what can hold the month's jobs up. */
const blockingRequests = (requests: PortalRequest[] | undefined, period: string) => (requests ?? []).filter((r) => r.status === "open" && (!r.period || r.period === period));

function WaitingOnYou({ period }: { period: string }) {
  const requests = usePortalRequests();
  const approvals = usePortalApprovals();
  const docs = blockingRequests(requests.data, period).length;
  const signoffs = (approvals.data ?? []).filter((a) => a.status === "pending").length;
  if (!docs && !signoffs) return null;
  const item = (icon: React.ReactNode, text: string, href: string, action: string) => (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      {icon}
      <p className="min-w-0 flex-1 text-sm">{text}</p>
      <Button asChild size="sm" variant="outline" className="border-amber-300 bg-white"><Link href={href}>{action}</Link></Button>
    </div>
  );
  return (
    <section aria-label="Waiting on you" className="grid gap-2">
      {docs > 0 && item(<FileUp className="size-5 shrink-0" aria-hidden />, `Your team is waiting for ${docs} document${docs === 1 ? "" : "s"} from you. Some jobs can't finish until ${docs === 1 ? "it arrives" : "they arrive"}.`, "/app/requests", "Upload documents")}
      {signoffs > 0 && item(<Stamp className="size-5 shrink-0" aria-hidden />, `${signoffs} item${signoffs === 1 ? " needs" : "s need"} your approval.`, "/app/approvals", "Review")}
    </section>
  );
}

// ───────────── Board ─────────────

function JobCard({ task, onOpen }: { task: PortalTask; onOpen: () => void }) {
  const stage = STAGE_OF[task.status];
  const meaning = explain(task);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-card hover:border-primary/40 focus-visible:ring-ring w-full rounded-xl border p-4 text-left shadow-xs transition hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none"
    >
      <p className="font-medium">{task.title}</p>
      {meaning && <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{meaning}</p>}
      <div className="mt-3"><Person name={task.handled_by} /></div>
      {isLate(task) && (
        <div className="mt-3">
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">Taking a little longer</span>
        </div>
      )}
      <div className="text-muted-foreground mt-3 flex items-center gap-4 border-t pt-3 text-xs">
        {task.due_date && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{stage === 3 ? "Finished" : `Due ${shortDate(task.due_date)}`}</span>}
        {task.checklist.length > 0 && <span className="inline-flex items-center gap-1" title="Steps done"><ListChecks className="size-3.5" aria-hidden />{stepCount(task)} steps</span>}
      </div>
    </button>
  );
}

function Board({ tasks, onOpen }: { tasks: PortalTask[]; onOpen: (t: PortalTask) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((s, i) => {
        const items = tasks.filter((t) => STAGE_OF[t.status] === i);
        return (
          <section key={s.label} aria-labelledby={`stage-${i}`} className="bg-muted/40 flex min-w-0 flex-col rounded-xl border">
            <header className="flex items-center gap-2 px-4 py-3">
              <h2 id={`stage-${i}`}><StagePill stage={i} /></h2>
              <span className="text-muted-foreground text-sm tabular-nums">{items.length}</span>
            </header>
            <div className="flex-1 space-y-3 px-3 pb-3">
              {items.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-xs">{i === 3 ? "Finished jobs appear here" : "Nothing here"}</p>
              ) : (
                items.map((t) => <JobCard key={t.id} task={t} onOpen={() => onOpen(t)} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ───────────── List ─────────────

function JobList({ tasks, onOpen }: { tasks: PortalTask[]; onOpen: (t: PortalTask) => void }) {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <ul className="divide-y">
        {tasks.map((t) => {
          const stage = STAGE_OF[t.status];
          const meaning = explain(t);
          return (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t)} className="hover:bg-muted/40 grid w-full gap-3 px-5 py-4 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <div className="min-w-0">
                  <p className="font-medium">{t.title}</p>
                  {meaning && <p className="text-muted-foreground mt-0.5 text-sm">{meaning}</p>}
                  {t.handled_by && <p className="text-muted-foreground mt-1 text-xs">Handled by {t.handled_by}</p>}
                </div>
                <div className="flex flex-col gap-1.5 sm:items-end">
                  <StageTracker stage={stage} />
                  <p className="text-xs">
                    <span className="font-medium">{STAGES[stage]!.label}</span>
                    {stage < 3 && t.due_date && (
                      <span className={isLate(t) ? "text-amber-700" : "text-muted-foreground"}>
                        {" · "}{isLate(t) ? `planned for ${shortDate(t.due_date)}, taking a little longer` : `due ${shortDate(t.due_date)}`}
                      </span>
                    )}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ───────────── Job details panel ─────────────

function JobSheet({ task, period, onClose }: { task: PortalTask | null; period: string; onClose: () => void }) {
  const requests = usePortalRequests();
  const stage = task ? STAGE_OF[task.status] : 0;
  const blockers = task && stage < 2 ? blockingRequests(requests.data, period) : [];
  const done = task?.checklist.filter((c) => c.done).length ?? 0;
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {task && (
          <>
            <SheetHeader className="border-b px-6 py-5">
              <p className="text-muted-foreground text-xs">{formatPeriod(period)} / Tasks &amp; Progress</p>
              <SheetTitle className="text-xl">{task.title}</SheetTitle>
              <SheetDescription className="text-sm">{explain(task) ?? "Part of your monthly bookkeeping."}</SheetDescription>
            </SheetHeader>

            <div className="grid gap-6 px-6 py-5">
              <dl className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 text-sm">
                <dt className="text-muted-foreground">Due</dt>
                <dd>{task.due_date ? longDate(task.due_date) : "No date set"}</dd>
                <dt className="text-muted-foreground">Handled by</dt>
                <dd><Person name={task.handled_by} /></dd>
                <dt className="text-muted-foreground">Checked by</dt>
                <dd><Person name={task.checked_by} /></dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <StagePill stage={stage} />
                  {isLate(task) && <span className="text-xs text-amber-700">taking a little longer than planned</span>}
                </dd>
              </dl>

              <div className="bg-muted/40 rounded-xl border p-4">
                <StageTracker stage={stage} />
                <p className="text-muted-foreground mt-2 text-xs">{STAGES[stage]!.help}</p>
              </div>

              {blockers.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <p className="flex items-center gap-1.5 font-medium"><AlertCircle className="size-4" aria-hidden /> Waiting on you</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                    {blockers.map((r) => <li key={r.id}>{r.description}{r.due_date ? ` (by ${shortDate(r.due_date)})` : ""}</li>)}
                  </ul>
                  <Button asChild size="sm" variant="outline" className="mt-3 border-red-200 bg-white text-red-800 hover:text-red-900"><Link href="/app/requests"><FileUp className="size-4" /> Upload documents</Link></Button>
                </div>
              )}

              {task.checklist.length > 0 && (
                <section aria-labelledby="steps-heading">
                  <div className="flex items-baseline justify-between">
                    <h3 id="steps-heading" className="font-medium">Steps your team follows</h3>
                    <span className="text-muted-foreground text-sm tabular-nums">{done} of {task.checklist.length}</span>
                  </div>
                  <ul className="mt-3 grid gap-2">
                    {task.checklist.map((c, i) => (
                      <li key={i} className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm", c.done && "bg-muted/40")}>
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

            <SheetFooter className="mt-auto flex-row items-center justify-between border-t px-6 py-4">
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

function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-medium">How this works</span>
        <ChevronDown className={cn("text-muted-foreground size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="border-t px-5 py-4 text-sm">
          <p className="text-muted-foreground">Every month your accounting team does a set of jobs to keep your books up to date. Each job goes through four steps:</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {STAGES.map((s) => (
              <li key={s.label} className="flex gap-2">
                <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", s.dot)} aria-hidden />
                <span><span className="font-medium">{s.label}.</span> <span className="text-muted-foreground">{s.help}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-3">Click any job to see its steps and who&apos;s on it. You don&apos;t need to do anything unless something appears under &ldquo;waiting on you&rdquo;.</p>
        </div>
      )}
    </section>
  );
}

const VIEWS = [
  { key: "board", label: "Board", icon: Kanban },
  { key: "list", label: "List", icon: List },
] as const;

function ProgressBody() {
  const [period, setPeriod] = useState<string>();
  const [view, setView] = useState<"board" | "list">("board");
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, isLoading, error, refetch } = usePortalTasks(period);
  const tasks = [...(data?.tasks ?? [])].sort((a, b) => STAGE_OF[a.status] - STAGE_OF[b.status] || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const open = tasks.find((t) => t.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Tasks & Progress"
        description="What your accounting team is doing on your books, and how far along it is."
        actions={
          data && (
            <Select value={data.period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40" aria-label="Month"><SelectValue /></SelectTrigger>
              <SelectContent>{data.periods.map((p) => <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>)}</SelectContent>
            </Select>
          )
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-4"><Skeleton className="h-36 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>
      ) : (
        <div className="space-y-6">
          <MonthSummary period={data.period} tasks={tasks} />
          <WaitingOnYou period={data.period} />
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-medium">This month&apos;s jobs</h2>
                <p className="text-muted-foreground text-xs">Click a job to see its steps. Your team also does some internal checks that aren&apos;t listed.</p>
              </div>
              <div role="tablist" aria-label="View" className="bg-muted inline-flex rounded-lg p-1">
                {VIEWS.map((v) => (
                  <button
                    key={v.key}
                    role="tab"
                    type="button"
                    aria-selected={view === v.key}
                    onClick={() => setView(v.key)}
                    className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", view === v.key ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground")}
                  >
                    <v.icon className="size-4" aria-hidden /> {v.label}
                  </button>
                ))}
              </div>
            </div>
            {tasks.length === 0 ? (
              <div className="bg-card rounded-xl border shadow-xs"><EmptyState title="No work scheduled for this month yet" description="Your team plans each month's jobs at the start of the month." /></div>
            ) : view === "board" ? (
              <Board tasks={tasks} onOpen={(t) => setOpenId(t.id)} />
            ) : (
              <JobList tasks={tasks} onOpen={(t) => setOpenId(t.id)} />
            )}
          </div>
          <HowItWorks />
          <JobSheet task={open} period={data.period} onClose={() => setOpenId(null)} />
        </div>
      )}
    </>
  );
}

export function ClientProgress() {
  return <CompanyGate>{() => <ProgressBody />}</CompanyGate>;
}
