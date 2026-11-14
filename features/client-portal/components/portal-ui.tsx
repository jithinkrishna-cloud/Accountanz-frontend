import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";

/** Small layout pieces shared by the client portal pages. */
export function Card({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-medium">{title}</h2>
          {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** Loading / error / empty handling for a list, so each page only renders its rows. */
export function ListBody<T>({ query, empty, children }: { query: { data?: T[]; isLoading: boolean; error: unknown; refetch: () => unknown }; empty: { title: string; description?: string }; children: (rows: T[]) => React.ReactNode }) {
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (query.data.length === 0) return <EmptyState title={empty.title} description={empty.description} />;
  return <>{children(query.data)}</>;
}

/** Client-friendly task status (clients don't need the review workflow vocabulary). */
export const CLIENT_TASK_STATUS: Record<string, { label: string; tone: string }> = {
  todo: { label: "Not started", tone: "lead" },
  in_progress: { label: "In progress", tone: "in_progress" },
  returned: { label: "In progress", tone: "in_progress" },
  submitted: { label: "In review", tone: "submitted" },
  approved: { label: "Done", tone: "approved" },
};

/** What each role does for the client, in plain words (shared by packages, proposals and the team page). */
export const ROLE_INFO: Record<string, { label: string; does: string }> = {
  bookkeeper: { label: "Bookkeeper", does: "Does your day-to-day bookkeeping" },
  finance_manager: { label: "Finance manager", does: "Reviews your accounts every month" },
  reviewer: { label: "Reviewer", does: "Reviews your accounts every month" },
  cfo: { label: "CFO", does: "Financial review, insights and advice" },
};

/** "Your team" for a package: the roles included, not named people (people are assigned when the service starts). */
export function TeamIncluded({ roles, className }: { roles: string[]; className?: string }) {
  if (!roles.length) return null;
  return (
    <div className={className}>
      <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">Your team</p>
      <ul className="grid gap-1 text-sm">
        {roles.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="bg-primary/10 text-primary mt-0.5 inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[11px] font-medium">{ROLE_INFO[r]?.label ?? r}</span>
            <span className="text-muted-foreground">{ROLE_INFO[r]?.does}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
