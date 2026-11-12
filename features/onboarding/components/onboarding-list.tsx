"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOnboardingCases } from "../hooks/use-onboarding";
import { ONBOARDING_STAGES, STAGE_LABELS, type OnboardingCase, type OnboardingStage } from "../types/onboarding.types";
import { OnboardingCaseSheet } from "./onboarding-case-sheet";
import { ProspectFormDialog } from "./prospect-form-dialog";

const columns: Column<OnboardingCase>[] = [
  {
    key: "prospect",
    header: "Prospect",
    cell: (c) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{c.client_name}</p>
        <p className="text-muted-foreground truncate text-xs">{c.state ?? c.legal_name}</p>
      </div>
    ),
  },
  { key: "stage", header: "Stage", cell: (c) => <StatusBadge status={c.stage} label={STAGE_LABELS[c.stage]} /> },
  { key: "complexity", header: "Complexity", hideOnMobile: true, cell: (c) => (c.complexity ? humanize(c.complexity) : "—") },
  { key: "volume", header: "Txns / month", hideOnMobile: true, cell: (c) => <span className="tabular-nums">{c.monthly_transaction_volume ?? "—"}</span> },
  {
    key: "package",
    header: "Suggested package",
    hideOnMobile: true,
    cell: (c) =>
      c.suggested_package_name ? (
        <div>
          <p className="truncate">{c.suggested_package_name}</p>
          <p className="text-muted-foreground text-xs tabular-nums">{formatINR(c.suggested_monthly_fee)}/mo</p>
        </div>
      ) : (
        "—"
      ),
  },
  { key: "updated", header: "Updated", hideOnMobile: true, cell: (c) => formatDate(c.updated_at) },
];

type Filter = OnboardingStage | "all";

export function OnboardingList() {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<OnboardingCase | null>(null);
  const query = useOnboardingCases({ q, stage: stage === "all" ? undefined : stage, page });
  const counts = query.data?.counts;
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  const pick = (f: Filter) => {
    setStage(f);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Onboarding"
        description="Every prospective client, from registration to a signed proposal."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New prospect</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Filter by stage">
        {(["all", ...ONBOARDING_STAGES] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={stage === f}
            onClick={() => pick(f)}
            className={cn(
              "bg-card rounded-xl border px-4 py-3 text-left shadow-xs transition-colors",
              stage === f ? "border-primary ring-primary/20 ring-2" : "hover:bg-accent/50",
            )}
          >
            <p className="text-muted-foreground text-xs">{f === "all" ? "All prospects" : STAGE_LABELS[f]}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{(f === "all" ? total : counts?.[f]) ?? "—"}</p>
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-xs">
        <div className="border-b p-4">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name or GSTIN" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(c) => c.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          onRowClick={setSelected}
          empty={
            q || stage !== "all"
              ? { title: "No prospects match", description: "Try a different search or stage." }
              : { title: "No prospects yet", description: "Add the first business you're talking to.", action: <Button size="sm" onClick={() => setCreating(true)}>New prospect</Button> }
          }
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>

      <ProspectFormDialog open={creating} onOpenChange={setCreating} onCreated={setSelected} />
      <OnboardingCaseSheet row={selected} onOpenChange={(open) => !open && setSelected(null)} onChanged={setSelected} />
    </>
  );
}
