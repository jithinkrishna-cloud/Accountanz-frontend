"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { formatPeriod, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClosingGrid, useSetClosingStatus } from "../hooks/use-closing";
import { type OverrideRequest, ReadyOverrideDialog } from "./ready-override-dialog";
import { CLOSING_STATUSES, type ClosingCell, type ClosingRow, type ClosingStatus } from "../types/closing.types";

const STATUS_STYLE: Record<ClosingStatus, string> = {
  open: "",
  ready: "border-amber-300 bg-amber-50 text-amber-800",
  closed: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

/** The server lists open checklist items when it refuses "ready" without a reason. */
function openItems(err: unknown): string[] | null {
  if (!(err instanceof ApiError) || err.code !== "CONFLICT" || !err.fieldErrors.reason) return null;
  const missing = (err.details as { missing?: unknown } | undefined)?.missing;
  return Array.isArray(missing) && missing.every((m) => typeof m === "string") ? missing : [err.message];
}

function Cell({ row, period, cell }: { row: ClosingRow; period: string; cell: ClosingCell }) {
  const setStatus = useSetClosingStatus();
  const [override, setOverride] = useState<OverrideRequest | null>(null);
  const change = async (status: string) => {
    try {
      await setStatus.mutateAsync({ clientId: row.client_id, period, status: status as ClosingStatus });
      toast.success(`${formatPeriod(period)} ${status} for ${row.client_name}`);
    } catch (err) {
      const missing = openItems(err);
      if (missing) setOverride({ clientName: row.client_name, periodLabel: formatPeriod(period), missing });
      else applyApiError(err);
    }
  };
  const confirmOverride = async (reason: string) => {
    await setStatus.mutateAsync({ clientId: row.client_id, period, status: "ready", reason });
    toast.success(`${formatPeriod(period)} ready for ${row.client_name}, reason recorded`);
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
      {cell.ready_override && cell.status !== "open" && (
        <span className="max-w-40 text-xs text-amber-800" title={cell.ready_override}>
          <span className="font-medium">Override:</span> <span className="line-clamp-2">{cell.ready_override}</span>
        </span>
      )}
      <ReadyOverrideDialog request={override} pending={setStatus.isPending} onConfirm={confirmOverride} onClose={() => setOverride(null)} />
    </div>
  );
}

export function ClosingGrid() {
  const { data, isLoading, error, refetch } = useClosingGrid();
  const header = <PageHeader title="Month-End Closing" description="Client by period: open, ready to close, or closed. Ready needs a complete checklist or a recorded reason; every change is audited." />;
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
