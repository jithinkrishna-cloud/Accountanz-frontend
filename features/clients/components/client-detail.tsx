"use client";

import { OpenInJournl } from "@/components/shared/open-in-journl";
import { ArrowLeft, Pencil, Plus, Trash2, TriangleAlert, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ClientOnboardingCard } from "@/features/onboarding/components/client-onboarding-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ACCOUNTING_SOFTWARE_LABELS, MONTHS } from "@/lib/constants";
import { formatDate, formatINR, humanize } from "@/lib/format";
import { TEAM_ROLE_LABELS, type TeamRole } from "@/features/assignments/types/assignment.types";
import { useClient } from "../hooks/use-clients";
import { ClientFormDialog } from "./client-form-dialog";
import type { ClientBranch, CompanyStakeholder, RegistrationStatus } from "../types/client.types";
import { BranchDialog, RemoveBranchDialog } from "./branch-dialogs";
import { FinancialProfileDialog } from "./financial-profile-dialog";
import { InviteClientUserDialog } from "./invite-client-user-dialog";
import { RemoveStakeholderDialog, StakeholderDialog } from "./stakeholder-dialogs";
import { TaxDetailsDialog } from "./tax-details-dialog";

/** "ABCDE1234F · Registered", or just the status when no number is recorded yet. */
function registration(number: string | null, status: RegistrationStatus | null) {
  if (!number && !status) return null;
  return (
    <span>
      {number && <span className="font-mono">{number}</span>}
      {number && status && <span className="text-muted-foreground"> · </span>}
      {status && <span className={number ? "text-muted-foreground" : undefined}>{humanize(status)}</span>}
    </span>
  );
}

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
  const [editingTax, setEditingTax] = useState(false);
  const [editingFinancial, setEditingFinancial] = useState(false);
  const [stakeholder, setStakeholder] = useState<CompanyStakeholder | null | undefined>(undefined);
  const [removingStakeholder, setRemovingStakeholder] = useState<CompanyStakeholder | null>(null);

  const back = (
    <Link href="/admin/clients" className="text-muted-foreground mb-4 inline-flex items-center gap-1 text-sm hover:underline">
      <ArrowLeft className="size-4" /> Clients
    </Link>
  );

  if (error) return <>{back}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !client) {
    return <>{back}<Skeleton className="mb-6 h-8 w-64" /><Skeleton className="h-48 w-full rounded-xl" /></>;
  }

  const editable = client.status !== "exited";
  const stakeholders = client.stakeholders ?? [];
  const ownershipTotal = stakeholders.reduce((sum, s) => sum + (s.ownership_percentage ?? 0), 0);
  const tax = client.tax_details;
  const fin = client.financial_profile;
  const editButton = (label: string, onClick: () => void) =>
    editable && <Button variant="outline" size="sm" onClick={onClick}><Pencil className="size-4" /> {label}</Button>;

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
      {(client.status === "lead" || client.status === "onboarding") && (
        <ClientOnboardingCard client={{ id: client.id, name: client.trade_name ?? client.legal_name }} onActivated={() => void refetch()} />
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Business details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="Legal name" value={client.legal_name} />
              <Fact label="Trade name" value={client.trade_name} />
              <Fact label="Business type" value={client.business_type ? humanize(client.business_type) : null} />
              <Fact label="Established on" value={client.date_of_establishment ? formatDate(client.date_of_establishment) : null} />
              <Fact label="GSTIN" value={client.gstin && <span className="font-mono">{client.gstin}</span>} />
              <Fact label="PAN" value={client.pan && <span className="font-mono">{client.pan}</span>} />
              <Fact label="State" value={client.state} />
              <Fact label="Accounting software" value={ACCOUNTING_SOFTWARE_LABELS[client.accounting_software]} />
              <Fact label="Primary contact" value={client.primary_contact_name} />
              <Fact label="Contact email" value={client.primary_contact_email} />
              <Fact label="Contact phone" value={client.primary_contact_phone} />
              <Fact label="Address" value={client.address} />
              <Fact label="Added" value={formatDate(client.created_at)} />
            </dl>
          </Section>
          <Section title="Tax & registrations" aside={editButton(tax ? "Edit" : "Add", () => setEditingTax(true))}>
            {tax ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Fact label="PAN" value={registration(tax.pan_number, tax.pan_status)} />
                <Fact label="GSTIN" value={registration(tax.gstin, tax.gstin_status)} />
                <Fact label="TAN" value={registration(tax.tan_number, tax.tan_status)} />
                <Fact label="CIN" value={registration(tax.cin, tax.cin_status)} />
                <Fact label="LLPIN" value={registration(tax.llpin, tax.llpin_status)} />
                <Fact label="MSME / Udyam" value={registration(tax.msme_udyam_number, tax.msme_status)} />
                <Fact label="Professional tax" value={registration(tax.professional_tax_registration, tax.professional_tax_status)} />
              </dl>
            ) : <p className="text-muted-foreground text-sm">No tax/registration details captured yet.</p>}
          </Section>
          <Section
            title="Stakeholders"
            aside={editable && <Button variant="outline" size="sm" onClick={() => setStakeholder(null)}><Plus className="size-4" /> Add</Button>}
          >
            {stakeholders.length ? (
              <>
                <ul className="divide-y">
                  {stakeholders.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium break-words">
                          {s.full_name}
                          <span className="text-muted-foreground font-normal">{humanize(s.stakeholder_type)}</span>
                          {!!s.is_primary && <Badge variant="secondary">Primary</Badge>}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {[s.designation, s.ownership_percentage != null ? `${s.ownership_percentage}% ownership` : null, s.email, s.phone, s.pan_number && `PAN ${s.pan_number}`, s.din_number && `DIN ${s.din_number}`]
                            .filter(Boolean)
                            .join(" · ") || "No extra details"}
                        </p>
                      </div>
                      {editable && (
                        <div className="flex shrink-0">
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${s.full_name}`} onClick={() => setStakeholder(s)}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Remove ${s.full_name}`} onClick={() => setRemovingStakeholder(s)}><Trash2 className="size-4" /></Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {ownershipTotal > 0 && (
                  <p className="text-muted-foreground mt-3 border-t pt-3 text-xs">
                    Ownership recorded: {Number(ownershipTotal.toFixed(2))}%{ownershipTotal < 100 ? ` (${Number((100 - ownershipTotal).toFixed(2))}% unallocated)` : ""}
                  </p>
                )}
              </>
            ) : <p className="text-muted-foreground text-sm">No stakeholders recorded yet.</p>}
          </Section>
          <Section title="Financial profile" aside={editButton(fin ? "Edit" : "Add", () => setEditingFinancial(true))}>
            {fin ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Fact label="Financial year starts" value={fin.financial_year_start_month ? MONTHS[fin.financial_year_start_month - 1] : null} />
                <Fact label="Annual turnover" value={fin.annual_turnover != null ? formatINR(fin.annual_turnover) : null} />
                <Fact label="Transactions per month" value={fin.monthly_transaction_volume?.toLocaleString("en-IN")} />
                <Fact label="Invoices per month" value={fin.monthly_invoice_count?.toLocaleString("en-IN")} />
                <Fact label="Employees" value={fin.employee_count?.toLocaleString("en-IN")} />
                <Fact label="Current software" value={fin.current_accounting_software} />
                <Fact label="Notes" value={fin.notes} />
              </dl>
            ) : <p className="text-muted-foreground text-sm">No financial profile captured yet.</p>}
          </Section>
        </div>
        <div className="space-y-6">
          <Section
            title="Accounting team"
            aside={<Link href={`/admin/assignments?clientId=${client.id}`} className="text-primary text-xs font-medium hover:underline">Manage</Link>}
          >
            {!!client.missing_roles?.length && (
              <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                <span>
                  {client.package_name} includes {client.missing_roles.map((r) => TEAM_ROLE_LABELS[r as TeamRole] ?? humanize(r)).join(" and ")}, but nobody is assigned.{" "}
                  <Link href={`/admin/assignments?clientId=${client.id}`} className="font-medium underline">Assign now</Link>
                </span>
              </p>
            )}
            {client.package_roles && (
              <p className="text-muted-foreground mb-3 text-xs">Package team: {client.package_roles.map((r) => TEAM_ROLE_LABELS[r as TeamRole] ?? humanize(r)).join(" · ")}</p>
            )}
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
          <Section title="JournL">
            <p className="text-muted-foreground mb-2 text-sm">The client invites accountants to their books in JournL directly.</p>
            <OpenInJournl />
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
      <TaxDetailsDialog client={client} open={editingTax} onOpenChange={setEditingTax} />
      <FinancialProfileDialog client={client} open={editingFinancial} onOpenChange={setEditingFinancial} />
      <StakeholderDialog clientId={client.id} stakeholder={stakeholder} all={stakeholders} onClose={() => setStakeholder(undefined)} />
      <RemoveStakeholderDialog clientId={client.id} stakeholder={removingStakeholder} onClose={() => setRemovingStakeholder(null)} />
      <InviteClientUserDialog open={inviting} onOpenChange={setInviting} clientId={client.id} clientName={client.trade_name ?? client.legal_name} />
    </>
  );
}
