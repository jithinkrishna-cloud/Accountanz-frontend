"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useServices } from "../hooks/use-catalogue";
import type { Service } from "../types/service.types";
import { ServiceFormDialog } from "./service-form-dialog";

export function ServiceList() {
  const query = useServices();
  const [editing, setEditing] = useState<Service | null | undefined>(undefined); // undefined = closed, null = new

  const columns: Column<Service>[] = [
    { key: "code", header: "Code", cell: (s) => <span className="font-mono text-xs font-medium">{s.code}</span> },
    { key: "name", header: "Name", cell: (s) => <span className="font-medium">{s.name}</span> },
    { key: "description", header: "Description", hideOnMobile: true, cell: (s) => <span className="text-muted-foreground">{s.description ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (s) => (
        <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Services"
        description="The billable building blocks of every package."
        actions={<Button onClick={() => setEditing(null)}><Plus className="size-4" /> Add service</Button>}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <DataTable
          columns={columns}
          rows={query.data}
          rowKey={(s) => s.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: "No services yet", description: "Add services, then bundle them into packages." }}
        />
      </div>
      <ServiceFormDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} service={editing ?? undefined} />
    </>
  );
}
