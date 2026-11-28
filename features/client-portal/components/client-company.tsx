"use client";

import { Check, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { RegistrationStatus } from "@/features/clients/types/client.types";
import { ACCOUNTING_SOFTWARE_LABELS, MONTHS } from "@/lib/constants";
import { formatDate, formatINR, humanize, initials, splitList } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortalBusiness, usePortalTasks, usePortalTeam } from "../hooks/use-client-portal";
import type { PortalTask, PortalTeamMember } from "../types/client-portal.types";
import { STAGE_OF } from "./client-progress";
import { AccountantOverview } from "./accountant-overview";
import { BranchDialog, EditButton, FinancialProfileDialog, SERVICES, ServicesDialog, StakeholderDialog, TaxDetailsDialog } from "./business-edit-dialogs";
import { CompanyGate } from "./company-gate";
import { Card, ListBody } from "./portal-ui";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{value || "—"}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground p-5 text-sm">{children}</p>;
}

/** "ABCDE1234F · Registered", or just the status while there's no number yet. */
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

function BusinessBody({ isOwner }: { isOwner: boolean }) {
  const { data: b, isLoading, error, refetch } = usePortalBusiness();
  // Which section editor is open; "person" holds the owner/director being edited (null = adding one).
  const [open, setOpen] = useState<null | "tax" | "person" | "branch" | "financial" | "services">(null);
  const [person, setPerson] = useState<NonNullable<typeof b>["stakeholders"][number] | null>(null);
  const [branch, setBranch] = useState<NonNullable<typeof b>["branches"][number] | null>(null);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !b) return <Skeleton className="h-48 w-full rounded-xl" />;
  const tax = b.tax_details;
  const fin = b.financial_profile;
  const req = b.service_requirements;
  const editor = (key: NonNullable<typeof open>) => ({ open: open === key, onOpenChange: (o: boolean) => setOpen(o ? key : null) });
  const editPerson = (p: typeof person) => {
    setPerson(p);
    setOpen("person");
  };
  const editBranch = (br: typeof branch) => {
    setBranch(br);
    setOpen("branch");
  };
  const services = req ? [...SERVICES.filter(([k]) => req[k]).map(([, label]) => label), ...splitList(req.other_services)] : [];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card
          title="Company details"
          actions={isOwner ? (
            <Button asChild variant="outline" size="sm"><Link href="/app/settings?tab=profile#business-form"><Pencil className="size-4" /> Edit</Link></Button>
          ) : undefined}
        >
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <Fact label="Legal name" value={b.legal_name} />
            <Fact label="Trade name" value={b.trade_name} />
            <Fact label="Business type" value={b.business_type && humanize(b.business_type)} />
            <Fact label="Established on" value={b.date_of_establishment && formatDate(b.date_of_establishment)} />
            <Fact label="State" value={b.state} />
            <Fact label="Accounting software" value={ACCOUNTING_SOFTWARE_LABELS[b.accounting_software] ?? b.accounting_software} />
            <Fact label="Primary contact" value={b.primary_contact_name} />
            <Fact label="Contact email" value={b.primary_contact_email} />
            <Fact label="Contact phone" value={b.primary_contact_phone} />
            <Fact label="Address" value={b.address} />
            <Fact label="Status" value={<StatusBadge status={b.status} />} />
          </dl>
        </Card>
        <Card title="Tax & registrations" actions={isOwner ? <EditButton onClick={() => setOpen("tax")} /> : undefined}>
          {tax || b.pan || b.gstin ? (
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <Fact label="PAN" value={registration(tax?.pan_number ?? b.pan, tax?.pan_status ?? null)} />
              <Fact label="GSTIN" value={registration(tax?.gstin ?? b.gstin, tax?.gstin_status ?? null)} />
              <Fact label="TAN" value={tax && registration(tax.tan_number, tax.tan_status)} />
              <Fact label="CIN" value={tax && registration(tax.cin, tax.cin_status)} />
              <Fact label="LLPIN" value={tax && registration(tax.llpin, tax.llpin_status)} />
              <Fact label="MSME / Udyam" value={tax && registration(tax.msme_udyam_number, tax.msme_status)} />
              <Fact label="Professional tax" value={tax && registration(tax.professional_tax_registration, tax.professional_tax_status)} />
            </dl>
          ) : <Empty>{isOwner ? "No registrations recorded yet. Add your PAN, GSTIN and other numbers with Edit." : "No registrations recorded yet."}</Empty>}
        </Card>
        <Card title="Owners & directors" actions={isOwner ? <EditButton label="Add" onClick={() => editPerson(null)} /> : undefined}>
          {b.stakeholders.length ? (
            <ul className="divide-y">
              {b.stakeholders.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                      {s.full_name}
                      {!!s.is_primary && <Badge variant="secondary">Primary</Badge>}
                    </p>
                    <p className="text-muted-foreground text-xs">{[humanize(s.stakeholder_type), s.designation !== humanize(s.stakeholder_type) && s.designation].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    {s.ownership_percentage != null && <span className="text-muted-foreground text-xs">{Number(s.ownership_percentage)}%</span>}
                    {isOwner && (
                      <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Edit ${s.full_name}`} onClick={() => editPerson(s)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : <Empty>No owners or directors recorded yet.</Empty>}
        </Card>
        <Card title="Financial profile" actions={isOwner ? <EditButton onClick={() => setOpen("financial")} /> : undefined}>
          {fin ? (
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <Fact label="Financial year starts" value={fin.financial_year_start_month && MONTHS[fin.financial_year_start_month - 1]} />
              <Fact label="Annual turnover" value={fin.annual_turnover != null && formatINR(fin.annual_turnover)} />
              <Fact label="Transactions per month" value={fin.monthly_transaction_volume?.toLocaleString("en-IN")} />
              <Fact label="Invoices per month" value={fin.monthly_invoice_count?.toLocaleString("en-IN")} />
              <Fact label="Employees" value={fin.employee_count?.toLocaleString("en-IN")} />
              <Fact label="Current accounting software" value={fin.current_accounting_software} />
            </dl>
          ) : <Empty>Not filled in yet.</Empty>}
        </Card>
      </div>
      <div className="space-y-6">
        <Card
          title="Services"
          actions={!isOwner ? undefined : req ? <EditButton onClick={() => setOpen("services")} /> : (
            <Button asChild variant="outline" size="sm"><Link href="/app/packages">Your plan</Link></Button>
          )}
        >
          {services.length ? (
            <ul className="space-y-2 p-5 text-sm">
              {services.map((s) => <li key={s} className="flex items-center gap-2"><Check className="text-primary size-4 shrink-0" aria-hidden />{s}</li>)}
            </ul>
          ) : <Empty>{req ? "None selected yet." : "Your services come with your plan."}</Empty>}
        </Card>
        <Card title="Branches" actions={isOwner ? <EditButton label="Add" onClick={() => editBranch(null)} /> : undefined}>
          {b.branches.length === 0 ? (
            <p className="text-muted-foreground p-5 text-sm">{isOwner ? "No branches yet. Add any other shop, office or warehouse you run." : "No branches recorded."}</p>
          ) : (
            <ul className="divide-y">
              {b.branches.map((br) => (
                <li key={br.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{br.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">{br.gstin ?? "No GSTIN"}</p>
                  </div>
                  {isOwner && (
                    <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Edit ${br.name}`} onClick={() => editBranch(br)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {isOwner && (
        <>
          <TaxDetailsDialog b={b} {...editor("tax")} />
          <StakeholderDialog person={person} {...editor("person")} />
          <BranchDialog branch={branch} {...editor("branch")} />
          <FinancialProfileDialog b={b} {...editor("financial")} />
          {req && <ServicesDialog b={b} {...editor("services")} />}
        </>
      )}
    </div>
  );
}

export function ClientBusiness() {
  return (
    <CompanyGate>
      {(company) => (
        <>
          <PageHeader
            title="My Business"
            description={company.role === "owner" ? "The details we hold for your company. Keep them up to date any time; changes apply straight away and your accounting team sees them." : "The details we hold for your company. Your company owner can edit them."}
          />
          <BusinessBody isOwner={company.role === "owner"} />
        </>
      )}
    </CompanyGate>
  );
}

/** What each role does for the client, in plain words. */
const ROLE: Record<PortalTeamMember["team_role"], { label: string; does: string; area: string }> = {
  cfo: { label: "CFO", does: "Oversees your account and gives financial insights and advice.", area: "Financial review" },
  finance_manager: { label: "Finance manager", does: "Reviews your accounts every month and is your main point of contact.", area: "Monthly review" },
  reviewer: { label: "Reviewer", does: "Reviews your accounts every month.", area: "Monthly review" },
  bookkeeper: { label: "Bookkeeper", does: "Does your day-to-day bookkeeping.", area: "Bookkeeping" },
};

type Tone = "working" | "done" | "waiting" | "scheduled";

/**
 * Where this person's area of work stands this month, in plain words. Deliberately not a score: clients see
 * who is responsible for what and where it is, not how individual accountants are performing.
 */
function areaStatus(m: PortalTeamMember, tasks: PortalTask[]): { label: string; detail: string; tone: Tone } {
  const first = m.full_name.split(" ")[0];
  const stagesOf = (jobs: PortalTask[]) => jobs.map((t) => STAGE_OF[t.status]);
  if (m.team_role === "bookkeeper") {
    const s = stagesOf(jobsFor(m, tasks));
    if (!s.length) return { label: "Nothing scheduled", detail: `No bookkeeping is planned for ${first} this month yet.`, tone: "waiting" };
    if (s.every((x) => x === 3)) return { label: "Done for this month", detail: "This month's bookkeeping is complete and checked.", tone: "done" };
    if (s.every((x) => x >= 2)) return { label: "Handed over for review", detail: `${first} has finished this month's bookkeeping and it's being checked.`, tone: "scheduled" };
    if (s.some((x) => x >= 1)) return { label: "Working on this", detail: `${first} is working on this month's bookkeeping.`, tone: "working" };
    return { label: "Starting soon", detail: `${first} will start this month's bookkeeping soon.`, tone: "scheduled" };
  }
  if (m.team_role === "finance_manager" || m.team_role === "reviewer") {
    const s = stagesOf(jobsFor(m, tasks));
    if (!s.length) return { label: "Nothing to review yet", detail: "Reviews start once this month's bookkeeping is under way.", tone: "waiting" };
    if (s.every((x) => x === 3)) return { label: "Review complete", detail: "This month's accounts have been reviewed.", tone: "done" };
    if (s.some((x) => x === 2)) return { label: "Reviewing your accounts", detail: `${first} is checking work that's ready for review.`, tone: "working" };
    return { label: "Waiting for bookkeeping", detail: "The review starts as bookkeeping is finished.", tone: "waiting" };
  }
  const s = stagesOf(tasks);
  if (s.length && s.every((x) => x === 3)) return { label: "Ready for financial review", detail: `The month is reviewed. ${first} looks at the bigger picture and advises.`, tone: "scheduled" };
  return { label: "After the monthly review", detail: `${first} reviews your finances once the month's accounts are checked.`, tone: "waiting" };
}

/** The month's jobs this person is responsible for: the ones they do, or the ones they check. The CFO oversees all. */
function jobsFor(m: PortalTeamMember, tasks: PortalTask[]) {
  if (m.team_role === "cfo") return tasks;
  return tasks.filter((t) => (m.team_role === "bookkeeper" ? t.assignee_id === m.user_id : t.reviewer_id === m.user_id));
}


/** One row per person; someone with two roles on the account (e.g. finance manager and reviewer) appears once. */
function people(rows: PortalTeamMember[]) {
  const byUser = new Map<number, { member: PortalTeamMember; roles: PortalTeamMember["team_role"][] }>();
  for (const m of rows) {
    const entry = byUser.get(m.user_id);
    if (entry) entry.roles.push(m.team_role);
    else byUser.set(m.user_id, { member: m, roles: [m.team_role] });
  }
  return [...byUser.values()];
}

function TeamBody({ isOwner }: { isOwner: boolean }) {
  const q = usePortalTeam();
  const tasks = usePortalTasks();
  const params = useSearchParams();
  const memberParam = Number(params.get("member")) || null;
  const [selectedId, setSelectedId] = useState<number | null>(memberParam);
  // Follow ?member= when a link changes it while this page is already open (e.g. from a task's "Handled by").
  const [seenParam, setSeenParam] = useState(memberParam);
  if (memberParam !== seenParam) {
    setSeenParam(memberParam);
    setSelectedId(memberParam);
  }
  const monthTasks = tasks.data?.tasks ?? [];
  const list = people(q.data ?? []);
  // A ?member= that isn't on the team falls back to the first person.
  const selected = (selectedId && list.some((x) => x.member.user_id === selectedId) ? selectedId : null) ?? list[0]?.member.user_id ?? null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card title="Your accounting team" subtitle="Pick someone to see everything they do for you.">
        <ListBody query={q} empty={{ title: "No team assigned yet", description: "Your team appears here once Accountanz assigns accountants to your company." }}>
          {() => (
            <ul className="space-y-1 p-2" role="listbox" aria-label="Accountants">
              {list.map(({ member: m, roles }) => {
                const active = m.user_id === selected;
                const status = areaStatus(m, monthTasks);
                return (
                  <li key={m.user_id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelectedId(m.user_id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted",
                      )}
                    >
                      <Avatar className="size-9">
                        <AvatarFallback className={cn("text-xs font-semibold", active ? "bg-primary-foreground text-primary" : "bg-secondary")}>{initials(m.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.full_name}</p>
                        <p className={cn("truncate text-xs", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
                          {roles.map((r) => ROLE[r].label).join(" · ")}
                          {tasks.data && ` · ${status.label}`}
                        </p>
                      </div>
                      <ChevronRight className={cn("size-4 shrink-0", active ? "opacity-100" : "opacity-40")} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ListBody>
      </Card>
      {selected !== null && <AccountantOverview key={selected} userId={selected} isOwner={isOwner} />}
    </div>
  );
}

export function ClientTeam() {
  return (
    <CompanyGate>
      {(company) => (
        <>
          <PageHeader title="My Accounting Team" description="Who looks after your accounts. Pick an accountant to track their details, tasks, progress, document requests and messages." />
          <TeamBody isOwner={company.role === "owner"} />
        </>
      )}
    </CompanyGate>
  );
}
