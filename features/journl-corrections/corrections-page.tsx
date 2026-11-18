"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useJournlWorkspace } from "@/features/journl-workspace/hooks/use-journl-workspace";
import { formatDate } from "@/lib/format";
import {
  correctionService,
  money,
  normaliseAmount,
  useBranches,
  useCorrection,
  useCorrectionAction,
  useCorrections,
  useCreateCorrection,
  type Correction,
  type CorrectionInput,
  type LedgerHit,
  type Preview,
  type Side,
} from "./api";

const STATUS_LABEL: Record<Correction["status"], string> = {
  draft: "Draft",
  pending_approval: "Waiting for approval",
  approved: "Approved, not yet posted",
  posting: "Posting…",
  posted: "Posted",
  rejected: "Rejected",
  unknown: "Outcome unknown — check JournL",
};
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export function CorrectionsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const ws = useJournlWorkspace();
  const clients = (ws.data?.clients ?? []).filter((c) => c.connected);
  const clientId = Number(params.get("client")) || clients[0]?.client_id || null;
  const list = useCorrections(clientId);
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState<null | "journal" | "opening" | "suspense">(null);

  return (
    <div className="grid gap-5">
      <PageHeader title="Corrections" description="Corrections to the client's JournL books. Each one is prepared by one person and approved by another before Accountanz sends it to JournL." />
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label>Client</Label>
          <Select value={clientId ? String(clientId) : undefined} onValueChange={(v) => router.replace(`?client=${v}`)}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Choose a client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.client_id} value={String(c.client_id)}>{c.client_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {clientId && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCreating("journal")}><Plus className="size-4" />Journal entry</Button>
            <Button variant="outline" onClick={() => setCreating("opening")}><Plus className="size-4" />Opening balance</Button>
            <Button variant="outline" onClick={() => setCreating("suspense")}><Plus className="size-4" />Unresolved trial balance difference</Button>
          </div>
        )}
      </div>

      {list.isLoading ? <Skeleton className="h-40 w-full" /> : list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !list.data?.items.length ? (
        <EmptyState title="No corrections yet" description="Corrections you prepare or review for this client appear here." />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Reason</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.data.items.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                <TableCell className="font-medium">{c.ref}</TableCell>
                <TableCell>
                  {c.purpose === "unresolved_tb_difference" ? (
                    <span>Unresolved trial balance difference <Badge variant="outline" className="ml-1 border-amber-500 text-amber-700">Unresolved</Badge></span>
                  ) : c.kind === "journal_entry" ? "Journal entry" : `Opening balance · ${c.payload.ledger_name ?? ""}`}
                </TableCell>
                <TableCell><Badge variant={c.status === "unknown" || c.stuck ? "destructive" : "secondary"}>{c.stuck ? "Stuck — check JournL" : STATUS_LABEL[c.status]}</Badge></TableCell>
                <TableCell className="max-w-80 truncate">{c.reason}</TableCell>
                <TableCell>{formatDate(c.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {clientId && openId != null && <CorrectionDialog clientId={clientId} id={openId} onClose={() => setOpenId(null)} />}
      {clientId && creating && <NewCorrectionDialog clientId={clientId} mode={creating} onClose={() => setCreating(null)} onCreated={(id) => { setCreating(null); setOpenId(id); }} />}
    </div>
  );
}

function BalanceTable({ before, after, diffBefore, diffAfter }: { before: Preview["before_values"]; after: Preview["after_values"]; diffBefore?: number; diffAfter?: number }) {
  return (
    <div className="grid gap-2">
      <Table>
        <TableHeader><TableRow><TableHead>Ledger</TableHead><TableHead className="text-right">Before</TableHead><TableHead className="text-right">After</TableHead></TableRow></TableHeader>
        <TableBody>
          {before.map((b) => (
            <TableRow key={b.ledger_id}>
              <TableCell>{b.ledger_name}</TableCell>
              <TableCell className="text-right">{money(b.before_paise)}</TableCell>
              <TableCell className="text-right">{money(after.find((a) => a.ledger_id === b.ledger_id)?.after_paise ?? b.after_paise)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {diffBefore != null && diffAfter != null && (
        <p className="text-sm">Trial balance difference: <strong>{money(diffBefore)}</strong> → <strong>{money(diffAfter)}</strong>{diffBefore === diffAfter && " (a balanced journal doesn't change it)"}</p>
      )}
    </div>
  );
}

function LedgerPicker({ clientId, value, onChange }: { clientId: number; value: LedgerHit | null; onChange: (l: LedgerHit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<LedgerHit[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => correctionService.ledgers(clientId, q).then((r) => setHits(r.items)).catch(() => setHits([])), 300);
    return () => clearTimeout(t);
  }, [q, clientId]);
  return (
    <div className="relative grid gap-1">
      <Input value={value && !q ? `${value.name} (#${value.id})` : q} placeholder="Search ledger" onChange={(e) => setQ(e.target.value)} />
      {hits.length > 0 && q && (
        <ul className="bg-popover absolute top-10 z-50 max-h-56 w-full overflow-auto rounded-md border shadow">
          {hits.map((h) => (
            <li key={h.id}><button type="button" className="hover:bg-accent w-full px-3 py-1.5 text-left text-sm" onClick={() => { onChange(h); setQ(""); setHits([]); }}>{h.name} <span className="text-muted-foreground">· {h.group_name} · #{h.id}</span></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Line { ledger: LedgerHit | null; side: Side; amount: string }

function NewCorrectionDialog({ clientId, mode, onClose, onCreated }: { clientId: number; mode: "journal" | "opening" | "suspense"; onClose: () => void; onCreated: (id: number) => void }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const branches = useBranches(clientId, true);
  const branchName = (id: number) => branches.data?.items.find((b) => b.id === id)?.name ?? "unknown branch";
  const create = useCreateCorrection(clientId);
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(today);
  const [branch, setBranch] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([{ ledger: null, side: "dr", amount: "" }, { ledger: null, side: "cr", amount: "" }]);
  const [ledger, setLedger] = useState<LedgerHit | null>(null);
  const [amount, setAmount] = useState("");
  const [side, setSide] = useState<Side>("cr");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paise = (a: string) => Math.round(Number(normaliseAmount(a) || 0) * 100);
  const dr = lines.filter((l) => l.side === "dr").reduce((s, l) => s + paise(l.amount), 0);
  const cr = lines.filter((l) => l.side === "cr").reduce((s, l) => s + paise(l.amount), 0);

  const input = (): CorrectionInput | null => {
    if (mode === "journal") {
      if (!branch || lines.some((l) => !l.ledger)) return null;
      return { kind: "journal_entry", purpose: "correction", reason, branch_id: Number(branch), voucher_date: date, lines: lines.map((l) => ({ ledger_id: l.ledger!.id, ledger_name: l.ledger!.name, side: l.side, amount: normaliseAmount(l.amount) })) };
    }
    if (!ledger) return null;
    if (mode === "suspense") return { kind: "opening_balance", purpose: "unresolved_tb_difference", reason, ledger_id: ledger.id };
    return { kind: "opening_balance", purpose: "correction", reason, ledger_id: ledger.id, ledger_name: ledger.name, amount: normaliseAmount(amount), side };
  };
  const change = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPreview(null); };

  async function runPreview() {
    const body = input();
    if (!body) return setError("Fill in every field first.");
    setError(null);
    try { setPreview(await correctionService.preview(clientId, body)); } catch (e) { setPreview(null); setError(errorText(e)); }
  }
  async function save() {
    const body = input();
    if (!body) return;
    try { const c = await create.mutateAsync(body); toast.success(`${c.ref} saved as a draft`); onCreated(c.id); } catch (e) { setError(errorText(e)); }
  }

  const title = mode === "journal" ? "New correcting journal entry" : mode === "opening" ? "New opening balance correction" : "Unresolved trial balance difference";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          {mode === "suspense" && (
            <p className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Parks the remaining trial balance difference on an existing Suspense ledger. The trial balance will balance, but the underlying errors are <strong>not</strong> fixed. The amount and side are calculated from the books.
            </p>
          )}
          {mode === "journal" ? (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="grid gap-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => change(setDate)(e.target.value)} /></div>
                <div className="grid gap-1.5">
                  <Label>JournL branch</Label>
                  <Select value={branch} onValueChange={change(setBranch)}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Choose a branch" /></SelectTrigger>
                    <SelectContent>{branches.data?.items.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-[1fr_6rem_9rem_2rem] items-start gap-2">
                    <LedgerPicker clientId={clientId} value={l.ledger} onChange={(v) => change(setLines)(lines.map((x, j) => (j === i ? { ...x, ledger: v } : x)))} />
                    <Select value={l.side} onValueChange={(v) => change(setLines)(lines.map((x, j) => (j === i ? { ...x, side: v as Side } : x)))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="dr">Dr</SelectItem><SelectItem value="cr">Cr</SelectItem></SelectContent>
                    </Select>
                    <Input inputMode="decimal" placeholder="Amount ₹" value={l.amount} onChange={(e) => change(setLines)(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                    <Button type="button" variant="ghost" size="icon" disabled={lines.length <= 2} onClick={() => change(setLines)(lines.filter((_, j) => j !== i))} aria-label="Remove line"><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { ledger: null, side: "dr", amount: "" }])}><Plus className="size-4" />Line</Button>
                  <p className={dr === cr ? "text-sm" : "text-destructive text-sm"}>Dr {money(-dr)} · Cr {money(cr)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label>{mode === "suspense" ? "Suspense ledger" : "Ledger"}</Label><LedgerPicker clientId={clientId} value={ledger} onChange={change(setLedger)} /></div>
              {mode === "opening" && (
                <div className="flex gap-3">
                  <div className="grid gap-1.5"><Label>New opening balance ₹</Label><Input inputMode="decimal" value={amount} onChange={(e) => change(setAmount)(e.target.value)} /></div>
                  <div className="grid gap-1.5">
                    <Label>Side</Label>
                    <Select value={side} onValueChange={(v) => change(setSide)(v as Side)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="dr">Dr</SelectItem><SelectItem value="cr">Cr</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Reason{mode === "suspense" && <span className="text-muted-foreground"> — prefixed with “Temporary adjustment: unresolved trial balance difference”</span>}</Label>
            <Textarea value={reason} onChange={(e) => change(setReason)(e.target.value)} />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {preview && (
            <p className="text-sm">
              <strong>JournL branch:</strong> {branchName(preview.journl_branch_id)} (#{preview.journl_branch_id})
              {mode !== "journal" && <span className="text-muted-foreground"> — the branch of this ledger&apos;s opening balance; it can&apos;t be changed and is sent with the correction.</span>}
            </p>
          )}
          {preview && <BalanceTable before={preview.before_values} after={preview.after_values} diffBefore={preview.tb_difference_before} diffAfter={preview.tb_difference_after} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={runPreview}>Preview</Button>
          <Button onClick={save} disabled={!preview || create.isPending || (mode === "journal" && dr !== cr)}>Save draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CorrectionDialog({ clientId, id, onClose }: { clientId: number; id: number; onClose: () => void }) {
  const q = useCorrection(clientId, id);
  const act = useCorrectionAction(clientId);
  const [comment, setComment] = useState("");
  const c = q.data;

  async function run(action: string, body?: unknown, ok?: string) {
    try {
      const r = await act.mutateAsync({ id, action, body });
      if (r && "found" in (r as object)) toast.message(JSON.stringify(r)); // Check JournL result (rare path; shown raw)
      else toast.success(r?.message ?? ok ?? "Done");
      setComment("");
    } catch (e) { toast.error(errorText(e)); }
  }
  const needComment = (action: string) => (comment.trim() ? run(action, { comment }) : toast.error("Write a comment first"));
  const resolve = (to: "posted" | "rejected") => (comment.trim() ? run("resolve", { to, note: comment }) : toast.error("Write a note first"));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {!c ? (q.error ? <ErrorState error={q.error} /> : <Skeleton className="h-60" />) : (
          <>
            <DialogHeader><DialogTitle>{c.ref} · {c.stuck ? "Stuck — check JournL" : STATUS_LABEL[c.status]}</DialogTitle></DialogHeader>
            <div className="grid gap-3 text-sm">
              <p><strong>Reason:</strong> {c.reason}</p>
              <p>
                {c.kind === "journal_entry" && <><strong>Date:</strong> {c.payload.voucher_date} · </>}
                <strong>JournL branch:</strong> #{c.journl_branch_id}
              </p>
              {c.journl_voucher_id && <p><strong>JournL voucher:</strong> {c.journl_voucher_id}</p>}
              {c.review_comment && <p><strong>Reviewer:</strong> {c.review_comment}</p>}
              {c.journl_message && <p className="text-destructive"><strong>{c.rejected_by_source === "stale" ? "Cancelled (books changed)" : "JournL"}:</strong> {c.journl_message}</p>}
              {c.before_values && c.after_values && <BalanceTable before={c.before_values} after={c.after_values} />}
              {!!c.events?.length && (
                <ul className="text-muted-foreground grid gap-0.5 text-xs">
                  {c.events.map((e, i) => <li key={i}>{formatDate(e.created_at, true)} · {e.from_status ?? "—"} → {e.to_status}{e.actor_name ? ` · ${e.actor_name}` : ""}{e.note ? ` · ${e.note}` : ""}</li>)}
                </ul>
              )}
              {(c.can_review || c.status === "unknown" || c.stuck) && <Textarea placeholder="Comment / note" value={comment} onChange={(e) => setComment(e.target.value)} />}
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {c.can_submit && <Button onClick={() => run("submit", undefined, "Submitted for approval")}>Submit for approval</Button>}
              {c.can_review && c.status === "pending_approval" && (
                <>
                  <Button variant="outline" onClick={() => needComment("send-back")}>Send back</Button>
                  <Button variant="destructive" onClick={() => needComment("reject")}>Reject</Button>
                  <Button onClick={() => run("approve", comment.trim() ? { comment } : {}, "Approved")} disabled={act.isPending}>Approve &amp; post</Button>
                </>
              )}
              {c.status === "approved" && <Button onClick={() => run("post")} disabled={act.isPending}>Post to JournL</Button>}
              {(c.status === "unknown" || c.stuck) && (
                <>
                  <Button variant="outline" onClick={() => run("check")}>Check JournL</Button>
                  <Button variant="outline" onClick={() => resolve("posted")}>Mark posted</Button>
                  <Button variant="outline" onClick={() => resolve("rejected")}>Mark not posted</Button>
                </>
              )}
              {c.status === "rejected" && c.rejected_by_source === "stale" && <Button onClick={() => run("prepare-again", undefined, "New draft prepared")}>Prepare again</Button>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
