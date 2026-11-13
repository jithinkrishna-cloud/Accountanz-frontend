"use client";

import { ChevronDown, Eye, TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatINR } from "@/lib/format";
import type { JournlOverview, JournlSection } from "../types/integration.types";

function Block<T>({ title, section, children }: { title: string; section: JournlSection<T>; children: (data: T) => React.ReactNode }) {
  return (
    <section className="border-b px-5 py-4 last:border-b-0">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      {section.error ? <p className="text-destructive text-sm">{section.error}</p> : section.data ? children(section.data) : <p className="text-muted-foreground text-sm">Nothing returned.</p>}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 truncate text-sm">{value || "—"}</dd>
    </div>
  );
}

const amount = (n: number) => (n ? formatINR(n, true) : "—");

function TrialBalance({ groups }: { groups: NonNullable<JournlOverview["trial_balance"]["data"]> }) {
  const [open, setOpen] = useState<number | null>(null);
  const totals = groups.reduce((t, g) => ({ debit: t.debit + g.debit, credit: t.credit + g.credit }), { debit: 0, credit: 0 });
  if (!groups.length) return <p className="text-muted-foreground text-sm">No balances in this period.</p>;
  const difference = Math.round((totals.debit - totals.credit) * 100) / 100;
  return (
    <>
    {difference !== 0 && (
      <p role="status" className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>The trial balance in JournL doesn&apos;t balance: debits and credits differ by {formatINR(Math.abs(difference), true)}. Review the entries in JournL.</span>
      </p>
    )}
    <table className="w-full text-sm">
      <thead className="text-muted-foreground text-xs">
        <tr><th className="pb-2 text-left font-normal">Group</th><th className="pb-2 text-right font-normal">Debit</th><th className="pb-2 text-right font-normal">Credit</th></tr>
      </thead>
      <tbody className="tabular-nums">
        {groups.map((g) => (
          <Fragment key={g.id}>
            <tr className="border-t">
              <td className="py-1.5">
                {g.ledgers.length ? (
                  <button type="button" className="flex items-center gap-1 text-left hover:underline" aria-expanded={open === g.id} onClick={() => setOpen(open === g.id ? null : g.id)}>
                    <ChevronDown className={`size-3.5 transition-transform ${open === g.id ? "" : "-rotate-90"}`} aria-hidden /> {g.name}
                  </button>
                ) : (
                  <span className="pl-4.5">{g.name}</span>
                )}
              </td>
              <td className="py-1.5 text-right">{amount(g.debit)}</td>
              <td className="py-1.5 text-right">{amount(g.credit)}</td>
            </tr>
            {open === g.id &&
              g.ledgers.map((l, i) => (
                <tr key={`${g.id}-${i}`} className="text-muted-foreground">
                  <td className="py-1 pl-8 text-xs">{l.name}</td>
                  <td className="py-1 text-right text-xs">{amount(l.debit)}</td>
                  <td className="py-1 text-right text-xs">{amount(l.credit)}</td>
                </tr>
              ))}
          </Fragment>
        ))}
        <tr className="border-t font-medium">
          <td className="py-1.5">Total</td>
          <td className="py-1.5 text-right">{formatINR(totals.debit, true)}</td>
          <td className="py-1.5 text-right">{formatINR(totals.credit, true)}</td>
        </tr>
      </tbody>
    </table>
    </>
  );
}

