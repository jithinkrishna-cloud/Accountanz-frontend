"use client";

import { FileCheck2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useEngagements } from "../hooks/use-engagements";
import { ENGAGEMENT_STATUSES, type Engagement, type EngagementStatus } from "../types/engagement.types";
import { EngagementFormDialog } from "./engagement-form-dialog";
import { EngagementSheet } from "./engagement-sheet";

const columns: Column<Engagement>[] = [
  {
    key: "client",
    header: "Client",
    cell: (e) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{e.client_name}</p>
        <p className="text-muted-foreground truncate text-xs">#{e.id}</p>
      </div>
    ),
  },
  {
    key: "package",
    header: "Package",
    hideOnMobile: true,
    cell: (e) => (
      <div>
        <p className="truncate">{e.package_name}</p>
        <p className="text-muted-foreground text-xs tabular-nums">{formatINR(e.monthly_fee)}/mo</p>
      </div>
    ),
  },
  { key: "status", header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
  {
    key: "agreement",
    header: "Agreement",
    hideOnMobile: true,
    cell: (e) =>
      e.agreement_file_name ? (
        <span className="text-primary inline-flex items-center gap-1 text-xs"><FileCheck2 className="size-3.5" aria-hidden /> Signed</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  { key: "start", header: "Start", hideOnMobile: true, cell: (e) => formatDate(e.start_date) },
  { key: "renewal", header: "Renewal", hideOnMobile: true, cell: (e) => formatDate(e.renewal_date) },
];

type Filter = EngagementStatus | "all";

export function EngagementList({ initialOpenId }: { initialOpenId?: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(initialOpenId ?? null);
  const query = useEngagements({ q, status: status === "all" ? undefined : status, page });
  const counts = query.data?.counts;
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  const close = () => {
    setOpenId(null);
    if (initialOpenId) router.replace("/admin/engagements", { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Engagements"
        description="Service agreements from draft to active, with the signed agreement on file."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New engagement</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Filter by status">
        {(["all", ...ENGAGEMENT_STATUSES] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={status === f}
            onClick={() => { setStatus(f); setPage(1); }}
            className={cn(
              "bg-card rounded-xl border px-4 py-3 text-left shadow-xs transition-colors",
              status === f ? "border-primary ring-primary/20 ring-2" : "hover:bg-accent/50",
            )}
          >
            <p className="text-muted-foreground text-xs">{f === "all" ? "All engagements" : humanize(f)}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{(f === "all" ? total : counts?.[f]) ?? "—"}</p>
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-xs">
        <div className="border-b p-4">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by client or package" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(e) => e.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          onRowClick={(e) => setOpenId(e.id)}
          empty={
            q || status !== "all"
              ? { title: "No engagements match", description: "Try a different search or status." }
              : { title: "No engagements yet", description: "Accepting a proposal in Onboarding opens one, or create it here.", action: <Button size="sm" onClick={() => setCreating(true)}>New engagement</Button> }
          }
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>

      <EngagementFormDialog open={creating} onOpenChange={setCreating} onSaved={(e) => setOpenId(e.id)} />
      <EngagementSheet id={openId} onOpenChange={(open) => !open && close()} />
    </>
  );
}
