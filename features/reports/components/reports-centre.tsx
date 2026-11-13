"use client";

import { Download, FilePlus2, Send, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useStaffClientOptions } from "@/features/workspace/hooks/use-workspace";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatPeriod } from "@/lib/format";
import type { StaffPortal } from "@/types/auth";
import { useDeleteReport, usePublishReport, useReports, useUnpublishReport } from "../hooks/use-reports";
import { reportFileUrl } from "../services/report-service";
import { REPORT_LABELS, type Report } from "../types/report.types";
import { NewReportDialog } from "./new-report-dialog";

function ReportActions({ portal, report }: { portal: StaffPortal; report: Report }) {
  const publish = usePublishReport(portal);
  const unpublish = useUnpublishReport(portal);
  const remove = useDeleteReport(portal);
  const label = `${REPORT_LABELS[report.report_type]} ${formatPeriod(report.period)}`;
  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      toast.success(done);
    } catch (err) {
      applyApiError(err);
    }
  };
  const busy = publish.isPending || unpublish.isPending || remove.isPending;
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {report.has_file && (
        <Button variant="ghost" size="sm" asChild>
          <a href={reportFileUrl(portal, report.id)} target="_blank" rel="noopener" aria-label={`Download ${label}`}><Download className="size-4" /></a>
        </Button>
      )}
      {report.published_date ? (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => unpublish.mutateAsync(report.id), `${label} taken back to draft`)}>
          <Undo2 className="size-4" /> Unpublish
        </Button>
      ) : (
        <>
          <Button size="sm" disabled={busy} onClick={() => void run(() => publish.mutateAsync(report.id), `${label} published. The client has been emailed.`)}>
            <Send className="size-4" /> Publish
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} aria-label={`Delete draft ${label}`} onClick={() => void run(() => remove.mutateAsync(report.id), "Draft deleted")}>
            <Trash2 className="size-4" />
          </Button>
        </>
      )}
    </div>
  );
}

const columns = (portal: StaffPortal): Column<Report>[] => [
  {
    key: "report",
    header: "Report",
    cell: (r) => (
      <div className="min-w-0">
        <p className="font-medium">{REPORT_LABELS[r.report_type]} · {formatPeriod(r.period)}</p>
        {r.summary && <p className="text-muted-foreground line-clamp-2 max-w-md text-xs">{r.summary}</p>}
      </div>
    ),
  },
  { key: "client", header: "Client", cell: (r) => r.client_name },
  { key: "prepared", header: "Prepared by", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.prepared_by_name ?? "—"}</span> },
  {
    key: "status",
    header: "Status",
    cell: (r) =>
      r.published_date ? (
        <div>
          <StatusBadge status="published" />
          <p className="text-muted-foreground mt-1 text-xs">{formatDate(r.published_date)}{r.approved_by_name ? ` · ${r.approved_by_name}` : ""}</p>
        </div>
      ) : (
        <StatusBadge status="draft" />
      ),
  },
  { key: "actions", header: "", cell: (r) => <ReportActions portal={portal} report={r} /> },
];

export function ReportsCentre({ portal }: { portal: StaffPortal }) {
  const clients = useStaffClientOptions(portal);
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState<string>();
  const [state, setState] = useState<"draft" | "published">();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const reports = useReports(portal, { q, client_id: clientId, state, page });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Prepare monthly reports and publish them to the client portal. Publishing needs a reviewer on the client, or an admin."
        actions={<Button onClick={() => setCreating(true)}><FilePlus2 className="size-4" /> New report</Button>}
      />
      <section className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col flex-wrap gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search reports" />
          <FilterSelect allLabel="All clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1); }} options={clients.data ?? []} />
          <FilterSelect
            allLabel="Drafts and published"
            value={state}
            onChange={(v) => { setState(v as "draft" | "published" | undefined); setPage(1); }}
            options={[{ value: "draft", label: "Drafts" }, { value: "published", label: "Published" }]}
          />
        </div>
        <DataTable
          columns={columns(portal)}
          rows={reports.data?.items}
          rowKey={(r) => r.id}
          isLoading={reports.isLoading}
          error={reports.error}
          onRetry={() => void reports.refetch()}
          empty={{ title: "No reports yet", description: "Create a draft, then publish it once it's reviewed." }}
          pagination={reports.data && { ...reports.data, onPageChange: setPage }}
        />
      </section>
      <NewReportDialog portal={portal} open={creating} onOpenChange={setCreating} />
    </>
  );
}
