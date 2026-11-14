"use client";

import { Bookmark, Bug, CheckSquare, ChevronDown, ChevronsDown, ChevronsUp, ChevronUp, Equal, GitBranch, User } from "lucide-react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, ITEM_TYPE_LABELS, PRIORITY_LABELS, type ItemType, type Member, type Priority, type StatusCategory } from "../types/project.types";

const TYPE_ICON: Record<ItemType, { icon: typeof Bug; className: string }> = {
  task: { icon: CheckSquare, className: "text-sky-600" },
  bug: { icon: Bug, className: "text-red-600" },
  story: { icon: Bookmark, className: "text-emerald-600" },
  subtask: { icon: GitBranch, className: "text-violet-600" },
};

export function TypeIcon({ type, className }: { type: ItemType; className?: string }) {
  const { icon: Icon, className: tone } = TYPE_ICON[type];
  return <Icon className={cn("size-4 shrink-0", tone, className)} aria-label={ITEM_TYPE_LABELS[type]} />;
}

const PRIORITY_ICON: Record<Priority, { icon: typeof Equal; className: string }> = {
  highest: { icon: ChevronsUp, className: "text-red-600" },
  high: { icon: ChevronUp, className: "text-orange-600" },
  medium: { icon: Equal, className: "text-amber-500" },
  low: { icon: ChevronDown, className: "text-sky-600" },
  lowest: { icon: ChevronsDown, className: "text-sky-500" },
};

export function PriorityIcon({ priority, withLabel, className }: { priority: Priority; withLabel?: boolean; className?: string }) {
  const { icon: Icon, className: tone } = PRIORITY_ICON[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={PRIORITY_LABELS[priority]}>
      <Icon className={cn("size-4 shrink-0", tone)} aria-label={withLabel ? undefined : PRIORITY_LABELS[priority]} />
      {withLabel && <span>{PRIORITY_LABELS[priority]}</span>}
    </span>
  );
}

const AVATAR_TONES = ["bg-emerald-600", "bg-amber-500", "bg-sky-600", "bg-violet-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600"];
const toneFor = (name: string) => AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

export function UserAvatar({ name, size = "sm", className }: { name: string | null; size?: "xs" | "sm" | "md"; className?: string }) {
  const dims = size === "xs" ? "size-5 text-[9px]" : size === "md" ? "size-8 text-xs" : "size-6 text-[10px]";
  if (!name) {
    return (
      <span className={cn("bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-full", dims, className)} title="Unassigned">
        <User className="size-3/5" aria-label="Unassigned" />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", dims, toneFor(name), className)} title={name}>
      {initials(name)}
    </span>
  );
}

const CATEGORY_TONE: Record<StatusCategory, string> = {
  todo: "bg-muted text-foreground",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

export function StatusPill({ name, category, className }: { name: string; category: StatusCategory; className?: string }) {
  return <span className={cn("inline-flex max-w-full items-center truncate rounded px-2 py-0.5 text-xs font-semibold uppercase", CATEGORY_TONE[category], className)} title={CATEGORY_LABELS[category]}>{name}</span>;
}

/** Avatar toggles that filter by assignee ("unassigned" is its own toggle), as on the board. */
export function AssigneeFilter({ members, value, onChange }: { members: Member[] | undefined; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const options = [{ id: "unassigned", name: null as string | null }, ...(members ?? []).map((m) => ({ id: String(m.user_id), name: m.full_name }))];
  return (
    <div className="flex items-center -space-x-1" role="group" aria-label="Filter by assignee">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            aria-label={`Filter by ${o.name ?? "Unassigned"}`}
            onClick={() => toggle(o.id)}
            className={cn("rounded-full ring-2 transition-transform hover:z-10 hover:-translate-y-0.5", on ? "ring-primary z-10" : "ring-background")}
          >
            <UserAvatar name={o.name} size="md" />
          </button>
        );
      })}
    </div>
  );
}

export const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
