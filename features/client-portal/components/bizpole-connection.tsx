"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Info, KeyRound, Link2Off, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { formatLocalDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PortalCompany } from "../types/client-portal.types";
import { Card } from "./portal-ui";

/* ---------------- API (server-side tokens; the browser only ever sees status and company details) ---------------- */

type BizpoleStatus = "pending" | "connected" | "error" | "disconnected" | "revoked";
interface CompanyChoice {
  id: string;
  name: string;
  gstin: string | null;
}
interface BizpoleView {
  available: boolean;
  connection: {
    status: BizpoleStatus;
    company_id: string | null;
    company_name: string | null;
    gstin: string | null;
    connected_at: string | null;
    last_checked_at: string | null;
    last_error: string | null;
    companies: CompanyChoice[];
    gstin_warning: string | null;
  } | null;
}

const KEY = ["app", "bizpole"] as const;
const service = {
  view: () => api<BizpoleView>("/app/software/bizpole"),
  connect: (code: string) => api<BizpoleView>("/app/software/bizpole/connect", { method: "POST", body: { code } }),
  choose: (company_id: string) => api<BizpoleView>("/app/software/bizpole/company", { method: "POST", body: { company_id } }),
  disconnect: () => api<BizpoleView & { revoked_at_bizpole: boolean }>("/app/software/bizpole/disconnect", { method: "POST" }),
};

function useBizpole() {
  return useQuery({ queryKey: KEY, queryFn: service.view });
}
function useBizpoleMutation<A, R extends BizpoleView>(fn: (a: A) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: (view) => qc.setQueryData(KEY, view) });
}

/* ---------------- pieces ---------------- */

function BizpoleMark() {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-lg font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300" aria-hidden>
      B
    </span>
  );
}

const STATUS_LABEL: Record<BizpoleStatus, { label: string; tone: string }> = {
  pending: { label: "Choose a company", tone: "pending" },
  connected: { label: "Connected", tone: "connected" },
  error: { label: "Connection error", tone: "error" },
  disconnected: { label: "Disconnected", tone: "disconnected" },
  revoked: { label: "Access revoked", tone: "error" },
};

