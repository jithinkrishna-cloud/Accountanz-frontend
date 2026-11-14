"use client";

import { CalendarClock, CircleCheck, FilePlus2, PenLine } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLocalDateTime } from "@/lib/format";
import { useSummary } from "../hooks/use-projects";
import { ITEM_TYPE_LABELS, PRIORITIES } from "../types/project.types";
import { AssigneeFilter, PriorityIcon, StatusPill, TypeIcon } from "./project-ui";
import { useSpaceCtx } from "./space-layout";

function Stat({ icon: Icon, value, label, sub }: { icon: typeof CircleCheck; value: number; label: string; sub: string }) {
  return (
    <div className="bg-card flex items-center gap-4 rounded-xl border p-4 shadow-xs">
      <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg"><Icon className="size-5" aria-hidden /></span>
      <div>
        <p className="text-lg font-semibold tabular-nums">{value} {label}</p>
        <p className="text-muted-foreground text-sm">{sub}</p>
      </div>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border p-5 shadow-xs">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted-foreground mb-4 text-sm">{description}</p>
      {children}
    </section>
  );
}

/** One horizontal bar per row; value and share are printed, so nothing depends on colour. */
function Bars({ rows, total }: { rows: { key: string; label: React.ReactNode; count: number }[]; total: number }) {
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 text-sm">
          <span className="min-w-0 truncate">{r.label}</span>
          <span className="bg-muted h-2.5 overflow-hidden rounded-full" title={`${r.count}`}>
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

export function SpaceSummary() {
  const { space, members, openItem } = useSpaceCtx();
  const [assignees, setAssignees] = useState<string[]>([]);
  const single = assignees.length === 1 && assignees[0] !== "unassigned" ? Number(assignees[0]) : undefined;
  const { data, error, refetch } = useSummary(space.space_key, single);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data) return <Skeleton className="h-96 w-full" />;
  const c = data.counts ?? { completed: 0, updated: 0, created: 0, due_soon: 0, total: 0 };
  const total = c.total;
  const byPriority = new Map(data.byPriority.map((p) => [p.priority, p.count]));

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <AssigneeFilter members={members} value={assignees} onChange={(v) => setAssignees(v.filter((x) => x !== "unassigned").slice(-1))} />
        <span className="text-muted-foreground text-sm">{single ? "Showing one person's work" : "Showing everyone's work"}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={CircleCheck} value={c.completed} label="completed" sub="in the last 7 days" />
        <Stat icon={PenLine} value={c.updated} label="updated" sub="in the last 7 days" />
        <Stat icon={FilePlus2} value={c.created} label="created" sub="in the last 7 days" />
        <Stat icon={CalendarClock} value={c.due_soon} label="due soon" sub="in the next 7 days" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Status overview" description={`${total} work item${total === 1 ? "" : "s"} in this space.`}>
          <Bars total={total} rows={data.byStatus.map((s) => ({ key: String(s.id), label: <StatusPill name={s.name} category={s.category} />, count: s.count }))} />
        </Panel>
        <Panel title="Recent activity" description="The latest changes across the space.">
          {data.activity.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No activity yet. Create work items and invite teammates to get started.</p>
          ) : (
            <ul className="grid gap-3">
              {data.activity.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium">{a.actor ?? "Someone"}</span>{" "}
                  {a.action === "created" ? "created" : a.action === "commented" ? "commented on" : a.action.startsWith("attachment") ? "changed attachments on" : `updated ${(a.field ?? "").replaceAll("_", " ")} on`}{" "}
                  <button type="button" className="text-primary hover:underline" onClick={() => openItem(a.item_number)}>{space.space_key}-{a.item_number} {a.item_title}</button>
                  <span className="text-muted-foreground block text-xs">{formatLocalDateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Priority breakdown" description="How work is prioritised.">
          <Bars total={total} rows={PRIORITIES.map((p) => ({ key: p, label: <PriorityIcon priority={p} withLabel />, count: byPriority.get(p) ?? 0 }))} />
        </Panel>
        <Panel title="Types of work" description="Work items by type.">
          <Bars total={total} rows={data.byType.map((t) => ({ key: t.type, label: <span className="flex items-center gap-2"><TypeIcon type={t.type} />{ITEM_TYPE_LABELS[t.type]}</span>, count: t.count }))} />
        </Panel>
      </div>
    </div>
  );
}
