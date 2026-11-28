"use client";

import { CalendarDays, ChevronRight, FileUp, ListChecks, Mail, MessageSquare, Phone, Stamp, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatMeetingTime, formatPeriod, initials, parseUtc } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortalMember } from "../hooks/use-client-portal";
import type { PortalMemberOverview, PortalTeamMember } from "../types/client-portal.types";
import { JobSheet, STAGE_OF, STAGE_WEIGHT, StagePill, isLate, shortDate } from "./client-progress";
import { NewTaskDialog } from "./new-task-dialog";

export const ROLE_LABEL: Record<PortalTeamMember["team_role"], string> = { cfo: "CFO", finance_manager: "Finance manager", reviewer: "Reviewer", bookkeeper: "Bookkeeper" };

type Task = PortalMemberOverview["tasks"][number];

const firstName = (name: string) => name.split(" ")[0];

function Section({ icon: Icon, title, count, action, children }: { icon: React.ComponentType<{ className?: string }>; title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Icon className="text-muted-foreground size-4" aria-hidden /> {title}
          {count !== undefined && <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-normal">{count}</span>}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground px-5 py-6 text-sm">{children}</p>;
}

function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: "warn" }) {
  return (
    <div className="bg-card rounded-xl border px-4 py-3 shadow-xs">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" && "text-amber-700")}>{value}</p>
      {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}

/** Steps done / total, as a thin bar. */
function StepBar({ task }: { task: Task }) {
  const done = task.checklist.filter((c) => c.done).length;
  const total = task.checklist.length;
  const pct = total ? Math.round((done / total) * 100) : STAGE_OF[task.status] === 3 ? 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${done} of ${total} steps`}>
        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">{done}/{total}</span>
    </div>
  );
}

function TaskRow({ task, userId, onOpen }: { task: Task; userId: number; onOpen: (t: Task) => void }) {
  const stage = STAGE_OF[task.status];
  const part = task.assignee_id === userId ? "Doing" : task.reviewer_id === userId ? "Checking" : "Overseeing";
  return (
    <li>
    <button
      type="button"
      onClick={() => onOpen(task)}
      aria-label={`${task.title}: open details`}
      className="hover:bg-muted/40 focus-visible:bg-muted/40 grid w-full gap-2 px-5 py-3 text-left focus-visible:outline-none sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className={cn("text-xs", isLate(task) ? "text-amber-700" : "text-muted-foreground")}>
          {part} · {formatPeriod(task.period)}
          {task.due_date && (stage === 3 ? " · Finished" : isLate(task) ? ` · Planned for ${shortDate(task.due_date)}, taking a little longer` : ` · Due ${shortDate(task.due_date)}`)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <StepBar task={task} />
        <StagePill stage={stage} />
      </div>
    </button>
    </li>
  );
}

function TasksSection({ tasks, userId, isOwner }: { tasks: Task[]; userId: number; isOwner: boolean }) {
  const [showDone, setShowDone] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  // Looked up by id so the panel shows fresh data after a refetch (and closes if the task was deleted).
  const openTask = tasks.find((t) => t.id === openId) ?? null;
  const onOpen = (t: Task) => setOpenId(t.id);
  const open = tasks.filter((t) => STAGE_OF[t.status] < 3);
  const done = tasks.filter((t) => STAGE_OF[t.status] === 3);
  return (
    <Section icon={ListChecks} title="Tasks" count={tasks.length} action={<Link href="/app/progress" className="text-primary text-xs hover:underline">Tasks & Progress</Link>}>
      {tasks.length === 0 ? (
        <Empty>No tasks with this person yet.</Empty>
      ) : (
        <>
          {open.length > 0 ? <ul className="divide-y">{open.map((t) => <TaskRow key={t.id} task={t} userId={userId} onOpen={onOpen} />)}</ul> : <Empty>Nothing open right now. Everything is finished.</Empty>}
          {done.length > 0 && (
            <div className="border-t">
              <button type="button" onClick={() => setShowDone((v) => !v)} className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1 px-5 py-2.5 text-xs" aria-expanded={showDone}>
                <ChevronRight className={cn("size-3.5 transition-transform", showDone && "rotate-90")} aria-hidden /> {showDone ? "Hide" : "Show"} {done.length} finished
              </button>
              {showDone && <ul className="divide-y border-t">{done.map((t) => <TaskRow key={t.id} task={t} userId={userId} onOpen={onOpen} />)}</ul>}
            </div>
          )}
        </>
      )}
      <JobSheet task={openTask} period={openTask?.period ?? ""} onClose={() => setOpenId(null)} isOwner={isOwner} onEdit={(t) => setEditing(t as Task)} />
      {isOwner && <NewTaskDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} onCreated={() => setEditing(null)} task={editing} />}
    </Section>
  );
}

function OverviewBody({ data, isOwner }: { data: PortalMemberOverview; isOwner: boolean }) {
  const { member, tasks, requests, approvals, threads, meetings } = data;
  const first = firstName(member.full_name);
  const openTasks = tasks.filter((t) => STAGE_OF[t.status] < 3);
  const late = openTasks.filter(isLate).length;
  const progress = tasks.length ? Math.round((tasks.reduce((s, t) => s + STAGE_WEIGHT[STAGE_OF[t.status]]!, 0) / tasks.length) * 100) : null;
  const openRequests = requests.filter((r) => r.status === "open");
  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const now = new Date();
  const nextMeeting = [...meetings].filter((m) => parseUtc(m.starts_at) >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  return (
    <div className="space-y-4">
      {/* Who they are */}
      <section className="bg-card flex flex-wrap items-start gap-4 rounded-xl border p-5 shadow-xs">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary text-primary-foreground text-base font-semibold">{initials(member.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{member.full_name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {member.team_roles.map((r) => <span key={r} className="bg-secondary rounded-md px-2 py-0.5 text-xs font-medium">{ROLE_LABEL[r]}</span>)}
          </div>
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="size-3.5" aria-hidden /> {member.email}</a>
            {member.phone && <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="size-3.5" aria-hidden /> {member.phone}</a>}
            <span>On your account since {formatDate(member.since)}</span>
          </div>
        </div>
        <Button asChild size="sm"><Link href={`/app/messages?to=${member.user_id}`}><MessageSquare className="size-4" /> Message {first}</Link></Button>
      </section>

      {/* At a glance */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tasks" value={openTasks.length} hint={late ? `${late} taking longer than planned` : "All on track"} tone={late ? "warn" : undefined} />
        <Stat label="Progress" value={progress === null ? "—" : `${progress}%`} hint={`${tasks.length - openTasks.length} of ${tasks.length} finished`} />
        <Stat label="Documents requested" value={openRequests.length} hint={openRequests.length ? "Waiting for you" : "Nothing waiting"} tone={openRequests.length ? "warn" : undefined} />
        <Stat label="Approvals" value={pendingApprovals.length} hint={pendingApprovals.length ? "Need your decision" : "Nothing pending"} tone={pendingApprovals.length ? "warn" : undefined} />
      </div>

      <TasksSection tasks={tasks} userId={member.user_id} isOwner={isOwner} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Section icon={FileUp} title="Documents requested" count={requests.length} action={<Link href="/app/requests" className="text-primary text-xs hover:underline">Document Requests</Link>}>
          {requests.length === 0 ? (
            <Empty>{first} hasn&apos;t asked you for any documents.</Empty>
          ) : (
            <ul className="divide-y">
              {requests.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{r.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {r.period ? formatPeriod(r.period) : "Any month"}
                      {r.due_date && ` · Due ${shortDate(r.due_date)}`}
                      {` · ${r.files} file${r.files === 1 ? "" : "s"} sent`}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={Stamp} title="Approvals asked" count={approvals.length} action={<Link href="/app/approvals" className="text-primary text-xs hover:underline">Approvals</Link>}>
          {approvals.length === 0 ? (
            <Empty>{first} hasn&apos;t asked for any approvals.</Empty>
          ) : (
            <ul className="divide-y">
              {approvals.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{a.subject}</p>
                    <p className="text-muted-foreground text-xs">Asked {formatDate(a.created_at)}{a.decided_at && ` · Decided ${formatDate(a.decided_at)}`}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={MessageSquare} title="Messages" count={threads.length} action={<Link href="/app/messages" className="text-primary text-xs hover:underline">All messages</Link>}>
          {threads.length === 0 ? (
            <Empty>No conversations with {first} yet. Use “Message {first}” to start one.</Empty>
          ) : (
            <ul className="divide-y">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link href={`/app/messages?thread=${t.id}`} className="hover:bg-muted/40 block px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">{t.subject || "Conversation"}</p>
                      {t.last_at && <span className="text-muted-foreground shrink-0 text-xs">{formatDate(t.last_at)}</span>}
                    </div>
                    {t.last_body && <p className="text-muted-foreground truncate text-xs">{t.last_author ? `${t.last_author}: ` : ""}{t.last_body}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={CalendarDays} title="Meetings" count={meetings.length} action={<Link href="/app/meetings" className="text-primary text-xs hover:underline">Meetings</Link>}>
          {meetings.length === 0 ? (
            <Empty>No meetings with {first} yet.</Empty>
          ) : (
            <ul className="divide-y">
              {meetings.map((m) => {
                const upcoming = parseUtc(m.starts_at) >= now;
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.title} {m.id === nextMeeting?.id && <span className="bg-sky-50 text-sky-700 ring-sky-200 ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset">Next</span>}</p>
                      <p className="text-muted-foreground text-xs">{formatMeetingTime(m.starts_at, m.ends_at)}</p>
                    </div>
                    {upcoming && m.meeting_link && (
                      <Button asChild size="sm" variant="outline"><a href={m.meeting_link} target="_blank" rel="noopener"><Video className="size-4" /> Join</a></Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

/** Everything one accountant does for the company: details, tasks & progress, document requests, approvals, messages, meetings. */
export function AccountantOverview({ userId, isOwner = false }: { userId: number; isOwner?: boolean }) {
  const q = usePortalMember(userId);
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isLoading || !q.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  return <OverviewBody data={q.data} isOwner={isOwner} />;
}
