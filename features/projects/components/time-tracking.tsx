"use client";

import { Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/hooks/use-session";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DURATION_HINT, formatMinutes, parseDuration } from "../duration";
import { useAddWorklog, useDeleteWorklog, useWorklogs } from "../hooks/use-projects";
import type { ItemDetail } from "../types/project.types";
import { UserAvatar } from "./project-ui";
import { useSpaceCtx } from "./space-layout";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Logged time against the estimate, as one bar: "No time logged · 1d 4h remaining". Over the estimate the bar
 * turns amber and says by how much. Clicking it logs time.
 */
export function TimeTrackingBar({ item, onLog }: { item: ItemDetail; onLog: () => void }) {
  const spent = item.time_spent_minutes ?? 0;
  const estimate = item.original_estimate_minutes;
  const over = estimate != null && spent > estimate;
  const scale = Math.max(estimate ?? 0, spent) || 1;
  const left = spent ? `${formatMinutes(spent)} logged` : "No time logged";
  const right = estimate == null ? (spent ? "No estimate" : "") : over ? `${formatMinutes(spent - estimate)} over` : `${formatMinutes(estimate - spent) || "0m"} remaining`;
  return (
    <button type="button" onClick={onLog} className="hover:bg-muted group w-full rounded-md px-2 py-1.5 text-left" aria-label={`Time tracking: ${left}${right ? `, ${right}` : ""}. Log time`}>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div className={cn("h-full rounded-full transition-[width]", over ? "bg-amber-500" : "bg-sky-500")} style={{ width: `${Math.min(100, (spent / scale) * 100)}%` }} />
      </div>
      <div className="mt-1 flex justify-between gap-2 text-xs whitespace-nowrap">
        <span className={cn(!spent && "text-muted-foreground")}>{left}</span>
        <span className={cn(over ? "font-medium text-amber-700" : "text-muted-foreground")}>{right}</span>
      </div>
    </button>
  );
}

/** Log work: how long (1h 30m, 2h…), which day, and an optional note. */
export function LogTimeDialog({ item, open, onOpenChange }: { item: ItemDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { space } = useSpaceCtx();
  const add = useAddWorklog(space.space_key, item.number);
  const [spent, setSpent] = useState("");
  const [day, setDay] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const minutes = parseDuration(spent);
  const estimate = item.original_estimate_minutes;
  const after = (item.time_spent_minutes ?? 0) + (minutes ?? 0);

  const close = () => {
    onOpenChange(false);
    setSpent("");
    setNote("");
    setDay(todayIso());
    setError(undefined);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutes) return setError(`Enter the time spent, ${DURATION_HINT}`);
    if (minutes > 24 * 60) return setError("Log at most 24h in one entry");
    try {
      await add.mutateAsync({ minutes, work_date: day, note: note.trim() || null });
      toast.success(`${formatMinutes(minutes)} logged on ${item.key}`);
      close();
    } catch (err) {
      setError(applyApiError(err));
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log time on {item.key}</DialogTitle>
          <DialogDescription>{item.title}</DialogDescription>
        </DialogHeader>
        <form id="log-time-form" onSubmit={(e) => void submit(e)} className="grid gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <FormField id="time-spent" label="Time spent" error={error} hint={DURATION_HINT}>
              <Input id="time-spent" autoFocus placeholder="1h 30m" value={spent} onChange={(e) => (setSpent(e.target.value), setError(undefined))} aria-invalid={!!error} />
            </FormField>
            <FormField id="work-date" label="Date">
              <Input id="work-date" type="date" value={day} max={todayIso()} onChange={(e) => setDay(e.target.value)} />
            </FormField>
          </div>
          <div className="bg-muted/50 rounded-lg border px-3 py-2 text-xs">
            <span className="text-muted-foreground">After this: </span>
            <span className="font-medium">{formatMinutes(after) || "0m"} logged</span>
            {estimate != null && (
              <span className={cn("ml-1", after > estimate ? "font-medium text-amber-700" : "text-muted-foreground")}>
                · {after > estimate ? `${formatMinutes(after - estimate)} over the ${formatMinutes(estimate)} estimate` : `${formatMinutes(estimate - after) || "0m"} remaining of ${formatMinutes(estimate)}`}
              </span>
            )}
          </div>
          <FormField id="work-note" label="What did you work on?" hint="Optional.">
            <Textarea id="work-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <SubmitButton form="log-time-form" pending={add.isPending}><Clock className="size-4" /> Log time</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The "Work log" tab: every entry, newest first. Your own entries (or any, for Administrators) can be removed. */
export function WorklogList({ item, onLog }: { item: ItemDetail; onLog: () => void }) {
  const { space, isAdmin } = useSpaceCtx();
  const { data: me } = useSession();
  const logs = useWorklogs(space.space_key, item.number, true);
  const del = useDeleteWorklog(space.space_key, item.number);
  if (!logs.data) return <Skeleton className="h-16 w-full" />;
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{item.time_spent_minutes ? `${formatMinutes(item.time_spent_minutes)} logged in total` : "No time logged yet."}</p>
        <Button size="sm" variant="outline" onClick={onLog}><Clock className="size-4" /> Log time</Button>
      </div>
      {logs.data.map((w) => (
        <div key={w.id} className="flex gap-3">
          <UserAvatar name={w.user_name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">{w.user_name ?? "Former user"}</span> logged <span className="font-medium">{formatMinutes(w.minutes)}</span>{" "}
              <span className="text-muted-foreground text-xs">on {formatDate(w.work_date)}</span>
            </p>
            {w.note && <p className="text-muted-foreground mt-0.5 text-sm whitespace-pre-line">{w.note}</p>}
          </div>
          {(w.user_id === me?.id || isAdmin) && (
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label={`Remove ${formatMinutes(w.minutes)} logged on ${formatDate(w.work_date)}`}
              disabled={del.isPending}
              onClick={() => void del.mutateAsync(w.id).catch((err) => applyApiError(err))}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
