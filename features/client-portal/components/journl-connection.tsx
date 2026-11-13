"use client";

import { CheckCircle2, Clock, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { useDisconnectJournl, usePortalSoftware } from "../hooks/use-client-portal";
import type { PortalCompany, PortalSoftware } from "../types/client-portal.types";
import { AuthorizeJournlDialog } from "./authorize-journl-dialog";
import { Card } from "./portal-ui";

function JournlMark() {
  return (
    <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold" aria-hidden>
      J
    </span>
  );
}

const STATE_COPY: Record<string, { icon: typeof Clock; tone: string; text: string }> = {
  pending: { icon: Clock, tone: "text-amber-600", text: "Waiting for confirmation. Sign in with JournL to connect straight away." },
  connected: { icon: CheckCircle2, tone: "text-emerald-600", text: "Connected. Your Accountanz team works directly in your JournL books." },
  error: { icon: TriangleAlert, tone: "text-destructive", text: "We couldn't reach this JournL organisation. Check the details and reconnect." },
  disconnected: { icon: TriangleAlert, tone: "text-muted-foreground", text: "This connection was disconnected. Reconnect to give your team access again." },
};

function DisconnectButton() {
  const disconnect = useDisconnectJournl();
  const [confirming, setConfirming] = useState(false);
  const run = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success("JournL disconnected. Your team no longer has access through Accountanz.");
    } catch (err) {
      applyApiError(err);
    } finally {
      setConfirming(false);
    }
  };
  if (!confirming) {
    return <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>Disconnect</Button>;
  }
  return (
    <span className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Disconnect JournL?</span>
      <SubmitButton type="button" size="sm" variant="destructive" pending={disconnect.isPending} onClick={run}>Yes, disconnect</SubmitButton>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
    </span>
  );
}

function ConnectionRow({ row, isOwner, companyName }: { row: PortalSoftware; isOwner: boolean; companyName: string }) {
  const [editing, setEditing] = useState(false);
  const copy = STATE_COPY[row.status] ?? STATE_COPY.pending;
  const Icon = copy.icon;
  const canEdit = isOwner && row.status !== "connected";
  const canRefresh = isOwner && row.status === "connected" && !row.session_until;
  const canDisconnect = isOwner && row.status !== "disconnected";
  const checkedAt = row.verified_at ?? row.last_health_check;

  return (
    <div className="grid gap-5 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <JournlMark />
        <div className="min-w-0 flex-1">
          <p className="font-medium">JournL</p>
          <p className="text-muted-foreground truncate text-sm">
            {row.external_org_name ?? "Organisation not linked yet"}
            {row.external_org_id ? ` · ID ${row.external_org_id}` : ""}
            {row.status === "connected" && checkedAt ? ` · verified ${formatDate(checkedAt, true)}` : row.authorized_at ? ` · authorized ${formatDate(row.authorized_at, true)}` : ""}
          </p>
        </div>
        <StatusBadge status={row.status} />
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <ShieldCheck className="size-4" aria-hidden /> {row.status === "pending" ? "Sign in with JournL" : "Reconnect with JournL"}
          </Button>
        )}
        {canRefresh && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <ShieldCheck className="size-4" aria-hidden /> Refresh JournL session
          </Button>
        )}
        {canDisconnect && <DisconnectButton />}
      </div>
      <p className="bg-muted/60 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
        <Icon className={`mt-0.5 size-4 shrink-0 ${copy.tone}`} aria-hidden />
        <span>
          {copy.text}
          {row.status === "connected" &&
            (row.session_until
              ? ` Accountanz can read your JournL books until ${formatDate(row.session_until, true)}.`
              : " JournL sessions last 8 hours: refresh it so your team can read your books.")}
        </span>
      </p>
      <AuthorizeJournlDialog open={editing} onOpenChange={setEditing} companyName={companyName} />
    </div>
  );
}

function NotConnected({ isOwner, companyName }: { isOwner: boolean; companyName: string }) {
  const [authorizing, setAuthorizing] = useState(false);
  return (
    <div className="grid gap-6 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <JournlMark />
        <div>
          <p className="font-medium">Connect your JournL account</p>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Your books stay in your own JournL organisation. Sign in with your JournL company account to authorize Accountanz. Your team then works directly in your books.
          </p>
        </div>
      </div>
      {isOwner ? (
        <div>
          <Button onClick={() => setAuthorizing(true)}>
            <ShieldCheck className="size-4" aria-hidden /> Sign in with JournL
          </Button>
          <AuthorizeJournlDialog open={authorizing} onOpenChange={setAuthorizing} companyName={companyName} />
        </div>
      ) : (
        <p className="bg-muted/60 text-muted-foreground rounded-lg px-3 py-2.5 text-sm">Only your company owner can connect JournL. Ask them to do it from this page.</p>
      )}
    </div>
  );
}

/** The client's JournL connection: connect it, follow verification, or reconnect. */
export function JournlConnection({ company }: { company: PortalCompany }) {
  const { data, isLoading, error, refetch } = usePortalSoftware();
  const isOwner = company.role === "owner";
  const row = data?.find((s) => s.provider === "journl");

  return (
    <Card title="JournL" subtitle="Accountanz works on JournL. Your books stay in your own account; we never keep the ledger.">
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="p-5">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : row ? (
        <ConnectionRow row={row} isOwner={isOwner} companyName={company.name} />
      ) : (
        <NotConnected isOwner={isOwner} companyName={company.name} />
      )}
    </Card>
  );
}
