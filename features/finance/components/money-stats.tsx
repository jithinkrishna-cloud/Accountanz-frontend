import { Skeleton } from "@/components/ui/skeleton";

/** A row of compact figure cards used on the finance pages. */
export function MoneyStats({ stats, loading }: { stats: { label: string; value: string }[]; loading?: boolean }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-card rounded-xl border p-5 shadow-xs">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">{s.label}</p>
          {loading ? <Skeleton className="mt-3 h-7 w-28" /> : <p className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</p>}
        </div>
      ))}
    </div>
  );
}
