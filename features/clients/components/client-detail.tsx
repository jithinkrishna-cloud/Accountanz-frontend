"use client";

import { ArrowLeft, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNTING_SOFTWARE_LABELS } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/format";
import { TEAM_ROLE_LABELS, type TeamRole } from "@/features/assignments/types/assignment.types";
import { useClient } from "../hooks/use-clients";
import { ClientFormDialog } from "./client-form-dialog";
import type { ClientBranch } from "../types/client.types";
import { BranchDialog, RemoveBranchDialog } from "./branch-dialogs";
import { InviteClientUserDialog } from "./invite-client-user-dialog";

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="font-medium">{title}</h2>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{value || "—"}</dd>
    </div>
  );
}

export function ClientDetailView({ id }: { id: number }) {
  const { data: client, isLoading, error, refetch } = useClient(id);
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [branch, setBranch] = useState<ClientBranch | null | undefined>(undefined);
  const [removing, setRemoving] = useState<ClientBranch | null>(null);

  const back = (
    <Link href="/admin/clients" className="text-muted-foreground mb-4 inline-flex items-center gap-1 text-sm hover:underline">
      <ArrowLeft className="size-4" /> Clients
    </Link>
  );

  if (error) return <>{back}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !client) {
    return <>{back}<Skeleton className="mb-6 h-8 w-64" /><Skeleton className="h-48 w-full rounded-xl" /></>;
  }

  return (
    <>
      {back}
      <PageHeader
        title={client.trade_name ?? client.legal_name}
        description={client.legal_name}
        actions={
          <>
            <StatusBadge status={client.status} />
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Business details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="Legal name" value={client.legal_name} />
              <Fact label="Trade name" value={client.trade_name} />
              <Fact label="GSTIN" value={client.gstin && <span className="font-mono">{client.gstin}</span>} />
              <Fact label="PAN" value={client.pan && <span className="font-mono">{client.pan}</span>} />
              <Fact label="State" value={client.state} />
              <Fact label="Accounting software" value={ACCOUNTING_SOFTWARE_LABELS[client.accounting_software]} />
              <Fact label="Address" value={client.address} />
              <Fact label="Added" value={formatDate(client.created_at)} />
            </dl>
          </Section>
        </div>
        <div className="space-y-6">
          <Section
            title="Accounting team"
            aside={<Link href={`/admin/assignments?clientId=${client.id}`} className="text-primary text-xs font-medium hover:underline">Manage</Link>}
          >
            {client.team.length === 0 ? (
              <p className="text-muted-foreground text-sm">No one is assigned today. Assignments grant access to this client.</p>
            ) : (
              <ul className="space-y-3">
                {client.team.map((m) => (
                  <li key={`${m.user_id}-${m.team_role}`} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.full_name}</span>
                    <span className="text-muted-foreground">{TEAM_ROLE_LABELS[m.team_role as TeamRole] ?? humanize(m.team_role)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section
            title="Portal users"
            aside={client.status !== "exited" && (
              <Button variant="outline" size="sm" onClick={() => setInviting(true)}><UserPlus className="size-4" /> Invite</Button>
            )}
          >
            {client.portalUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No client users linked yet. Invite the owner so they can use the client portal.</p>
            ) : (
              <ul className="space-y-3">
                {client.portalUsers.map((u) => (
                  <li key={u.user_id} className="text-sm">
                    <p className="font-medium">{u.full_name} <span className="text-muted-foreground font-normal">· {humanize(u.role)}</span></p>
                    <p className="text-muted-foreground text-xs">{u.email}{u.can_approve ? " · can approve" : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section
            title="Branches"
            aside={client.status !== "exited" && (
              <Button variant="outline" size="sm" onClick={() => setBranch(null)}><Plus className="size-4" /> Add</Button>
            )}
          >
            {client.branches.length === 0 ? (
              <p className="text-muted-foreground text-sm">No branches recorded.</p>
            ) : (
              <ul className="space-y-3">
                {client.branches.map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{b.name}</p>
                      <p className="text-muted-foreground font-mono text-xs">{b.gstin ?? "No GSTIN"}</p>
                      {b.external_branch_ref && <p className="text-muted-foreground text-xs">Ref: {b.external_branch_ref}</p>}
                    </div>
                    {client.status !== "exited" && (
                      <div className="flex shrink-0">
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${b.name}`} onClick={() => setBranch(b)}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Remove ${b.name}`} onClick={() => setRemoving(b)}><Trash2 className="size-4" /></Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
      <ClientFormDialog open={editing} onOpenChange={setEditing} client={client} />
      <BranchDialog clientId={client.id} branch={branch} onClose={() => setBranch(undefined)} />
      <RemoveBranchDialog clientId={client.id} branch={removing} onClose={() => setRemoving(null)} />
      <InviteClientUserDialog open={inviting} onOpenChange={setInviting} clientId={client.id} clientName={client.trade_name ?? client.legal_name} />
    </>
  );
}
