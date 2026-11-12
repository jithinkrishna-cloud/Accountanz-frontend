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
