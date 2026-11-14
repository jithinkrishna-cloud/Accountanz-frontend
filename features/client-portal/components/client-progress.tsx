"use client";

import { Check, ChevronDown, FileUp, Stamp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortalApprovals, usePortalRequests, usePortalTasks } from "../hooks/use-client-portal";
import type { PortalTask } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";
import { Card, ListBody } from "./portal-ui";

/**
 * Client view of the month's work, in plain language. Clients don't need the review workflow: four stages
 * (a returned task is simply still being worked on), what each job means, and what's waiting on them.
 */
const STAGES = [
  { label: "Not started", help: "Scheduled for this month. Your team hasn't begun yet." },
  { label: "Working on it", help: "Your accountant is doing this job now." },
  { label: "Being checked", help: "Finished, and a senior accountant is reviewing it before it's final." },
  { label: "Done", help: "Checked and complete. Nothing more needed." },
] as const;

const STAGE_OF: Record<PortalTask["status"], number> = { todo: 0, in_progress: 1, returned: 1, submitted: 2, approved: 3 };
const STAGE_BAR = ["bg-muted-foreground/25", "bg-amber-400", "bg-sky-500", "bg-emerald-500"];
const STAGE_TEXT = ["text-muted-foreground", "text-amber-700", "text-sky-700", "text-emerald-700"];

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

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const todayIso = () => new Date().toISOString().slice(0, 10);

function StageTracker({ stage }: { stage: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Stage: ${STAGES[stage]!.label}`}>
      {STAGES.map((s, i) => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
              i < stage || stage === 3 ? "bg-emerald-500 text-white" : i === stage ? cn(STAGE_BAR[i], i === 0 ? "text-foreground" : "text-white") : "bg-muted text-muted-foreground",
            )}
            aria-hidden
          >
            {i < stage || stage === 3 ? <Check className="size-3" /> : i + 1}
          </span>
          {i < STAGES.length - 1 && <span className={cn("h-0.5 w-4 rounded sm:w-6", i < stage ? "bg-emerald-500" : "bg-muted")} aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function MonthSummary({ period, tasks }: { period: string; tasks: PortalTask[] }) {
  const counts = [0, 0, 0, 0];
  for (const t of tasks) counts[STAGE_OF[t.status]]! += 1;
  const done = counts[3]!;
  const nextTarget = tasks.filter((t) => STAGE_OF[t.status] < 3 && t.due_date).map((t) => t.due_date!).sort()[0];
  const lastTarget = tasks.map((t) => t.due_date).filter(Boolean).sort().at(-1);
  const headline =
    tasks.length === 0
      ? "Nothing scheduled yet"
      : done === tasks.length
        ? "All done. Your books for this month are complete."
        : `${done} of ${tasks.length} jobs finished`;
  return (
    <section className="bg-card rounded-xl border p-5 shadow-xs sm:p-6" aria-labelledby="month-heading">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase" id="month-heading">Your {formatPeriod(period)} books</p>
      <p className="mt-1 text-xl font-semibold">{headline}</p>
      {done < tasks.length && (
        <p className="text-muted-foreground mt-1 text-sm">
          {nextTarget ? `Next job due ${shortDate(nextTarget)}` : "Your team is on it"}
          {lastTarget ? ` · everything planned to finish by ${shortDate(lastTarget)}` : ""}.
        </p>
      )}
      {tasks.length > 0 && (
        <>
          <div className="mt-4 flex h-2.5 gap-1" aria-hidden>
            {[...tasks].sort((a, b) => STAGE_OF[b.status] - STAGE_OF[a.status]).map((t) => (
              <span key={t.id} className={cn("flex-1 rounded-full", STAGE_BAR[STAGE_OF[t.status]])} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            {STAGES.map((s, i) => (
              <li key={s.label} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", STAGE_BAR[i])} aria-hidden />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular-nums">{counts[i]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** The only things a client can do to move the month forward. Hidden when nothing is waiting on them. */
function WaitingOnYou() {
  const requests = usePortalRequests();
  const approvals = usePortalApprovals();
  const docs = (requests.data ?? []).filter((r) => r.status === "open").length;
  const signoffs = (approvals.data ?? []).filter((a) => a.status === "pending").length;
  if (!docs && !signoffs) return null;
  const item = (icon: React.ReactNode, text: string, href: string, action: string) => (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
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

function TaskRow({ task }: { task: PortalTask }) {
  const stage = STAGE_OF[task.status];
  const late = stage < 2 && !!task.due_date && task.due_date < todayIso();
  const meaning = explain(task);
  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <p className="font-medium">{task.title}</p>
        {meaning && <p className="text-muted-foreground mt-0.5 text-sm">{meaning}</p>}
      </div>
      <div className="flex flex-col gap-1.5 sm:items-end">
        <StageTracker stage={stage} />
        <p className="text-xs">
          <span className={cn("font-medium", STAGE_TEXT[stage])}>{STAGES[stage]!.label}</span>
          {stage < 3 && task.due_date && (
            <span className={cn(late ? "text-amber-700" : "text-muted-foreground")}>
              {" · "}{late ? `planned for ${shortDate(task.due_date)}, taking a little longer` : `due ${shortDate(task.due_date)}`}
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

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
            {STAGES.map((s, i) => (
              <li key={s.label} className="flex gap-2">
                <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", STAGE_BAR[i])} aria-hidden />
                <span><span className="font-medium">{s.label}.</span> <span className="text-muted-foreground">{s.help}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-3">You don&apos;t need to do anything unless something appears under &ldquo;waiting on you&rdquo;. Questions? Send your team a message.</p>
        </div>
      )}
    </section>
  );
}

function ProgressBody() {
  const [period, setPeriod] = useState<string>();
  const { data, isLoading, error, refetch } = usePortalTasks(period);
  const tasks = [...(data?.tasks ?? [])].sort((a, b) => STAGE_OF[a.status] - STAGE_OF[b.status] || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
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
      <div className="space-y-6">
        {data && <MonthSummary period={data.period} tasks={tasks} />}
        <WaitingOnYou />
        <Card title="This month's jobs" subtitle="Your team also does some internal checks that aren't listed here.">
          <ListBody query={{ data: data ? tasks : undefined, isLoading, error, refetch }} empty={{ title: "No work scheduled for this month yet", description: "Your team plans each month's jobs at the start of the month." }}>
            {(rows) => <ul className="divide-y">{rows.map((t) => <TaskRow key={t.id} task={t} />)}</ul>}
          </ListBody>
        </Card>
        <HowItWorks />
      </div>
    </>
  );
}

export function ClientProgress() {
  return <CompanyGate>{() => <ProgressBody />}</CompanyGate>;
}
