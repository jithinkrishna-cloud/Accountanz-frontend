import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  details?: { label: string; value: React.ReactNode }[];
  loading?: boolean;
  className?: string;
}

export function KpiCard({ label, value, details, loading, className }: KpiCardProps) {
  return (
    <div className={cn("bg-card relative overflow-hidden rounded-xl border p-5 shadow-xs", className)}>
      <div className="from-accent/70 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" aria-hidden />
      <div className="relative">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">{label}</p>
        {loading ? <Skeleton className="mt-4 h-8 w-20" /> : <p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p>}
        {details && (
          <dl className="mt-4 flex gap-8 text-sm">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-muted-foreground text-xs">{d.label}</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{loading ? "—" : d.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
