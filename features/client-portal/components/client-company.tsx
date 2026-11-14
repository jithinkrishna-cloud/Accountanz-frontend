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
import { STAGE_OF, STAGE_WEIGHT, StagePill, isLate, shortDate } from "./client-progress";
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
const ROLE: Record<PortalTeamMember["team_role"], { label: string; does: string; verb: string }> = {
  cfo: { label: "CFO", does: "Oversees your account and signs off your monthly reports.", verb: "Overseeing" },
  finance_manager: { label: "Finance manager", does: "Checks every job before it's final and is your main point of contact.", verb: "Checking" },
  reviewer: { label: "Reviewer", does: "Checks jobs before they're final.", verb: "Checking" },
  bookkeeper: { label: "Bookkeeper", does: "Does the day-to-day work on your books.", verb: "Doing" },
};

/** The month's jobs this person is responsible for: the ones they do, or the ones they check. The CFO oversees all. */
function jobsFor(m: PortalTeamMember, tasks: PortalTask[]) {
  if (m.team_role === "cfo") return tasks;
  return tasks.filter((t) => (m.team_role === "bookkeeper" ? t.assignee_id === m.user_id : t.reviewer_id === m.user_id));
}
const progressOf = (jobs: PortalTask[]) => (jobs.length ? Math.round((jobs.reduce((n, t) => n + STAGE_WEIGHT[STAGE_OF[t.status]]!, 0) / jobs.length) * 100) : 0);

function MemberAvatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <Avatar className={large ? "size-14" : "size-10"}>
      <AvatarFallback className={cn("bg-primary/15 text-primary ring-primary/25 font-semibold ring-1 ring-inset", large ? "text-base" : "text-xs")}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function MemberSheet({ member, tasks, period, onClose }: { member: PortalTeamMember | null; tasks: PortalTask[]; period: string | undefined; onClose: () => void }) {
  const jobs = member ? jobsFor(member, tasks) : [];
  const done = jobs.filter((t) => STAGE_OF[t.status] === 3).length;
  const percent = progressOf(jobs);
  const role = member ? ROLE[member.team_role] : null;
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
              <section aria-labelledby="member-progress">
                <div className="flex items-baseline justify-between">
                  <h3 id="member-progress" className="text-xs tracking-wide uppercase">
                    <span className="text-muted-foreground">{period ? formatPeriod(period) : "This month"}</span> <span className="font-semibold">progress</span>
                  </h3>
                  <span className="text-lg font-semibold tabular-nums">{jobs.length ? `${percent}%` : "—"}</span>
                </div>
                <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`${member.full_name}'s progress`}>
                  <div className={cn("h-full rounded-full", percent === 100 ? "bg-emerald-500" : "from-primary bg-linear-to-r to-emerald-500")} style={{ width: `${percent}%` }} />
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {jobs.length === 0
                    ? `No jobs ${member.team_role === "bookkeeper" ? "assigned to" : "for"} ${member.full_name.split(" ")[0]} on your books this month.`
                    : `${role.verb} ${jobs.length} job${jobs.length === 1 ? "" : "s"} · ${done} done`}
                </p>
              </section>

              {jobs.length > 0 && (
                <section aria-labelledby="member-jobs">
                  <h3 id="member-jobs" className="font-medium">{member.team_role === "bookkeeper" ? "Jobs they're doing" : member.team_role === "cfo" ? "Everything this month" : "Jobs they're checking"}</h3>
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
      <Card title="Your accounting team" subtitle="The people working on your books this month. Click someone to see their progress.">
        <ListBody query={q} empty={{ title: "No team assigned yet", description: "Your team appears here once Accountanz assigns accountants to your company." }}>
          {(rows) => (
            <ul className="divide-y">
              {rows.map((m) => {
                const jobs = jobsFor(m, monthTasks);
                const done = jobs.filter((t) => STAGE_OF[t.status] === 3).length;
                const role = ROLE[m.team_role];
                return (
                  <li key={keyOf(m)}>
                    <button type="button" onClick={() => setOpenKey(keyOf(m))} className="hover:bg-muted/40 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-4 text-left sm:grid-cols-[auto_minmax(0,1fr)_200px_auto]">
                      <MemberAvatar name={m.full_name} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.full_name} <span className="text-muted-foreground font-normal">· {role.label}</span></p>
                        <p className="text-muted-foreground truncate text-xs">{role.does}</p>
                      </div>
                      <div className="col-span-3 col-start-2 sm:col-span-1 sm:col-start-auto">
                        {tasks.data && jobs.length > 0 ? (
                          <>
                            <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                              <div className="from-primary h-full rounded-full bg-linear-to-r to-emerald-500" style={{ width: `${progressOf(jobs)}%` }} />
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">{role.verb} {jobs.length} job{jobs.length === 1 ? "" : "s"} · {done} done</p>
                          </>
                        ) : (
                          tasks.data && <p className="text-muted-foreground text-xs">No jobs this month</p>
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
