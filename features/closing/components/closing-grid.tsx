"use client";

import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyApiError } from "@/lib/form-errors";
import { formatPeriod, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClosingGrid, useSetClosingStatus } from "../hooks/use-closing";
import { CLOSING_STATUSES, type ClosingCell, type ClosingRow, type ClosingStatus } from "../types/closing.types";

const STATUS_STYLE: Record<ClosingStatus, string> = {
  open: "",
  ready: "border-amber-300 bg-amber-50 text-amber-800",
  closed: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

function Cell({ row, period, cell }: { row: ClosingRow; period: string; cell: ClosingCell }) {
  const setStatus = useSetClosingStatus();
  const change = async (status: string) => {
    try {
      await setStatus.mutateAsync({ clientId: row.client_id, period, status: status as ClosingStatus });
      toast.success(`${formatPeriod(period)} ${status} for ${row.client_name}`);
    } catch (err) {
      applyApiError(err);
    }
  };
  const allApproved = cell.total > 0 && cell.approved === cell.total;
  return (
    <div className="grid gap-1">
      <Select value={cell.status} onValueChange={change} disabled={setStatus.isPending}>
        <SelectTrigger size="sm" className={cn("w-28", STATUS_STYLE[cell.status])} aria-label={`${row.client_name} ${formatPeriod(period)}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{CLOSING_STATUSES.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent>
      </Select>
      <span className={cn("text-xs tabular-nums", allApproved ? "text-emerald-700" : "text-muted-foreground")}>
        {cell.total === 0 ? "no tasks" : `${cell.approved}/${cell.total} approved`}
      </span>
    </div>
  );
}

export function ClosingGrid() {
  const { data, isLoading, error, refetch } = useClosingGrid();
  const header = <PageHeader title="Month-End Closing" description="Client by period: open, ready to close, or closed. Closing writes an audit entry." />;
  if (error) return <>{header}<ErrorState error={error} onRetry={() => void refetch()} /></>;

  return (
    <>
      {header}
      <div className="bg-card rounded-xl border shadow-xs">
        {isLoading || !data ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : data.rows.length === 0 ? (
          <EmptyState title="No clients yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Client</TableHead>
                  {data.periods.map((p) => (
                    <TableHead key={p} className="text-muted-foreground text-xs font-medium tracking-wide whitespace-nowrap uppercase">{formatPeriod(p)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.client_id}>
                    <TableCell className="min-w-40">
                      <p className="font-medium">{row.client_name}</p>
                      <StatusBadge status={row.client_status} className="mt-1" />
                    </TableCell>
                    {data.periods.map((p) => (
                      <TableCell key={p}>
                        <Cell row={row} period={p} cell={row.cells[p]!} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
