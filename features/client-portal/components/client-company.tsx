"use client";

import { ChevronRight, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNTING_SOFTWARE_LABELS } from "@/lib/constants";
import { formatPeriod, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortalBusiness, usePortalTasks, usePortalTeam } from "../hooks/use-client-portal";
import type { PortalTask, PortalTeamMember } from "../types/client-portal.types";
import { STAGE_OF, StagePill, isLate, shortDate } from "./client-progress";
import { CompanyGate } from "./company-gate";
import { JournlConnection } from "./journl-connection";
import { Card, ListBody } from "./portal-ui";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{value || "—"}</dd>
    </div>
  );
}

function BusinessBody() {
  const { data: b, isLoading, error, refetch } = usePortalBusiness();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !b) return <Skeleton className="h-48 w-full rounded-xl" />;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card title="Company details" subtitle="Ask your accountant if anything here is out of date.">
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <Fact label="Legal name" value={b.legal_name} />
            <Fact label="Trade name" value={b.trade_name} />
            <Fact label="GSTIN" value={b.gstin && <span className="font-mono">{b.gstin}</span>} />
            <Fact label="PAN" value={b.pan && <span className="font-mono">{b.pan}</span>} />
            <Fact label="State" value={b.state} />
            <Fact label="Accounting software" value={ACCOUNTING_SOFTWARE_LABELS[b.accounting_software] ?? b.accounting_software} />
            <Fact label="Address" value={b.address} />
            <Fact label="Status" value={<StatusBadge status={b.status} />} />
          </dl>
        </Card>
      </div>
      <Card title="Branches">
        {b.branches.length === 0 ? (
          <p className="text-muted-foreground p-5 text-sm">No branches recorded.</p>
        ) : (
          <ul className="divide-y">
            {b.branches.map((br) => (
              <li key={br.id} className="px-5 py-3 text-sm">
                <p className="font-medium">{br.name}</p>
                <p className="text-muted-foreground font-mono text-xs">{br.gstin ?? "No GSTIN"}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function ClientBusiness() {
  return (
    <CompanyGate>
      {() => (
        <>
          <PageHeader title="My Business" description="The details we hold for your company." />
          <BusinessBody />
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
const TONE: Record<Tone, string> = {
  working: "bg-amber-50 text-amber-800 ring-amber-200",
  done: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  waiting: "bg-muted text-muted-foreground ring-border",
  scheduled: "bg-sky-50 text-sky-800 ring-sky-200",
};

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

function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONE[tone])}>{children}</span>;
}

/** The month's jobs this person is responsible for: the ones they do, or the ones they check. The CFO oversees all. */
function jobsFor(m: PortalTeamMember, tasks: PortalTask[]) {
  if (m.team_role === "cfo") return tasks;
  return tasks.filter((t) => (m.team_role === "bookkeeper" ? t.assignee_id === m.user_id : t.reviewer_id === m.user_id));
}

function MemberAvatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <Avatar className={large ? "size-14" : "size-10"}>
      <AvatarFallback className={cn("bg-primary/15 text-primary ring-primary/25 font-semibold ring-1 ring-inset", large ? "text-base" : "text-xs")}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function MemberSheet({ member, tasks, period, onClose }: { member: PortalTeamMember | null; tasks: PortalTask[]; period: string | undefined; onClose: () => void }) {
  const jobs = member ? jobsFor(member, tasks) : [];
  const role = member ? ROLE[member.team_role] : null;
  const status = member ? areaStatus(member, tasks) : null;
  return (
    <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {member && role && (
          <>
            <SheetHeader className="items-center border-b px-6 py-6 text-center">
              <MemberAvatar name={member.full_name} large />
              <SheetTitle className="mt-2 text-lg">{member.full_name}</SheetTitle>
              <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">{role.label}</span>
              <SheetDescription className="mt-1">{role.does}</SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 px-6 py-5">
              <section aria-labelledby="member-area" className="rounded-xl border p-4">
                <p className="text-muted-foreground text-xs tracking-wide uppercase">{period ? formatPeriod(period) : "This month"}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <h3 id="member-area" className="font-medium">{role.area}</h3>
                  {status && <StatusChip tone={status.tone}>{status.label}</StatusChip>}
                </div>
                {status && <p className="text-muted-foreground mt-1 text-sm">{status.detail}</p>}
              </section>

              {jobs.length > 0 && (
                <section aria-labelledby="member-jobs">
                  <h3 id="member-jobs" className="font-medium">{member.team_role === "bookkeeper" ? "What they're responsible for" : member.team_role === "cfo" ? "This month's jobs" : "What they review"}</h3>
                  <ul className="mt-3 grid gap-2">
                    {[...jobs].sort((a, b) => STAGE_OF[a.status] - STAGE_OF[b.status]).map((t) => {
                      const stage = STAGE_OF[t.status];
                      return (
                        <li key={t.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{t.title}</p>
                            {t.due_date && (
                              <p className={cn("text-xs", isLate(t) ? "text-amber-700" : "text-muted-foreground")}>
                                {stage === 3 ? "Finished" : isLate(t) ? `Planned for ${shortDate(t.due_date)}, taking a little longer` : `Due ${shortDate(t.due_date)}`}
                              </p>
                            )}
                          </div>
                          <StagePill stage={stage} />
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/app/progress" className="text-primary mt-3 inline-block text-sm hover:underline">See all of this month&apos;s progress</Link>
                </section>
              )}
            </div>

            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 border-t px-6 py-4">
              <a href={`mailto:${member.email}`} className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 truncate text-xs hover:underline"><Mail className="size-3.5 shrink-0" aria-hidden />{member.email}</a>
              <Button asChild size="sm"><Link href={`/app/messages?to=${member.user_id}`}><MessageSquare className="size-4" /> Message {member.full_name.split(" ")[0]}</Link></Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TeamBody() {
  const q = usePortalTeam();
  const tasks = usePortalTasks();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const keyOf = (m: PortalTeamMember) => `${m.user_id}-${m.team_role}`;
  const open = q.data?.find((m) => keyOf(m) === openKey) ?? null;
  const monthTasks = tasks.data?.tasks ?? [];
  return (
    <>
      <Card title="Your accounting team" subtitle="Who looks after each part of your accounts, and where it stands this month. Click someone for details.">
        <ListBody query={q} empty={{ title: "No team assigned yet", description: "Your team appears here once Accountanz assigns accountants to your company." }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((m) => {
                const role = ROLE[m.team_role];
                const status = areaStatus(m, monthTasks);
                return (
                  <li key={keyOf(m)}>
                    <button type="button" onClick={() => setOpenKey(keyOf(m))} className="hover:bg-muted/40 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-4 text-left sm:grid-cols-[auto_minmax(0,1fr)_200px_auto]">
                      <MemberAvatar name={m.full_name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.full_name} <span className="text-muted-foreground font-normal">· {role.label}</span></p>
                        <p className="text-muted-foreground truncate text-xs">{role.does}</p>
                      </div>
                      <div className="col-span-3 col-start-2 sm:col-span-1 sm:col-start-auto">
                        {tasks.data && (
                          <>
                            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">{role.area}</p>
                            <StatusChip tone={status.tone}>{status.label}</StatusChip>
                          </>
                        )}
                      </div>
                      <ChevronRight className="text-muted-foreground row-start-1 size-4 sm:row-start-auto" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ListBody>
      </Card>
      <MemberSheet member={open} tasks={monthTasks} period={tasks.data?.period} onClose={() => setOpenKey(null)} />
    </>
  );
}

export function ClientTeam() {
  return (
    <CompanyGate>
      {() => (
        <>
          <PageHeader title="My Accounting Team" description="Who looks after your accounts at Accountanz." />
          <TeamBody />
        </>
      )}
    </CompanyGate>
  );
}

export function ClientSoftware() {
  return (
    <CompanyGate>
      {(company) => (
        <>
          <PageHeader title="Accounting Software" description="Where your books live." />
          <JournlConnection company={company} />
        </>
      )}
    </CompanyGate>
  );
}
