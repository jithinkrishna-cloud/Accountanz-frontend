"use client";

import { CalendarPlus, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/hooks/use-session";
import { useStaffClientOptions } from "@/features/workspace/hooks/use-workspace";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import type { StaffPortal } from "@/types/auth";
import { useCancelMeeting, useMeetings } from "../hooks/use-communication";
import { formatMeetingTime, parseUtc } from "@/lib/format";
import type { Meeting } from "../types/communication.types";
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog";


function CancelButton({ portal, meeting }: { portal: StaffPortal; meeting: Meeting }) {
  const cancel = useCancelMeeting(portal);
  const run = async () => {
    try {
      await cancel.mutateAsync(meeting.id);
      toast.success(`${meeting.title} cancelled`);
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Button variant="ghost" size="sm" disabled={cancel.isPending} onClick={() => void run()} aria-label={`Cancel ${meeting.title}`}>
      <X className="size-4" /> Cancel
    </Button>
  );
}

export function StaffMeetings({ portal }: { portal: StaffPortal }) {
  const clients = useStaffClientOptions(portal);
  const { data: me } = useSession();
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [clientId, setClientId] = useState<string>();
  const [page, setPage] = useState(1);
  const [scheduling, setScheduling] = useState(false);
  const meetings = useMeetings(portal, { when, client_id: clientId, page });

  const columns: Column<Meeting>[] = [
    {
      key: "title",
      header: "Meeting",
      cell: (m) => (
        <div className="min-w-0">
          <p className="font-medium">{m.title}</p>
          <p className="text-muted-foreground text-xs">{formatMeetingTime(m.starts_at, m.ends_at)}</p>
        </div>
      ),
    },
    { key: "client", header: "Client", cell: (m) => m.client_name },
    { key: "organiser", header: "Organiser", hideOnMobile: true, cell: (m) => <span className="text-muted-foreground">{m.organiser ?? "—"}</span> },
    { key: "attendees", header: "Invited", hideOnMobile: true, cell: (m) => <span className="text-muted-foreground line-clamp-2 max-w-xs text-xs">{m.attendees ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      cell: (m) => (
        <div className="flex justify-end gap-1">
          {m.meeting_link && when === "upcoming" && (
            <Button variant="outline" size="sm" asChild>
              <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Join</a>
            </Button>
          )}
          {when === "upcoming" && (m.organiser_id === me?.id || portal === "admin") && parseUtc(m.starts_at) > new Date() && <CancelButton portal={portal} meeting={m} />}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Meetings"
        description="Meetings with clients. Clients see them in their portal."
        actions={<Button onClick={() => setScheduling(true)}><CalendarPlus className="size-4" /> Schedule meeting</Button>}
      />
      <section className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col flex-wrap gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div role="tablist" aria-label="When" className="bg-muted inline-grid grid-cols-2 rounded-lg p-1 text-sm">
            {(["upcoming", "past"] as const).map((w) => (
              <button
                key={w}
                role="tab"
                type="button"
                aria-selected={when === w}
                onClick={() => { setWhen(w); setPage(1); }}
                className={cn("rounded-md px-4 py-1.5 font-medium capitalize", when === w ? "bg-card shadow-xs" : "text-muted-foreground")}
              >
                {w}
              </button>
            ))}
          </div>
          <FilterSelect allLabel="All clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1); }} options={clients.data ?? []} />
        </div>
        <DataTable
          columns={columns}
          rows={meetings.data?.items}
          rowKey={(m) => m.id}
          isLoading={meetings.isLoading}
          error={meetings.error}
          onRetry={() => void meetings.refetch()}
          empty={{ title: when === "upcoming" ? "No upcoming meetings" : "No past meetings", description: when === "upcoming" ? "Schedule one with a client." : undefined }}
          pagination={meetings.data && { ...meetings.data, onPageChange: setPage }}
        />
      </section>
      <ScheduleMeetingDialog portal={portal} open={scheduling} onOpenChange={setScheduling} />
    </>
  );
}
