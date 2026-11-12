"use client";

import { Clock } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { formatDate, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStaffReviewQueue } from "../hooks/use-reviews";
import type { ReviewQueueItem } from "../types/review.types";
import { ReviewDialog } from "./review-dialog";

const SLOW_REVIEW_DAYS = 2;

/** Accountant portal: submitted work on clients I review. My own work never appears here. */
export function StaffReviewQueue() {
  const { data, isLoading, error, refetch } = useStaffReviewQueue();
  const [reviewing, setReviewing] = useState<ReviewQueueItem | null>(null);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const header = <PageHeader title="Review Queue" description="Submitted tasks across your clients. You can't review work you did yourself." />;
  if (error) return <>{header}<ErrorState error={error} onRetry={() => void refetch()} /></>;

  return (
    <>
      {header}
      <section className="bg-card rounded-xl border shadow-xs">
        <header className="border-b px-5 py-4">
          <h2 className="font-medium">{data ? `${data.length} waiting for review` : "Waiting for review"}</h2>
          <p className="text-muted-foreground text-xs">Longest wait first. Open a task to see its checklist and time before deciding.</p>
        </header>
        {isLoading || !data ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : data.length === 0 ? (
          <EmptyState title="Nothing waiting for you" description="Submitted tasks on your clients appear here." />
        ) : (
          <ul className="divide-y px-5">
            {data.map((item) => (
              <li key={item.task_id} className="flex items-center gap-4 py-3.5">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenTaskId(item.task_id)}>
                  <p className="truncate text-sm font-medium hover:underline">{item.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.client_name} · {formatPeriod(item.period)} · submitted by {item.assignee_email ?? "—"}
                    {item.due_date && ` · due ${formatDate(item.due_date)}`}
                  </p>
                </button>
                <span className={cn("flex shrink-0 items-center gap-1 text-xs tabular-nums", item.waiting_days > SLOW_REVIEW_DAYS ? "text-destructive" : "text-muted-foreground")}>
                  <Clock className="size-3.5" aria-hidden />
                  {item.waiting_days}d
                </span>
                <Button variant="outline" size="sm" onClick={() => setReviewing(item)}>Review</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ReviewDialog portal="team" item={reviewing} onOpenChange={(o) => !o && setReviewing(null)} />
      <TaskDetailSheet portal="team" taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}
