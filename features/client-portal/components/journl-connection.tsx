"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Clock, Link2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { useConnectJournl, usePortalSoftware } from "../hooks/use-client-portal";
import type { PortalCompany, PortalSoftware } from "../types/client-portal.types";
import { Card } from "./portal-ui";

const schema = z.object({
  external_org_name: z.string().trim().min(2, "Enter your JournL organisation name").max(200),
  external_org_id: z.string().trim().min(2, "Enter your JournL organisation ID").max(100),
});
type Values = z.infer<typeof schema>;

function JournlMark() {
  return (
    <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold" aria-hidden>
      J
    </span>
  );
}

function ConnectForm({ defaults, onDone, onCancel }: { defaults?: Partial<Values>; onDone: () => void; onCancel?: () => void }) {
  const connect = useConnectJournl();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { external_org_name: "", external_org_id: "", ...defaults } });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await connect.mutateAsync(v);
      toast.success("JournL details sent. Your team will verify access shortly.");
      onDone();
    } catch (err) {
      applyApiError(err, setError, ["external_org_name", "external_org_id"]);
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="external_org_name" label="JournL organisation name" error={errors.external_org_name?.message}>
          <Input id="external_org_name" placeholder="Acme Traders Pvt Ltd" autoFocus aria-invalid={!!errors.external_org_name} {...register("external_org_name")} />
        </FormField>
        <FormField id="external_org_id" label="JournL organisation ID" hint="As shown in your JournL account." error={errors.external_org_id?.message}>
          <Input id="external_org_id" className="font-mono" placeholder="JL-ACM-1234" aria-invalid={!!errors.external_org_id} {...register("external_org_id")} />
        </FormField>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pending={connect.isPending}>
          <Link2 className="size-4" aria-hidden /> Connect JournL
        </SubmitButton>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

const STATE_COPY: Record<string, { icon: typeof Clock; tone: string; text: string }> = {
  pending: { icon: Clock, tone: "text-amber-600", text: "Your Accountanz team is verifying access to this JournL organisation." },
  connected: { icon: CheckCircle2, tone: "text-emerald-600", text: "Your team works directly in your JournL books." },
  error: { icon: TriangleAlert, tone: "text-destructive", text: "We couldn't reach this JournL organisation. Check the details and reconnect." },
  disconnected: { icon: TriangleAlert, tone: "text-muted-foreground", text: "This connection was disconnected. Reconnect to give your team access again." },
};

function ConnectionRow({ row, isOwner }: { row: PortalSoftware; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const copy = STATE_COPY[row.status] ?? STATE_COPY.pending;
  const Icon = copy.icon;
  const canEdit = isOwner && row.status !== "connected";

  return (
    <div className="grid gap-5 p-5">
      <div className="flex flex-wrap items-center gap-4">
        <JournlMark />
        <div className="min-w-0 flex-1">
          <p className="font-medium">JournL</p>
          <p className="text-muted-foreground truncate text-sm">
            {row.external_org_name ?? "Organisation not linked yet"}
            {row.last_health_check ? ` · checked ${formatDate(row.last_health_check, true)}` : ""}
          </p>
        </div>
        <StatusBadge status={row.status} />
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {row.status === "pending" ? "Update details" : "Reconnect"}
          </Button>
        )}
      </div>
      <p className="bg-muted/60 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
        <Icon className={`mt-0.5 size-4 shrink-0 ${copy.tone}`} aria-hidden />
        {copy.text}
      </p>
      {editing && <ConnectForm defaults={{ external_org_name: row.external_org_name ?? "" }} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />}
    </div>
  );
}

function NotConnected({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="grid gap-6 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <JournlMark />
        <div>
          <p className="font-medium">Connect your JournL account</p>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Your books stay in your own JournL organisation. Share its details and your Accountanz team will verify access, then work directly in your books.
          </p>
        </div>
      </div>
      {isOwner ? (
        <ConnectForm onDone={() => undefined} />
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
        <ConnectionRow row={row} isOwner={isOwner} />
      ) : (
        <NotConnected isOwner={isOwner} />
      )}
    </Card>
  );
}
