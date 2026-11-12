"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState } from "./states";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hide on small screens to keep tables readable on phones. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: { title: string; description?: string; action?: React.ReactNode };
  onRowClick?: (row: T) => void;
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };
}

export function DataTable<T>({ columns, rows, rowKey, isLoading, error, onRetry, empty, onRowClick, pagination }: DataTableProps<T>) {
  const colClass = (c: Column<T>) => cn(c.className, c.hideOnMobile && "hidden md:table-cell");

  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={c.key} className={cn("text-muted-foreground text-xs font-medium tracking-wide uppercase", colClass(c))}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={colClass(c)}>
                        <Skeleton className="h-4 w-full max-w-40" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows?.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.key} className={colClass(c)}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {!isLoading && rows?.length === 0 && <EmptyState title={empty?.title ?? "Nothing here yet"} description={empty?.description} action={empty?.action} />}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
