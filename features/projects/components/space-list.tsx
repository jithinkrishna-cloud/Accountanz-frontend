"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { useClientOptions, useSpaces } from "../hooks/use-projects";
import { SPACE_ROLE_LABELS, type Space } from "../types/project.types";

const columns: Column<Space>[] = [
  {
    key: "name",
    header: "Name",
    cell: (s) => (
      <div className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold">{s.space_key.slice(0, 2)}</span>
        <div className="min-w-0">
          <p className="truncate font-medium">{s.name}</p>
          <p className="text-muted-foreground font-mono text-xs">{s.space_key}</p>
        </div>
      </div>
    ),
  },
  { key: "template", header: "Type", hideOnMobile: true, cell: (s) => (s.template === "scrum" ? "Scrum" : "Kanban") },
  { key: "client", header: "Client", hideOnMobile: true, cell: (s) => s.client_name ?? <span className="text-muted-foreground">—</span> },
  { key: "admins", header: "Administrators", hideOnMobile: true, cell: (s) => <span className="text-sm">{s.admins ?? "—"}</span> },
  { key: "items", header: "Work items", className: "text-right", cell: (s) => s.item_count },
  { key: "role", header: "My role", hideOnMobile: true, cell: (s) => (s.my_role ? SPACE_ROLE_LABELS[s.my_role] : <span className="text-muted-foreground text-xs">Super admin</span>) },
];

export function SpaceList() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState<string>();
  const query = useSpaces({ q: q || undefined, client_id: clientId ? Number(clientId) : undefined });
  const clients = useClientOptions();

  return (
    <>
      <PageHeader
        title="Spaces"
        description="Plan and track the team's projects. Link a space to a client when the work is for one."
        actions={
          <Button asChild>
            <Link href="/projects/new"><Plus className="size-4" /> Create space</Link>
          </Button>
        }
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Search spaces" />
          <FilterSelect allLabel="All clients" value={clientId} onChange={setClientId} options={(clients.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />
        </div>
        <DataTable
          columns={columns}
          rows={query.data}
          rowKey={(s) => s.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          onRowClick={(s) => router.push(`/projects/${s.space_key}/board`)}
          empty={{
            title: q || clientId ? "No spaces match" : "No spaces yet",
            description: q || clientId ? undefined : "Create a space to start planning work with your team.",
            action: q || clientId ? undefined : (
              <Button asChild size="sm">
                <Link href="/projects/new">Create space</Link>
              </Button>
            ),
          }}
        />
      </div>
    </>
  );
}
