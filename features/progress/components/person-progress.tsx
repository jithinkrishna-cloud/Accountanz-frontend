"use client";

import { ArrowLeft, ArrowRight, CircleCheck, Mail, Pencil, Phone, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/features/analytics/components/bar-chart";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate, formatINR, formatLocalDateTime, formatPeriod, humanize, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PortalRole } from "@/types/auth";
import { usePersonProgress } from "../hooks/use-progress";
import type { PersonProgress, PersonTaskView } from "../types/progress.types";
import { PeriodSelect } from "./period-select";
import { PersonTasks } from "./person-tasks";

type Tab = "overview" | "tasks" | "clients" | "profile";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "clients", label: "Clients" },
  { key: "profile", label: "Profile" },
];

function Panel({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-card min-w-0 rounded-xl border shadow-xs", className)}>
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-medium">{title}</h2>
          {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[160px_1fr] sm:gap-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <div className="text-sm font-medium break-words">{value}</div>
    </div>
  );
}

const shortMonth = (p: string) => formatPeriod(p).split(" ")[0]!;
const Num = ({ v, warn }: { v: number; warn?: boolean }) => (
  <span className={cn("tabular-nums", v === 0 ? "text-muted-foreground" : warn && "text-destructive font-medium")}>{v}</span>
);

/** Admin → Insights → Individual Progress → one person: overview, every task, their clients and their profile. */
export function PersonProgressView({ id }: { id: number }) {
  const [period, setPeriod] = useState<string>();
  const [tab, setTab] = useState<Tab>("overview");
  const [taskView, setTaskView] = useState<PersonTaskView>("open");
  const { data, isLoading, error, refetch } = usePersonProgress(id, period);

  const back = (
    <Link href="/admin/progress" className="text-muted-foreground mb-4 inline-flex items-center gap-1 text-sm hover:underline">
      <ArrowLeft className="size-4" /> Individual Progress
    </Link>
  );
  if (error) return <>{back}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !data) {
    return (
      <>
        {back}
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      </>
    );
  }

  const p = data.person;
  const profileHref = `/admin/${p.staff_type === "accountant" ? "accountants" : "employees"}/${p.user_id}`;
  /** Jump to the Tasks tab with a view already picked. */
  const showTasks = (v: PersonTaskView) => { setTaskView(v); setTab("tasks"); };

  return (
    <>
      {back}
      <div className="mb-2 flex items-start gap-4">
        <div className="bg-primary text-primary-foreground hidden size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold sm:flex" aria-hidden>
          {initials(p.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={p.full_name}
            description={`${ROLE_LABELS[p.portal_role as PortalRole] ?? humanize(p.portal_role)} · ${p.email}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {(tab === "overview" || tab === "clients") && <PeriodSelect value={data.period} periods={data.periods} onChange={setPeriod} />}
                <Button variant="outline" asChild><Link href={profileHref}><Pencil className="size-4" aria-hidden /> Edit profile</Link></Button>
              </div>
            }
          />
        </div>
      </div>

      <div className="mb-6 border-b">
      <div role="tablist" aria-label="Sections" className="no-scrollbar flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
              tab === t.key ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
            {t.key === "tasks" && <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">{p.open_tasks + p.awaiting_review}</span>}
            {t.key === "clients" && <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">{p.active_clients}</span>}
          </button>
        ))}
      </div>
      </div>

      {tab === "overview" && <Overview data={data} showTasks={showTasks} showClients={() => setTab("clients")} />}
      {tab === "tasks" && (
        <PersonTasks
          key={taskView}
          userId={p.user_id}
          initialView={taskView}
          clients={data.clients.map((c) => ({ value: String(c.client_id), label: c.client_name }))}
        />
      )}
      {tab === "clients" && <Clients data={data} />}
      {tab === "profile" && <Profile data={data} profileHref={profileHref} />}
    </>
  );
}

function Overview({ data, showTasks, showClients }: { data: PersonProgress; showTasks: (v: PersonTaskView) => void; showClients: () => void }) {
  const [openTask, setOpenTask] = useState<number | null>(null);
  const { person: p, trend, open_tasks, recent_reviews } = data;
  const month = formatPeriod(data.period);
  const card = (onClick: () => void, el: React.ReactNode) => (
    <button type="button" onClick={onClick} className="rounded-xl text-left focus-visible:ring-2 focus-visible:outline-none [&>*]:hover:border-primary/40 [&>*]:h-full [&>*]:transition-colors">
      {el}
    </button>
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {card(() => showTasks("open"), (
          <KpiCard
            label="Open tasks"
            value={p.open_tasks}
            details={[
              { label: "Overdue", value: <span className={p.overdue ? "text-destructive" : undefined}>{p.overdue}</span> },
              { label: "Awaiting review", value: p.awaiting_review },
            ]}
          />
        ))}
        {card(() => showTasks("approved"), (
          <KpiCard
            label={`Approved · ${month}`}
            value={p.approved}
            details={[
              { label: "Returned", value: p.returned },
              { label: "Approval rate", value: p.approval_rate == null ? "—" : `${p.approval_rate}%` },
            ]}
          />
        ))}
        <KpiCard label={`Hours logged · ${month}`} value={p.hours} />
        {card(showClients, <KpiCard label="Clients" value={p.active_clients} details={[{ label: "Tasks to review", value: p.to_review }]} />)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Approved tasks" subtitle="Last 6 months.">
          <BarChart title="Approved tasks per month" bars={trend.map((t) => ({ key: t.month, label: shortMonth(t.month), value: t.approved }))} format={(v) => String(v)} />
        </Panel>
        <Panel title="Hours logged" subtitle="Last 6 months.">
          <BarChart title="Hours logged per month" bars={trend.map((t) => ({ key: t.month, label: shortMonth(t.month), value: t.hours }))} format={(v) => `${v} h`} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          title="Needs attention"
          subtitle="Overdue first, then the nearest due dates."
          action={
            <button type="button" onClick={() => showTasks("open")} className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline">
              View all tasks <ArrowRight className="size-3.5" aria-hidden />
            </button>
          }
        >
          {open_tasks.length === 0 ? (
            <EmptyState title="Nothing open" description="All their tasks are approved." />
          ) : (
            <ul className="-my-2 divide-y">
              {open_tasks.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setOpenTask(t.id)} className="hover:bg-muted/50 -mx-2 flex w-[calc(100%+1rem)] items-start justify-between gap-3 rounded-md px-2 py-2.5 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-muted-foreground truncate text-xs">{t.client_name} · {formatPeriod(t.period)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={t.status} />
                      {t.due_date && (
                        <span className={cn("text-xs", t.overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                          {t.overdue ? "Overdue · " : "Due "}{formatDate(t.due_date)}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent reviews" subtitle="The latest decisions on their work.">
          {recent_reviews.length === 0 ? (
            <EmptyState title="No reviews yet" />
          ) : (
            <ul className="-my-2 divide-y">
              {recent_reviews.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenTask(r.task_id)} className="hover:bg-muted/50 -mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-md px-2 py-2.5 text-left">
                    {r.decision === "approved" ? (
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Approved" />
                    ) : (
                      <Undo2 className="text-warning mt-0.5 size-4 shrink-0" aria-label="Returned" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.task_title}</p>
                      <p className="text-muted-foreground text-xs">
                        {r.decision === "approved" ? "Approved" : "Returned"}
                        {r.reviewer_name && ` by ${r.reviewer_name}`} · {r.client_name} · {formatLocalDateTime(r.created_at)}
                      </p>
                      {r.comments && <p className="text-muted-foreground mt-1 line-clamp-2 text-xs italic">&ldquo;{r.comments}&rdquo;</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <TaskDetailSheet portal="admin" taskId={openTask} onClose={() => setOpenTask(null)} />
    </>
  );
}

const PHASE_LABEL = { current: "Current", scheduled: "Starts later", expired: "Expired", ended: "Ended" } as const;

function Clients({ data }: { data: PersonProgress }) {
  const month = formatPeriod(data.period);
  const past = data.assignments.filter((a) => a.phase !== "current");
  return (
    <>
      <Panel
        title="Current clients"
        subtitle={`Their own tasks on each client. "${month}" counts tasks for that month.`}
        action={<Link href="/admin/assignments" className="text-primary text-sm font-medium hover:underline">Manage assignments</Link>}
      >
        {data.clients.length === 0 ? (
          <EmptyState title="No active assignments" description="Assign them to a client from Assignments." />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr className="border-b">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Since</th>
                  <th className="px-3 py-3 text-right font-medium">{month}</th>
                  <th className="px-3 py-3 text-right font-medium">Open</th>
                  <th className="px-3 py-3 text-right font-medium">Overdue</th>
                  <th className="px-5 py-3 text-right font-medium">Awaiting review</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map((c) => {
                  const a = data.assignments.find((x) => x.client_id === c.client_id && x.phase === "current");
                  return (
                    <tr key={c.client_id} className="border-b last:border-b-0">
                      <td className="px-5 py-3"><Link href={`/admin/clients/${c.client_id}`} className="font-medium hover:underline">{c.client_name}</Link></td>
                      <td className="text-muted-foreground px-3 py-3">{c.roles.map(humanize).join(", ")}</td>
                      <td className="text-muted-foreground px-3 py-3 whitespace-nowrap">
                        {a ? formatDate(a.valid_from) : "—"}
                        {a?.source_group_name && <span className="block text-xs">via {a.source_group_name}</span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{c.period_total === 0 ? <span className="text-muted-foreground">—</span> : `${c.period_approved} / ${c.period_total}`}</td>
                      <td className="px-3 py-3 text-right"><Num v={c.open_tasks} /></td>
                      <td className="px-3 py-3 text-right"><Num v={c.overdue} warn /></td>
                      <td className="px-5 py-3 text-right"><Num v={c.awaiting_review} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {past.length > 0 && (
        <Panel title="Past and upcoming assignments" className="mt-6">
          <ul className="-my-2 divide-y">
            {past.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div>
                  <Link href={`/admin/clients/${a.client_id}`} className="font-medium hover:underline">{a.client_name}</Link>
                  <span className="text-muted-foreground"> · {humanize(a.team_role)}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  {formatDate(a.valid_from)} – {a.valid_to ? formatDate(a.valid_to) : "open"}
                  <StatusBadge status={a.phase} label={PHASE_LABEL[a.phase]} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

function Profile({ data, profileHref }: { data: PersonProgress; profileHref: string }) {
  const { person: p, profile, groups } = data;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Contact & account" action={<Link href={profileHref} className="text-primary text-sm font-medium hover:underline">Edit</Link>}>
        <div className="-my-3">
          <Row label="Email" value={<a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 hover:underline"><Mail className="size-3.5" aria-hidden />{p.email}</a>} />
          <Row label="Phone" value={profile?.phone ? <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1.5 hover:underline"><Phone className="size-3.5" aria-hidden />{profile.phone}</a> : "—"} />
          <Row label="Role" value={ROLE_LABELS[p.portal_role as PortalRole] ?? humanize(p.portal_role)} />
          <Row label="Type" value={humanize(p.staff_type)} />
          <Row label="Account" value={<StatusBadge status={p.status} />} />
          <Row label="Verification" value={profile ? <StatusBadge status={profile.verification_status} /> : "—"} />
          <Row label="Member since" value={profile ? formatDate(profile.member_since) : "—"} />
          <Row label="Last sign-in" value={profile?.last_login_at ? formatLocalDateTime(profile.last_login_at) : "Never"} />
        </div>
      </Panel>
      <Panel title="Work profile">
        <div className="-my-3">
          <Row
            label="Expertise"
            value={profile?.expertise.length ? (
              <div className="flex flex-wrap gap-1">{profile.expertise.map((e) => <span key={e} className="bg-secondary rounded px-1.5 py-0.5 text-xs font-medium">{e}</span>)}</div>
            ) : "—"}
          />
          {p.staff_type === "accountant" && <Row label="Hourly rate" value={profile?.hourly_rate == null ? "—" : formatINR(profile.hourly_rate)} />}
          <Row
            label="Staff groups"
            value={groups.length ? (
              <ul className="space-y-0.5">{groups.map((g) => <li key={g.group_id}>{g.name} <span className="text-muted-foreground font-normal">· {humanize(g.team_role)}</span></li>)}</ul>
            ) : <span className="text-muted-foreground font-normal">Not in a group</span>}
          />
          <Row label="Active clients" value={<span className="tabular-nums">{p.active_clients}</span>} />
        </div>
      </Panel>
    </div>
  );
}
