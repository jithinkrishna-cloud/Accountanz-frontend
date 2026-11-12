"use client";

import { Clock } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useReviewOverview } from "../hooks/use-reviews";
import type { ReviewQueueItem } from "../types/review.types";
import { ReviewDialog } from "./review-dialog";

/** Waits longer than this are highlighted (matches the dashboard's "Over 2 days"). */
const SLOW_REVIEW_DAYS = 2;

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <header className="border-b px-5 py-4">
        <h2 className="font-medium">{title}</h2>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function ListSkeleton() {
  return <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}

export function ReviewOverview() {
  const { data, isLoading, error, refetch } = useReviewOverview();
  const [reviewing, setReviewing] = useState<ReviewQueueItem | null>(null);

  const header = <PageHeader title="Reviews & Approvals" description="Submitted work waiting on a reviewer, plus quality per accountant." />;
  if (error) return <>{header}<ErrorState error={error} onRetry={() => void refetch()} /></>;

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel title={`Review queue${data ? ` (${data.queue.length})` : ""}`} subtitle="Longest wait first.">
            {isLoading || !data ? (
              <ListSkeleton />
            ) : data.queue.length === 0 ? (
              <EmptyState title="Nothing waiting for review" description="Submitted tasks appear here." />
            ) : (
              <ul className="divide-y px-5">
                {data.queue.map((item) => {
                  const slow = item.waiting_days > SLOW_REVIEW_DAYS;
                  return (
                    <li key={item.task_id} className="flex items-center gap-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.client_name} · {formatPeriod(item.period)}
                          {item.assignee_email && ` · ${item.assignee_email}`}
                        </p>
                      </div>
                      <span
                        className={cn("flex shrink-0 items-center gap-1 text-xs tabular-nums", slow ? "text-destructive" : "text-muted-foreground")}
                        title={`Waiting ${item.waiting_days} day(s)`}
                      >
                        <Clock className="size-3.5" aria-hidden />
                        {item.waiting_days}d
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setReviewing(item)}>Review</Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel title="Quality by accountant" subtitle="First-submission approvals and returns.">
            {isLoading || !data ? (
              <ListSkeleton />
            ) : data.quality.length === 0 ? (
              <EmptyState title="No reviews yet" description="Quality appears once work has been reviewed." />
            ) : (
              <ul className="divide-y px-5">
                {data.quality.map((q) => (
                  <li key={q.user_id} className="py-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{q.full_name}</p>
                        <p className="text-muted-foreground text-xs">{q.returns} return(s)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold tabular-nums">{q.approved_first_pct}%</p>
                        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">Approved first</p>
                      </div>
                    </div>
                    <div
                      className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full"
                      role="progressbar"
                      aria-valuenow={q.approved_first_pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${q.full_name}: ${q.approved_first_pct}% approved first time`}
                    >
                      <div className="bg-primary h-full rounded-full" style={{ width: `${q.approved_first_pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      <ReviewDialog item={reviewing} onOpenChange={(open) => !open && setReviewing(null)} />
    </>
  );
}