function Note({ tone = "muted", icon: Icon = Info, children }: { tone?: "muted" | "warn" | "danger" | "ok"; icon?: typeof Info; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
        tone === "muted" && "bg-muted/60",
        tone === "warn" && "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
        tone === "danger" && "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200",
        tone === "ok" && "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

const SAME_PRODUCT =
  "Connect JournL here with a connection code: no password is shared, and your books stay in your own account.";

/** "Connection code required" → "Connecting": the owner creates a code in Bizpole and pastes it here. */
function CodeEntry({ onCancel, again }: { onCancel?: () => void; again?: boolean }) {
  const connect = useBizpoleMutation(service.connect);
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    try {
      const view = await connect.mutateAsync(code.trim());
      setCode(""); // the code is single-use; don't keep it around
      toast.success(view.connection?.status === "pending" ? "Code accepted. Choose which company to connect." : "JournL connected.");
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors.code?.[0] : undefined;
      if (fe && err instanceof ApiError) setFieldError(err.message);
      else applyApiError(err);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
        <li>Open JournL and go to <span className="text-foreground font-medium">System → Integrations</span>.</li>
        <li>Click <span className="text-foreground font-medium">Create connection code</span> for Accountanz and choose the company to share.</li>
        <li>Copy the code and paste it below. It works once and expires after 10 minutes.</li>
      </ol>
      <div className="grid max-w-md gap-1.5">
        <Label htmlFor="bizpole-code">Connection code</Label>
        <Input
          id="bizpole-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="BPC-XXXXX-XXXXX-XXXXX-XXXXX"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? "bizpole-code-error" : undefined}
        />
        {fieldError && <p id="bizpole-code-error" role="alert" className="text-destructive text-xs">{fieldError}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pending={connect.isPending} disabled={connect.isPending || code.trim().length < 8}>
          {connect.isPending ? "Connecting…" : again ? "Reconnect" : "Connect"}
        </SubmitButton>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={connect.isPending}>Cancel</Button>}
      </div>
    </form>
  );
}

/** Several companies were shared: the owner picks the one for this business. */
function CompanyPicker({ companies }: { companies: CompanyChoice[] }) {
  const choose = useBizpoleMutation(service.choose);
  const [picked, setPicked] = useState<string>("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await choose.mutateAsync(picked);
      toast.success("JournL connected.");
    } catch (err) {
      applyApiError(err);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">You shared several companies. Which one is this business?</legend>
        {companies.map((c) => (
          <label key={c.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm", picked === c.id && "border-primary bg-primary/5")}>
            <input type="radio" name="bizpole-company" value={c.id} checked={picked === c.id} onChange={() => setPicked(c.id)} className="accent-primary" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground block text-xs">
                ID {c.id} · {c.gstin ? <span className="font-mono">{c.gstin}</span> : "No GSTIN"}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <SubmitButton pending={choose.isPending} disabled={choose.isPending || !picked}>Use this company</SubmitButton>
      </div>
    </form>
  );
}

function DisconnectDialog({ open, onOpenChange, pendingChoice }: { open: boolean; onOpenChange: (o: boolean) => void; pendingChoice: boolean }) {
  const disconnect = useBizpoleMutation(service.disconnect);
  async function run() {
    try {
      const r = await disconnect.mutateAsync(undefined);
      if (r.revoked_at_bizpole) toast.success("JournL disconnected. Accountanz no longer has access.");
      else toast.warning("Disconnected in Accountanz, but JournL didn't confirm. Also remove Accountanz in JournL → System → Integrations.");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pendingChoice ? "Cancel this connection?" : "Disconnect JournL?"}</DialogTitle>
          <DialogDescription>
            Accountanz will delete its access tokens and ask JournL to revoke the connection. Your accountants will no longer be able to read your JournL data through Accountanz. Your books in JournL are not changed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={disconnect.isPending}>Keep connected</Button>
          <SubmitButton type="button" variant="destructive" pending={disconnect.isPending} onClick={run}>
            {pendingChoice ? "Cancel connection" : "Disconnect"}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm wrap-break-word">{children || "—"}</dd>
    </div>
  );
}

/* ---------------- card ---------------- */

function Body({ view, isOwner }: { view: BizpoleView; isOwner: boolean }) {
  const [entering, setEntering] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const c = view.connection;

  // Not connected (no connection yet, or the integration isn't set up on this server).
  if (!c) {
    return (
      <div className="grid gap-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <BizpoleMark />
          <div>
            <p className="font-medium">Connect JournL</p>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">Give your Accountanz team read-only access to your JournL company: ledgers, parties, vouchers, stock and totals. Accountanz can&apos;t change anything in your books.</p>
          </div>
        </div>
        <Note>{SAME_PRODUCT}</Note>
        {!view.available ? (
          <Note>JournL connections aren&apos;t available yet. Your team will let you know when they are.</Note>
        ) : !isOwner ? (
          <Note>Only your company owner can connect JournL.</Note>
        ) : entering ? (
          <CodeEntry onCancel={() => setEntering(false)} />
        ) : (
          <div>
            <Button onClick={() => setEntering(true)}><KeyRound className="size-4" aria-hidden /> Connect JournL</Button>
          </div>
        )}
      </div>
    );
  }

  const status = STATUS_LABEL[c.status];
  const canReconnect = isOwner && view.available && (c.status === "revoked" || c.status === "disconnected" || c.status === "error");
  const canDisconnect = isOwner && c.status !== "disconnected";

  return (
    <div className="grid gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <BizpoleMark />
          <div className="min-w-0">
            <p className="font-medium">JournL</p>
            <p className="text-muted-foreground text-sm">{c.company_name ?? (c.status === "pending" ? "Company not chosen yet" : "No company linked")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status.tone} label={status.label} />
          {canDisconnect && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              <Link2Off className="size-4" aria-hidden /> {c.status === "pending" ? "Cancel" : "Disconnect"}
            </Button>
          )}
        </div>
      </div>

      {c.status !== "pending" && c.company_id && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="Company">{c.company_name} <span className="text-muted-foreground">· ID {c.company_id}</span></Fact>
          <Fact label="GSTIN">{c.gstin && <span className="font-mono">{c.gstin}</span>}</Fact>
          <Fact label="Connected">{c.connected_at && formatLocalDateTime(c.connected_at)}</Fact>
          <Fact label="Last successful check">{c.last_checked_at && formatLocalDateTime(c.last_checked_at)}</Fact>
        </dl>
      )}

      {c.status === "connected" && <Note tone="ok" icon={CheckCircle2}>Connected, read-only. Your Accountanz team can read this company&apos;s books; nothing is written to JournL.</Note>}
      {c.status === "connected" && c.gstin_warning && <Note tone="warn" icon={TriangleAlert}>{c.gstin_warning}</Note>}
      {c.status === "pending" && (isOwner ? <CompanyPicker companies={c.companies} /> : <Note>Your company owner is choosing which JournL company to connect.</Note>)}
      {c.status === "error" && <Note tone="danger" icon={TriangleAlert}>{c.last_error ?? "Accountanz couldn't read this JournL company."} Reconnect with a new code if this continues.</Note>}
      {c.status === "revoked" && <Note tone="danger" icon={TriangleAlert}>Access was revoked in JournL, or the connection expired. Create a new connection code in JournL to reconnect.</Note>}
      {c.status === "disconnected" && <Note>Disconnected. Your team no longer has access to JournL through Accountanz.</Note>}

      {canReconnect && (entering ? <CodeEntry again onCancel={() => setEntering(false)} /> : (
        <div>
          <Button variant="outline" onClick={() => setEntering(true)}><KeyRound className="size-4" aria-hidden /> {c.status === "disconnected" ? "Connect again" : "Reconnect"}</Button>
        </div>
      ))}
      {!isOwner && c.status !== "connected" && c.status !== "pending" && <Note>Only your company owner can reconnect JournL.</Note>}

      <Note>{SAME_PRODUCT}</Note>
      <DisconnectDialog open={confirming} onOpenChange={setConfirming} pendingChoice={c.status === "pending"} />
    </div>
  );
}

/** Client Settings → Integrations: the JournL partner connection (read-only). */
export function BizpoleConnection({ company }: { company: PortalCompany }) {
  const { data, isLoading, error, refetch } = useBizpole();
  return (
    <Card title="JournL" subtitle="Read-only access for your Accountanz team, linked with a connection code from JournL.">
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="p-5"><Skeleton className="h-24 w-full" /></div>
      ) : (
        <Body view={data} isOwner={company.role === "owner"} />
      )}
    </Card>
  );
}
