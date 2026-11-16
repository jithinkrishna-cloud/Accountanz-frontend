"use client";

import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLocalDateTime, parseUtc } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSummary } from "../hooks/use-projects";
import { ITEM_TYPE_LABELS, PRIORITIES, SPACE_ROLE_LABELS, type StatusCategory, type Summary } from "../types/project.types";
import { AssigneeFilter, PriorityIcon, StatusPill, TypeIcon, UserAvatar } from "./project-ui";
import { useSpaceCtx } from "./space-layout";

/** Same hues as the status pills: grey to do, sky in progress, emerald done. */
const CATEGORY_BAR: Record<StatusCategory, string> = { todo: "bg-slate-300 dark:bg-slate-600", in_progress: "bg-sky-500", done: "bg-emerald-500" };

const todayIso = () => new Date().toLocaleDateString("en-CA");
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const timeAgo = (utc: string) => {
  const s = Math.round((parseUtc(utc).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
  for (const [unit, secs] of [["day", 86400], ["hour", 3600], ["minute", 60]] as const) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return "just now";
};

function Card({ title, action, className, children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("bg-card flex min-w-0 flex-col rounded-xl border shadow-xs", className)}>
      <header className="flex min-h-14 items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="font-medium">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** One horizontal bar per row; value and share are printed, so nothing depends on colour. */
function Bars({ rows, total }: { rows: { key: string; label: React.ReactNode; count: number }[]; total: number }) {
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3 text-sm">
          <span className="min-w-0 truncate">{r.label}</span>
          <span className="bg-muted h-2 overflow-hidden rounded-full">
            <span className="bg-primary block h-full rounded-full" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
          </span>
          <span className="text-right tabular-nums">
            {r.count} <span className="text-muted-foreground text-xs">{total ? Math.round((r.count / total) * 100) : 0}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Whose work this is: each member, their role and how much they have open. Clicking someone focuses the page on them. */
function People({ data, focusedId, onFocus }: { data: Summary; focusedId: number | undefined; onFocus: (id: number | undefined) => void }) {
  const { members, space } = useSpaceCtx();
  const load = new Map(data.byAssignee.map((a) => [a.assignee_id, a]));
  const sorted = [...members].sort((a, b) => (load.get(b.user_id)?.open ?? 0) - (load.get(a.user_id)?.open ?? 0));
  return (
    <Card
      title="People"
      action={<Button asChild variant="outline" size="sm"><Link href={`/projects/${space.space_key}/settings/access`}><Users className="size-4" /> Manage</Link></Button>}
    >
      {members.length === 0 ? (
        <p className="text-muted-foreground px-5 py-6 text-sm">No one else is in this space yet.</p>
      ) : (
        <ul className="max-h-72 divide-y overflow-y-auto">
          {sorted.map((m) => {
            const l = load.get(m.user_id);
            const active = focusedId === m.user_id;
            return (
              <li key={m.user_id}>
                <button
                  type="button"
                  onClick={() => onFocus(active ? undefined : m.user_id)}
                  aria-pressed={active}
                  className={cn("hover:bg-muted/50 flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors", active && "bg-primary/5")}
                >
                  <UserAvatar name={m.full_name} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{m.full_name}</span>
                    <span className="text-muted-foreground block text-xs">{SPACE_ROLE_LABELS[m.role]}</span>
                  </span>
                  <span className="text-right text-xs tabular-nums">
                    <span className="block font-medium">{l?.open ?? 0} open</span>
                    <span className="text-muted-foreground block">{l?.done ?? 0} done</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** One in-progress item at a time, stepped through like the reference's running tasks. */
function InProgress({ data }: { data: Summary }) {
  const { space, openItem } = useSpaceCtx();
  const [i, setI] = useState(0);
  const items = data.running;
  const idx = Math.min(i, Math.max(items.length - 1, 0));
  const it = items[idx];
  const overdue = it?.due_date && it.due_date < todayIso();
  return (
    <Card
      title="In progress"
      action={
        items.length > 1 && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mr-1 text-xs tabular-nums">{idx + 1} of {items.length}</span>
            <Button variant="outline" size="icon" className="size-7" aria-label="Previous" disabled={idx === 0} onClick={() => setI(idx - 1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon" className="size-7" aria-label="Next" disabled={idx === items.length - 1} onClick={() => setI(idx + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        )
      }
    >
      {!it ? (
        <p className="text-muted-foreground px-5 py-6 text-sm">Nothing is in progress. Move an item to an in-progress status on the board to see it here.</p>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-5 py-4">
          <div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <TypeIcon type={it.type} /> <span className="font-mono">{space.space_key}-{it.number}</span> · <StatusPill name={it.status_name} category="in_progress" />
            </p>
            <button type="button" onClick={() => openItem(it.number)} className="mt-1.5 text-left font-medium hover:underline">{it.title}</button>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Assigned to</dt>
              <dd className="mt-1 flex items-center gap-2"><UserAvatar name={it.assignee_name} size="xs" /> <span className="truncate">{it.assignee_name ?? "Unassigned"}</span></dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Timeline</dt>
              <dd className={cn("mt-1", overdue && "text-red-700 dark:text-red-400")}>
                {it.start_date || it.due_date ? `${it.start_date ? dayLabel(it.start_date) : "—"} → ${it.due_date ? dayLabel(it.due_date) : "no due date"}` : "No dates"}
                {overdue && " · overdue"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground text-xs">Priority</dt>
              <dd className="mt-1"><PriorityIcon priority={it.priority} withLabel /></dd>
            </div>
          </dl>
          <Button asChild variant="outline" size="sm" className="mt-auto">
            <Link href={`/projects/${space.space_key}/board`}>Open board</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

function Progress({ data }: { data: Summary }) {
  const c = data.counts ?? { completed: 0, updated: 0, created: 0, due_soon: 0, total: 0 };
  const byCat = (cat: StatusCategory) => data.byStatus.filter((s) => s.category === cat).reduce((n, s) => n + s.count, 0);
  const done = byCat("done");
  const pct = c.total ? Math.round((done / c.total) * 100) : 0;
  return (
    <Card title="Progress">
      <div className="grid gap-5 px-5 py-4">
        <div>
          <p className="text-sm">
            <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
            <span className="text-muted-foreground ml-2">{done} of {c.total} items done</span>
          </p>
          {/* Stacked by status, in board order */}
          <div className="bg-muted mt-2 flex h-2.5 overflow-hidden rounded-full" role="img" aria-label={data.byStatus.map((s) => `${s.name} ${s.count}`).join(", ")}>
            {data.byStatus.filter((s) => s.count > 0).map((s) => (
              <span key={s.id} className={cn("h-full border-r-2 border-white last:border-r-0 dark:border-transparent", CATEGORY_BAR[s.category])} style={{ width: `${(s.count / (c.total || 1)) * 100}%` }} title={`${s.name}: ${s.count}`} />
            ))}
          </div>
          <ul className="mt-3 grid gap-1.5 text-xs">
            {data.byStatus.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", CATEGORY_BAR[s.category])} aria-hidden />
                <span className="flex-1">{s.name}</span>
                <span className="tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="grid grid-cols-3 gap-2 border-t pt-4 text-center">
          {[
            ["Completed", c.completed, "last 7 days"],
            ["Created", c.created, "last 7 days"],
            ["Due soon", c.due_soon, "next 7 days"],
          ].map(([label, value, sub]) => (
            <div key={label as string}>
              <dd className="text-lg font-semibold tabular-nums">{value}</dd>
              <dt className="text-xs">{label}</dt>
              <p className="text-muted-foreground text-[11px]">{sub}</p>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month calendar of due dates (dot = something due; red = overdue and not done), with the chosen day's items beside it. */
function DueDates({ data }: { data: Summary }) {
  const { space, openItem } = useSpaceCtx();
  const today = todayIso();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [picked, setPicked] = useState(today);
  const byDay = new Map<string, Summary["due"]>();
  for (const d of data.due) byDay.set(d.due_date, [...(byDay.get(d.due_date) ?? []), d]);

  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(y, m, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, k) => {
    const d = k - lead + 1;
    return d >= 1 && d <= days ? `${month}-${String(d).padStart(2, "0")}` : null;
  });
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const isOverdue = (d: Summary["due"][number]) => d.due_date < today && d.status_category !== "done";
  const pickedItems = byDay.get(picked) ?? [];
  const next = data.due.find((d) => d.due_date > picked && d.status_category !== "done");

  return (
    <Card title="Due dates" className="lg:col-span-2">
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="border-b px-5 py-4 md:border-r md:border-b-0">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="size-7" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft className="size-4" /></Button>
            <p className="text-sm font-medium">{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
            <Button variant="ghost" size="icon" className="size-7" aria-label="Next month" onClick={() => shift(1)}><ChevronRight className="size-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-sm" role="grid" aria-label="Due dates">
            {WEEKDAYS.map((w) => <span key={w} className="text-muted-foreground pb-1 text-xs">{w}</span>)}
            {cells.map((iso, k) => {
              if (!iso) return <span key={k} />;
              const items = byDay.get(iso) ?? [];
              const late = items.some(isOverdue);
              const selected = iso === picked;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setPicked(iso)}
                  aria-pressed={selected}
                  aria-label={`${dayLabel(iso)}${items.length ? `, ${items.length} due` : ""}`}
                  className={cn(
                    "mx-auto flex size-9 flex-col items-center justify-center rounded-lg tabular-nums transition-colors",
                    selected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    iso === today && !selected && "ring-primary ring-1",
                  )}
                >
                  {Number(iso.slice(8))}
                  <span className={cn("mt-0.5 size-1 rounded-full", items.length ? (late ? "bg-red-500" : selected ? "bg-primary-foreground" : "bg-primary") : "bg-transparent")} aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-muted-foreground mb-3 text-xs">Due {picked === today ? "today" : `on ${dayLabel(picked)}`}</p>
          {pickedItems.length === 0 ? (
            <div className="text-sm">
              <p className="text-muted-foreground">Nothing due {picked === today ? "today" : "this day"}.</p>
              {next && (
                <button type="button" className="text-primary mt-2 hover:underline" onClick={() => { setPicked(next.due_date); setMonth(next.due_date.slice(0, 7)); }}>
                  Next due: {next.title} on {dayLabel(next.due_date)}
                </button>
              )}
            </div>
          ) : (
            <ul className="grid gap-2">
              {pickedItems.map((d) => (
                <li key={d.number}>
                  <button
                    type="button"
                    onClick={() => openItem(d.number)}
                    className={cn(
                      "w-full rounded-lg border-l-4 px-3 py-2 text-left transition-colors hover:brightness-95",
                      d.status_category === "done" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" : isOverdue(d) ? "border-red-500 bg-red-50 dark:bg-red-950/40" : "border-sky-500 bg-sky-50 dark:bg-sky-950/40",
                    )}
                  >
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                      <span className="font-mono">{space.space_key}-{d.number}</span>
                      <PriorityIcon priority={d.priority} />
                      <span>{d.assignee_name ?? "Unassigned"}</span>
                      <span className="ml-auto">{d.status_category === "done" ? "Done" : isOverdue(d) ? "Overdue" : "Open"}</span>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function Activity({ data }: { data: Summary }) {
  const { space, openItem } = useSpaceCtx();
  return (
    <Card title="Recent activity">
      {data.activity.length === 0 ? (
        <p className="text-muted-foreground px-5 py-6 text-sm">No activity yet. Create work items and invite teammates to get started.</p>
      ) : (
        <ol className="max-h-[22rem] divide-y overflow-y-auto">
          {data.activity.map((a) => (
            <li key={a.id} className="flex gap-3 px-5 py-2.5 text-sm">
              <UserAvatar name={a.actor} size="xs" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p>
                  <span className="font-medium">{a.actor ?? "Someone"}</span>{" "}
                  {a.action === "created" ? "created" : a.action === "commented" ? "commented on" : a.action.startsWith("attachment") ? "changed attachments on" : `updated ${(a.field ?? "").replaceAll("_", " ")} on`}{" "}
                  <button type="button" className="text-primary hover:underline" onClick={() => openItem(a.item_number)}>{space.space_key}-{a.item_number} {a.item_title}</button>
                </p>
                <p className="text-muted-foreground text-xs"><time title={formatLocalDateTime(a.created_at)}>{timeAgo(a.created_at)}</time></p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function SpaceSummary() {
  const { space, members } = useSpaceCtx();
  const [focused, setFocused] = useState<number | undefined>(undefined);
  const { data, error, refetch } = useSummary(space.space_key, focused);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data) return <Skeleton className="h-96 w-full" />;
  const total = data.counts?.total ?? 0;
  const done = data.byStatus.filter((s) => s.category === "done").reduce((n, s) => n + s.count, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const byPriority = new Map(data.byPriority.map((p) => [p.priority, p.count]));
  const sprint = data.activeSprint;
  const focusedName = members.find((m) => m.user_id === focused)?.full_name;

  return (
    <div className="grid gap-5">
      {/* Where the space stands, at a glance */}
      <div className="bg-card flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border px-5 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="bg-muted h-1.5 w-32 overflow-hidden rounded-full" aria-hidden>
            <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </span>
          <span className="text-sm tabular-nums">{pct}% done</span>
        </div>
        {sprint && (
          <span className="text-sm">
            <span className="font-medium">{sprint.name}</span>
            <span className="text-muted-foreground">
              {sprint.start_date && sprint.end_date ? ` · ${dayLabel(sprint.start_date)} – ${dayLabel(sprint.end_date)}` : ""} · {sprint.done_count} of {sprint.item_count} done
            </span>
          </span>
        )}
        {data.activity[0] && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Clock className="size-3.5" aria-hidden /> Last update {timeAgo(data.activity[0].created_at)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {focusedName && (
            <span className="text-sm">
              Showing {focusedName}&apos;s work{" "}
              <button type="button" className="text-primary hover:underline" onClick={() => setFocused(undefined)}>Show everyone</button>
            </span>
          )}
          <AssigneeFilter members={members} value={focused ? [String(focused)] : []} onChange={(v) => { const last = v.filter((x) => x !== "unassigned").pop(); setFocused(last ? Number(last) : undefined); }} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <People data={data} focusedId={focused} onFocus={setFocused} />
        <InProgress data={data} />
        <Progress data={data} />
        <DueDates data={data} />
        <Activity data={data} />
        <Card title="Work mix" className="lg:col-span-3">
          <div className="grid gap-6 px-5 py-4 md:grid-cols-2">
            <div>
              <h3 className="text-muted-foreground mb-3 text-xs">By priority</h3>
              <Bars total={total} rows={PRIORITIES.map((p) => ({ key: p, label: <PriorityIcon priority={p} withLabel />, count: byPriority.get(p) ?? 0 }))} />
            </div>
            <div>
              <h3 className="text-muted-foreground mb-3 text-xs">By type</h3>
              <Bars total={total} rows={data.byType.map((t) => ({ key: t.type, label: <span className="flex items-center gap-2"><TypeIcon type={t.type} />{ITEM_TYPE_LABELS[t.type]}</span>, count: t.count }))} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
