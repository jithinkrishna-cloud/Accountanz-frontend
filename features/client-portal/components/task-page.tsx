"use client";

import { AlertCircle, ArrowLeft, Check, CircleCheck, FileUp, MessageSquare, Paperclip, Pencil, Stamp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOwnTaskActions, usePortalRequests, usePortalTask } from "../hooks/use-client-portal";
import type { PortalTask, PortalTaskDetail } from "../types/client-portal.types";
import { blockingRequests, explain, isLate, longDate, Person, shortDate, STAGE_OF, StagePill, STAGES, StageTracker } from "./client-progress";
import { CompanyGate } from "./company-gate";
import { NewTaskDialog } from "./new-task-dialog";

/*
 * A job's own page in the client portal (linked from Tasks & Progress, document requests and approvals).
 * Same plain language as the rest of the page: four stages, who's on it, the steps, and anything waiting on the client.
 */

const dateTime = (s: string) => new Date(s.replace(" ", "T")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Card({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-card rounded-xl border shadow-xs", className)}>
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="font-medium">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** When the job moved along, from what's recorded: planned, handed over for checking, done. */
function Timeline({ task }: { task: PortalTaskDetail }) {
  const stage = STAGE_OF[task.status];
  const steps = [
    { label: "Planned for the month", at: task.created_at, done: true },
    { label: "Work started", at: null, done: stage >= 1 },
    { label: "Handed over for checking", at: stage >= 2 ? task.submitted_at : null, done: stage >= 2 },
    { label: "Checked and done", at: task.approved_at, done: stage === 3 },
  ];
  return (
    <ol className="px-5 py-4">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span className={cn("absolute top-6 bottom-0 left-2.5 w-0.5 -translate-x-1/2 rounded", s.done && steps[i + 1]!.done ? "bg-emerald-500/60" : "bg-border")} aria-hidden />}
          <span className={cn("relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full", s.done ? "bg-emerald-500 text-white" : "bg-card border")} aria-hidden>
            {s.done && <Check className="size-3" />}
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm leading-tight", !s.done && "text-muted-foreground")}>{s.label}</p>
            {s.at && <p className="text-muted-foreground text-xs">{dateTime(s.at)}</p>}
            {!s.done && i === stage + 1 && stage < 3 && <p className="text-muted-foreground text-xs">Next</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function TaskBody({ id, isOwner }: { id: number; isOwner: boolean }) {
  const router = useRouter();
  const q = usePortalTask(id);
  const periodRequests = usePortalRequests();
  const { remove } = useOwnTaskActions();
  const [editing, setEditing] = useState(false);

  if (q.error) {
    const missing = q.error instanceof ApiError && q.error.status === 404;
    return missing ? (
      <div className="bg-card mx-auto max-w-md rounded-xl border p-8 text-center">
        <p className="font-medium">This task isn&apos;t available</p>
        <p className="text-muted-foreground mt-1 text-sm">It may have been removed, or it isn&apos;t shared with your company.</p>
        <Button asChild className="mt-4"><Link href="/app/progress">Back to Tasks &amp; Progress</Link></Button>
      </div>
    ) : <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  }
  if (q.isLoading || !q.data) {
    return <div className="space-y-4"><Skeleton className="h-28 w-full rounded-xl" /><Skeleton className="h-72 w-full rounded-xl" /></div>;
  }

  const task = q.data;
  const stage = STAGE_OF[task.status];
  const meaning = explain(task);
  const done = task.checklist.filter((c) => c.done).length;
  const addedByClient = !!task.created_by_client;
  const canChange = isOwner && addedByClient && task.status === "todo";
  const openTaskRequests = task.requests.filter((r) => r.status === "open");
  // No request tied to this job: the month's open requests can still hold it up while it isn't finished.
  const monthBlockers = task.requests.length === 0 && stage < 2 ? blockingRequests(periodRequests.data, task.period) : [];
  const pendingApprovals = task.approvals.filter((a) => a.status === "pending");
  const backHref = `/app/progress?period=${task.period}`;

  const deleteTask = async () => {
    if (!window.confirm(`Delete the task "${task.title}"? Your team will no longer see it.`)) return;
    try {
      await remove.mutateAsync(task.id);
      toast.success("Task deleted");
      router.push(backHref);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the task");
    }
  };

  return (
    <div className="space-y-6">
      {isOwner && <NewTaskDialog open={editing} onOpenChange={setEditing} onCreated={() => void q.refetch()} task={editing ? (task as PortalTask) : null} />}

      <div>
        <Link href={backHref} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="size-4" aria-hidden /> Tasks &amp; Progress · {formatPeriod(task.period)}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
              <StagePill stage={stage} />
              {isLate(task) && <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">Taking a little longer</span>}
            </div>
            <p className="text-muted-foreground mt-1.5">{meaning ?? "Part of your monthly bookkeeping."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canChange && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => void deleteTask()}><Trash2 className="size-4" /> Delete</Button>
              </>
            )}
            <Button asChild>
              <Link href={`/app/messages?${new URLSearchParams({ ...(task.assignee_id ? { to: String(task.assignee_id) } : {}), subject: `About: ${task.title}` })}`}>
                <MessageSquare className="size-4" /> Message {task.handled_by ? task.handled_by.split(" ")[0] : "your team"}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {(openTaskRequests.length > 0 || monthBlockers.length > 0 || pendingApprovals.length > 0) && (
        <section aria-label="Waiting on you" className="grid gap-3 md:grid-cols-2">
          {(openTaskRequests.length > 0 || monthBlockers.length > 0) && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300" aria-hidden><FileUp className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{openTaskRequests.length ? `${openTaskRequests.length} document${openTaskRequests.length === 1 ? "" : "s"} needed for this job` : `${monthBlockers.length} document${monthBlockers.length === 1 ? "" : "s"} still needed this month`}</p>
                <p className="text-muted-foreground text-xs">{openTaskRequests.length ? "Your team can't finish it until they arrive." : "This job may wait on them."}</p>
              </div>
              <Button asChild size="sm"><Link href="/app/requests">Upload</Link></Button>
            </div>
          )}
          {pendingApprovals.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300" aria-hidden><Stamp className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{pendingApprovals.length} sign-off{pendingApprovals.length === 1 ? "" : "s"} waiting for you</p>
                <p className="text-muted-foreground text-xs">Your team needs your approval to finish this job.</p>
              </div>
              <Button asChild size="sm"><Link href="/app/approvals">Review</Link></Button>
            </div>
          )}
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card title="Where it stands">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
              <StageTracker stage={stage} />
              <p className="text-muted-foreground text-sm">{STAGES[stage]!.help}</p>
            </div>
          </Card>

          <Card title="Steps your team follows" aside={task.checklist.length > 0 && <span className="text-muted-foreground text-sm tabular-nums">{done} of {task.checklist.length}</span>}>
            {task.checklist.length === 0 ? (
              <p className="text-muted-foreground px-5 py-4 text-sm">No individual steps listed for this job.</p>
            ) : (
              <>
                <div className="px-5 pt-4">
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                    <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${Math.round((done / task.checklist.length) * 100)}%` }} />
                  </div>
                </div>
                <ul className="grid gap-2 p-5">
                  {task.checklist.map((c, i) => (
                    <li key={i} className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", c.done && "bg-muted/40")}>
                      <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border", c.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40")} aria-hidden>
                        {c.done && <Check className="size-3" />}
                      </span>
                      <span className={cn(c.done && "text-muted-foreground line-through")}>{c.text}</span>
                      <span className="sr-only">{c.done ? "(done)" : "(not done yet)"}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {task.requests.length > 0 && (
            <Card title="Documents for this job" aside={<Link href="/app/requests" className="text-primary text-sm hover:underline">All requests</Link>}>
              <ul className="divide-y">
                {task.requests.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{r.description}</p>
                      <p className="text-muted-foreground text-xs">
                        {r.requested_by ? `Asked by ${r.requested_by}` : "Asked by your team"}
                        {r.due_date ? ` · by ${shortDate(r.due_date)}` : ""}
                      </p>
                    </div>
                    {r.status === "open" ? (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400"><AlertCircle className="size-3.5" aria-hidden /> Needed</span>
                    ) : (
                      <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs"><Paperclip className="size-3.5" aria-hidden /> {r.files} file{r.files === 1 ? "" : "s"}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {task.approvals.length > 0 && (
            <Card title="Your sign-offs" aside={<Link href="/app/approvals" className="text-primary text-sm hover:underline">All approvals</Link>}>
              <ul className="divide-y">
                {task.approvals.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{a.subject}</p>
                      <p className="text-muted-foreground text-xs">Asked {dateTime(a.created_at)}{a.decided_at ? ` · answered ${dateTime(a.decided_at)}` : ""}</p>
                    </div>
                    <span className={cn("shrink-0 text-xs font-medium", a.status === "pending" ? "text-amber-700 dark:text-amber-400" : a.status === "approved" ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                      {a.status === "pending" ? "Waiting for you" : a.status === "approved" ? "Approved" : "Changes requested"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Card title="Details">
            <dl className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 px-5 py-4 text-sm">
              <dt className="text-muted-foreground">Month</dt>
              <dd>{formatPeriod(task.period)}</dd>
              <dt className="text-muted-foreground">Due</dt>
              <dd className={cn(isLate(task) && "text-amber-700 dark:text-amber-400")}>{task.due_date ? longDate(task.due_date) : "No date set"}</dd>
              <dt className="text-muted-foreground">Handled by</dt>
              <dd><Person name={task.handled_by} userId={task.assignee_id} /></dd>
              <dt className="text-muted-foreground">Checked by</dt>
              <dd><Person name={task.checked_by} userId={task.reviewer_id} /></dd>
              {addedByClient && (
                <>
                  <dt className="text-muted-foreground">Added by</dt>
                  <dd>You</dd>
                </>
              )}
            </dl>
            {addedByClient && (
              <p className="text-muted-foreground border-t px-5 py-3 text-xs">
                {canChange ? "You can change or delete it until your team starts working on it." : isOwner ? "Your team has started it, so it can't be changed now." : "Only the company owner can change it."}
              </p>
            )}
          </Card>
          <Card title="Timeline"><Timeline task={task} /></Card>
          {stage === 3 && (
            <p className="text-muted-foreground flex items-start gap-2 px-1 text-xs">
              <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden /> This job is complete. Nothing more is needed from you.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

export function ClientTaskPage({ id }: { id: number }) {
  return <CompanyGate>{(company) => <TaskBody id={id} isOwner={company.role === "owner"} />}</CompanyGate>;
}