function Overview({ data }: { data: JournlOverview }) {
  return (
    <>
      <Block title="Company" section={data.company}>
        {(c) => (
          <dl className="grid grid-cols-2 gap-3">
            <Fact label="Name" value={c.name} />
            <Fact label="JournL ID" value={<span className="font-mono">{c.id}</span>} />
            <Fact label="GSTIN" value={c.gstin && <span className="font-mono">{c.gstin}</span>} />
            <Fact label="State" value={c.state} />
            <Fact label="Email" value={c.email} />
            <Fact label="Books start" value={c.books_start && formatDate(c.books_start)} />
          </dl>
        )}
      </Block>

      <Block title="Branches" section={data.branches}>
        {(rows) => (rows.length ? <p className="text-sm">{rows.map((b) => b.name).join(" · ")}</p> : <p className="text-muted-foreground text-sm">No branches.</p>)}
      </Block>

      <Block title="Profit & loss" section={data.profit_loss}>
        {(pl) => (
          <dl className="grid grid-cols-3 gap-3">
            <Fact label="Income" value={<span className="tabular-nums">{formatINR(pl.total_income, true)}</span>} />
            <Fact label="Expenses" value={<span className="tabular-nums">{formatINR(pl.total_expense, true)}</span>} />
            <Fact
              label={pl.net_profit < 0 ? "Net loss" : "Net profit"}
              value={<span className={`font-medium tabular-nums ${pl.net_profit < 0 ? "text-destructive" : "text-emerald-600"}`}>{formatINR(Math.abs(pl.net_profit), true)}</span>}
            />
          </dl>
        )}
      </Block>

      <Block title="Trial balance (closing)" section={data.trial_balance}>
        {(groups) => <TrialBalance groups={groups} />}
      </Block>

      <Block title="Recent vouchers" section={data.vouchers}>
        {(v) =>
          v.rows.length ? (
            <>
              <p className="text-muted-foreground mb-2 text-xs">Latest {v.rows.length} of {v.total} in this period</p>
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-xs">
                  <tr><th className="pb-2 text-left font-normal">Date</th><th className="pb-2 text-left font-normal">Voucher</th><th className="pb-2 text-left font-normal">Account</th><th className="pb-2 text-right font-normal">Amount</th></tr>
                </thead>
                <tbody>
                  {v.rows.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="py-1.5 whitespace-nowrap tabular-nums">{r.date ? formatDate(r.date) : "—"}</td>
                      <td className="py-1.5"><p>{r.type ?? "—"}</p><p className="text-muted-foreground font-mono text-xs">{r.number}</p></td>
                      <td className="max-w-40 truncate py-1.5">{r.account ?? "—"}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatINR(r.amount, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No vouchers in this period.</p>
          )
        }
      </Block>
    </>
  );
}

/** Where the sheet reads from: the admin route (by connection) or the accountant workspace (by client). */
export interface JournlDataSource {
  key: readonly unknown[];
  title: string;
  orgId: string | null;
  sessionUntil: string | null;
  load: (period: { from?: string; to?: string }) => Promise<JournlOverview>;
}

function SheetBody({ source }: { source: JournlDataSource }) {
  const [draft, setDraft] = useState<{ from?: string; to?: string }>({});
  const [period, setPeriod] = useState<{ from?: string; to?: string }>({});
  const query = useQuery({ queryKey: [...source.key, period], queryFn: () => source.load(period), retry: false, staleTime: 60_000 });

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{source.title} · JournL</SheetTitle>
        <SheetDescription>
          Read live from JournL company {source.orgId}. Read-only: Accountanz doesn&apos;t change anything in JournL.
          {source.sessionUntil && ` JournL session valid until ${formatDate(source.sessionUntil, true)}.`}
        </SheetDescription>
      </SheetHeader>

      <form
        className="flex flex-wrap items-end gap-3 border-b px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPeriod(draft);
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor="jd-from" className="text-xs">From</Label>
          <Input id="jd-from" type="date" className="h-8 w-40" value={draft.from ?? query.data?.period.from ?? ""} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="jd-to" className="text-xs">To</Label>
          <Input id="jd-to" type="date" className="h-8 w-40" value={draft.to ?? query.data?.period.to ?? ""} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={query.isFetching}>Apply</Button>
      </form>

      {query.error ? (
        <ErrorState className="m-5" error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isLoading || !query.data ? (
        <div className="grid gap-3 p-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Overview data={query.data} />
      )}
    </>
  );
}

/** A client's JournL books, read live (GET only) with the owner's JournL sign-in. Used by admins and accountants. */
export function JournlDataSheet({ source, onClose }: { source: JournlDataSource | null; onClose: () => void }) {
  return (
    <Sheet open={!!source} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">{source && <SheetBody key={JSON.stringify(source.key)} source={source} />}</SheetContent>
    </Sheet>
  );
}

export function ViewJournlDataButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Eye className="size-4" aria-hidden /> JournL data
    </Button>
  );
}
