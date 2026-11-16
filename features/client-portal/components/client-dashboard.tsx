"use client";

import { CalendarClock, CheckCircle2, ChevronRight, FileText, FileUp, Hourglass, MessageSquare, Stamp } from "lucide-react";
import Link from "next/link";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, type DocumentCategory } from "@/features/documents/types/document.types";
import { REPORT_LABELS, type ReportType } from "@/features/reports/types/report.types";
import { formatDate, formatINR, formatLocalDateTime, formatPeriod, humanize, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  usePortalApprovals,
  usePortalBilling,
  usePortalDashboard,
  usePortalDocuments,
  usePortalProposal,
  usePortalReports,
  usePortalRequests,
  usePortalTasks,
  usePortalTeam,
  usePortalThreads,
} from "../hooks/use-client-portal";
import type { PortalCompany, PortalTask } from "../types/client-portal.types";
import { isLate, shortDate, STAGE_OF, STAGES, StagePill } from "./client-progress";
import { ProposalCard } from "./client-proposal";
import { CompanyGate } from "./company-gate";
import { ROLE_INFO } from "./portal-ui";

// ───────────── Shared bits ─────────────

function Panel({ title, href, linkLabel, children, className }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-card rounded-xl border shadow-xs", className)}>
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="font-medium">{title}</h2>
        {href && (
          <Link href={href} className="text-primary inline-flex items-center gap-0.5 text-sm font-medium hover:underline">
            {linkLabel ?? "See all"}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

const Rows = () => (
  <div className="space-y-2 px-5 pb-5">
    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
  </div>
);

const Quiet = ({ children }: { children: React.ReactNode }) => <p className="text-muted-foreground px-5 pb-5 text-sm">{children}</p>;

// ───────────── This month's work ─────────────

/** Late first, then unfinished by due date, finished last. */
const byUrgency = (a: PortalTask, b: PortalTask) =>
  Number(isLate(b)) - Number(isLate(a)) ||
  Number(STAGE_OF[a.status] === 3) - Number(STAGE_OF[b.status] === 3) ||
  (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");

function MonthWork({ period }: { period: string }) {
  const q = usePortalTasks(period);
  const tasks = q.data?.tasks;
  const counts = STAGES.map((_, i) => tasks?.filter((t) => STAGE_OF[t.status] === i).length ?? 0);
  const total = tasks?.length ?? 0;

  return (
    <Panel title={`${formatPeriod(period)} work`} href="/app/progress" linkLabel="Full progress">
      {!tasks ? (
        <Rows />
      ) : total === 0 ? (
        <Quiet>Your team hasn&apos;t scheduled any work for this month yet.</Quiet>
      ) : (
        <>
          <div className="px-5 pb-3">
            <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={STAGES.map((s, i) => `${counts[i]} ${s.label.toLowerCase()}`).join(", ")}>
              {STAGES.map((s, i) => counts[i] ? <span key={s.label} className={s.dot} style={{ width: `${(counts[i] / total) * 100}%` }} /> : null)}
            </div>
            <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {STAGES.map((s, i) => (
                <li key={s.label} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
                  {s.label} <span className="text-foreground font-medium">{counts[i]}</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="divide-y border-t">
            {[...tasks].sort(byUrgency).slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {t.handled_by ?? "Not assigned yet"}
                    {t.due_date && <span className={cn(isLate(t) && "font-medium text-red-600")}> · {isLate(t) ? "was due" : "due"} {shortDate(t.due_date)}</span>}
                  </p>
                </div>
                <StagePill stage={STAGE_OF[t.status]} />
              </li>
            ))}
          </ul>
          {total > 6 && <p className="text-muted-foreground border-t px-5 py-2.5 text-xs">and {total - 6} more</p>}
        </>
      )}
    </Panel>
  );
}

// ───────────── Reports and uploads ─────────────

function LatestReports() {
  const q = usePortalReports();
  const rows = q.data?.slice(0, 4);
  return (
    <Panel title="Latest reports" href="/app/reports">
      {!rows ? <Rows /> : rows.length === 0 ? <Quiet>Reports appear here once your team publishes them.</Quiet> : (
        <ul className="divide-y border-t">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"><FileText className="size-4" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{REPORT_LABELS[r.report_type as ReportType] ?? humanize(r.report_type)}</p>
                <p className="text-muted-foreground text-xs">{formatPeriod(r.period)} · published {formatDate(r.published_date)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const DOC_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "Received", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  reviewed: { label: "Checked", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  rejected: { label: "Needs a new copy", tone: "bg-red-50 text-red-800 ring-red-200" },
};

function RecentUploads() {
  const q = usePortalDocuments();
  const rows = q.data?.slice(0, 4);
  return (
    <Panel title="Recent uploads" href="/app/documents">
      {!rows ? <Rows /> : rows.length === 0 ? <Quiet>Files you upload for your team show up here.</Quiet> : (
        <ul className="divide-y border-t">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg"><FileUp className="size-4" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.file_name}</p>
                <p className="text-muted-foreground truncate text-xs">{CATEGORY_LABELS[d.category as DocumentCategory] ?? humanize(d.category)} · {formatDate(d.created_at)}</p>
              </div>
              <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs ring-1 ring-inset", DOC_STATUS[d.status]?.tone)}>{DOC_STATUS[d.status]?.label ?? d.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ───────────── Right column ─────────────

/** Everything waiting on the client: open document requests and approvals. */
function NeedsYou() {
  const requests = usePortalRequests().data;
  const approvals = usePortalApprovals().data;
  if (!requests || !approvals) return <Panel title="Needs you"><Rows /></Panel>;
  const open = requests.filter((r) => r.status === "open");
  const pending = approvals.filter((a) => a.status === "pending");
  const items = [
    ...pending.map((a) => ({ key: `a${a.id}`, icon: Stamp, text: a.subject, meta: `Approval · asked ${formatDate(a.created_at)}`, href: "/app/approvals" })),
    ...open.map((r) => ({ key: `r${r.id}`, icon: FileUp, text: r.description, meta: r.due_date ? `Document · due ${shortDate(r.due_date)}` : "Document", href: "/app/requests" })),
  ];

  return (
    <Panel title="Needs you">
      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-5 pb-5 text-sm">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
          <span>You&apos;re all caught up. Nothing is waiting on you.</span>
        </div>
      ) : (
        <ul className="divide-y border-t">
          {items.slice(0, 5).map((i) => (
            <li key={i.key}>
              <Link href={i.href} className="hover:bg-muted/50 flex items-center gap-3 px-5 py-2.5 text-sm">
                <i.icon className="size-4 shrink-0 text-amber-600" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.text}</span>
                  <span className="text-muted-foreground block text-xs">{i.meta}</span>
                </span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function YourTeam() {
  const team = usePortalTeam().data;
  return (
    <Panel title="Your team" href="/app/team" linkLabel="Team">
      {!team ? <Rows /> : team.length === 0 ? <Quiet>Your accountants are assigned once your service starts.</Quiet> : (
        <ul className="space-y-3 px-5 pb-5">
          {team.map((m) => (
            <li key={`${m.user_id}-${m.team_role}`} className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/15 text-primary ring-primary/25 text-xs font-semibold ring-1 ring-inset">{initials(m.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.full_name}</p>
                <p className="text-muted-foreground truncate text-xs">{ROLE_INFO[m.team_role]?.label ?? humanize(m.team_role)} · {ROLE_INFO[m.team_role]?.does}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function NextMeeting({ title, at }: { title: string | null; at: string | null }) {
  return (
    <Panel title="Next meeting" href="/app/meetings" linkLabel="Meetings">
      <div className="flex items-start gap-3 px-5 pb-5 text-sm">
        <CalendarClock className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
        {title && at ? (
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-muted-foreground text-xs">{formatDate(at, true)}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">Nothing booked. <Link href="/app/meetings" className="text-primary font-medium hover:underline">Ask for a meeting</Link> with your team.</p>
        )}
      </div>
    </Panel>
  );
}

function RecentMessages() {
  const threads = usePortalThreads().data;
  const rows = threads?.slice(0, 3);
  return (
    <Panel title="Messages" href="/app/messages">
      {!rows ? <Rows /> : rows.length === 0 ? <Quiet>Questions for your team? <Link href="/app/messages" className="text-primary font-medium hover:underline">Send a message</Link>.</Quiet> : (
        <ul className="divide-y border-t">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href="/app/messages" className="hover:bg-muted/50 flex gap-3 px-5 py-2.5 text-sm">
                <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.subject ?? "Conversation"}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {t.last_author ? `${t.last_author}: ` : ""}{t.last_body ?? "No messages yet"}
                  </span>
                </span>
                {t.last_at && <span className="text-muted-foreground shrink-0 text-xs">{formatLocalDateTime(t.last_at).split(",")[0]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function YourPlan() {
  const b = usePortalBilling().data;
  if (!b?.package) return null;
  const nextDue = b.invoices.filter((i) => i.status !== "paid").sort((x, y) => x.due_date.localeCompare(y.due_date))[0];
  return (
    <Panel title="Your plan" href="/app/billing" linkLabel="Billing">
      <dl className="grid grid-cols-2 gap-3 px-5 pb-5 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">Package</dt>
          <dd className="font-medium">{b.package.package_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Fee</dt>
          <dd className="font-medium">{formatINR(b.package.monthly_fee, true)}<span className="text-muted-foreground text-xs font-normal"> / month</span></dd>
        </div>
        {nextDue && (
          <div className="col-span-2">
            <dt className="text-muted-foreground text-xs">Next payment</dt>
            <dd>
              <span className="font-medium">{formatINR(nextDue.total - nextDue.paid, true)}</span>
              <span className={cn("text-xs", nextDue.due_date < new Date().toISOString().slice(0, 10) ? "font-medium text-red-600" : "text-muted-foreground")}> · {nextDue.invoice_number}, due {formatDate(nextDue.due_date)}</span>
            </dd>
          </div>
        )}
      </dl>
    </Panel>
  );
}

// ───────────── Page ─────────────

function Body() {
  const { data: d, isLoading, error, refetch } = usePortalDashboard();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const loading = isLoading || !d;
  const period = d ? formatPeriod(d.period) : "";
  const complete = !!d && d.tasks_total > 0 && d.tasks_done === d.tasks_total;

  return (
    <>
      <PageHeader title="Dashboard" description={d ? `An overview of ${d.company}'s accounting.` : "An overview of your accounting."} actions={d && <span className="bg-card rounded-full border px-3 py-1 text-xs font-medium uppercase">{period}</span>} />
      {d && (
        <div className="bg-card mb-6 flex items-start gap-3 rounded-xl border p-5 shadow-xs">
          <CheckCircle2 className={complete ? "mt-0.5 size-5 text-emerald-600" : "text-muted-foreground mt-0.5 size-5"} aria-hidden />
          <div>
            <p className="font-medium">{period} accounting: {complete ? "complete" : d.tasks_total === 0 ? "not started yet" : "in progress"}</p>
            <p className="text-muted-foreground text-sm">
              {complete
                ? "Everything for this month is finished. Your reports are ready in the Reports section."
                : `${d.tasks_done} of ${d.tasks_total} tasks done${d.open_requests ? `, and your team is waiting on ${d.open_requests} document(s) from you.` : "."}`}
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={loading} label="Tasks completed" value={d ? `${d.tasks_done} of ${d.tasks_total}` : "—"} details={[{ label: "Visible work for", value: period || "—" }]} />
        <KpiCard loading={loading} label="Documents we need from you" value={d?.open_requests} details={[{ label: "See", value: <Link className="text-primary hover:underline" href="/app/requests">Document requests</Link> }]} />
        <KpiCard loading={loading} label="Approvals waiting" value={d?.pending_approvals} details={[{ label: "See", value: <Link className="text-primary hover:underline" href="/app/approvals">Approvals</Link> }]} />
        <KpiCard loading={loading} label="Outstanding" value={formatINR(d?.outstanding, true)} details={[{ label: "See", value: <Link className="text-primary hover:underline" href="/app/billing">Billing</Link> }]} />
      </div>
      {d && (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">
          <div className="grid gap-4 lg:col-span-2">
            <MonthWork period={d.period} />
            <div className="grid gap-4 md:grid-cols-2">
              <LatestReports />
              <RecentUploads />
            </div>
          </div>
          <div className="grid gap-4">
            <NeedsYou />
            <YourTeam />
            <NextMeeting title={d.next_meeting_title} at={d.next_meeting_at} />
            <RecentMessages />
            <YourPlan />
          </div>
        </div>
      )}
    </>
  );
}

/** Dashboard for a company: its proposal (if any), the "reviewing your application" note for new leads, then the overview. */
function DashboardForCompany({ company }: { company: PortalCompany }) {
  const proposal = usePortalProposal().data;
  return (
    <>
      <ProposalCard className="mb-6" />
      {company.status === "lead" && !proposal && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <Hourglass className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Thanks for registering {company.name}</p>
            <p className="mt-1 text-sm opacity-90">
              Our team is reviewing your application. We&apos;ll contact you to understand your business and propose a package. Once you accept, your accounting team is assigned and your work starts here.
            </p>
          </div>
        </div>
      )}
      <Body />
    </>
  );
}

export function ClientDashboard() {
  return <CompanyGate>{(company) => <DashboardForCompany company={company} />}</CompanyGate>;
}
