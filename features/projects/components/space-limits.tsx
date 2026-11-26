"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/hooks/use-session";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { useGrantOverride, useLimits, useRevokeOverride, useSyncIssues, useSyncNow } from "../hooks/use-projects";
import type { EntitlementOverride, OverrideLimitType, SyncIssueReason } from "../types/project.types";
import { useSpaceCtx } from "./space-layout";

const LIMIT_LABELS: Record<OverrideLimitType, string> = { workspaces: "Workspaces", staff_per_workspace: "Staff per workspace" };
const REASON_LABELS: Record<SyncIssueReason, string> = {
  staff_limit: "No free staff seat",
  role_not_included: "Role not included in the package",
  no_active_package: "Client has no active package",
};

const value = (n: number | null | undefined) => (n == null ? "Unlimited" : String(n));
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Package limits, active overrides and usage for a client space. Renders nothing for internal spaces. */
export function SpaceLimitsPanel() {
  const { space } = useSpaceCtx();
  const { data: me } = useSession();
  const { data: limits } = useLimits(space.space_key);
  const revoke = useRevokeOverride(space.space_key);
  const [granting, setGranting] = useState(false);
  if (!limits) return null;
  const isSuper = me?.role === "super_admin";
  const noPackage = !limits.base || !limits.effective;

  const revokeOverride = (o: EntitlementOverride) => {
    if (!window.confirm(`Revoke +${o.extra} ${LIMIT_LABELS[o.limit_type].toLowerCase()}? The limit drops back immediately.`)) return;
    void revoke.mutateAsync(o.id).then(() => toast.success("Extra room revoked")).catch((e) => applyApiError(e));
  };

  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">Package limits</h2>
          <p className="text-muted-foreground text-xs">{limits.package_name ?? "No active package"}</p>
        </div>
        {isSuper && !noPackage && <Button size="sm" variant="outline" onClick={() => setGranting(true)}><Plus className="size-4" /> Grant extra room</Button>}
      </div>
      {noPackage ? (
        <p className="text-muted-foreground p-4 text-sm">This client has no active package</p>
      ) : (
        <dl className="grid gap-4 p-4 sm:grid-cols-2">
          {([["Workspaces", "workspaces", "workspaces"], ["Staff", "staff", "staff"]] as const).map(([label, k, unit]) => (
            <div key={k} className="rounded-lg border p-3">
              <dt className="text-muted-foreground text-xs font-semibold">{label}</dt>
              <dd className="mt-1 text-sm">
                <span className="font-medium">{limits.usage[k]} of {value(limits.effective?.[k])} {unit}</span>
                <span className="text-muted-foreground block text-xs">Package: {value(limits.base?.[k])}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {limits.overrides.length > 0 && (
        <ul className="divide-y border-t">
          {limits.overrides.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">+{o.extra} {LIMIT_LABELS[o.limit_type].toLowerCase()}</p>
                <p className="text-muted-foreground text-xs">{o.reason}</p>
                <p className="text-muted-foreground text-xs">
                  {o.created_by_name ? `Granted by ${o.created_by_name}` : "Granted"} · {o.expires_at ? `expires ${formatDate(o.expires_at)}` : "no expiry"}
                </p>
              </div>
              {isSuper && <Button size="sm" variant="ghost" disabled={revoke.isPending} onClick={() => revokeOverride(o)}>Revoke</Button>}
            </li>
          ))}
        </ul>
      )}
      {isSuper && <GrantDialog open={granting} onClose={() => setGranting(false)} />}
    </section>
  );
}

function GrantDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { space } = useSpaceCtx();
  const grant = useGrantOverride(space.space_key);
  const [type, setType] = useState<OverrideLimitType>("staff_per_workspace");
  const [extra, setExtra] = useState("1");
  const [reason, setReason] = useState("");
  const [expires, setExpires] = useState("");
  const n = Number(extra);
  const valid = Number.isInteger(n) && n >= 1 && n <= 99 && reason.trim().length >= 3 && reason.trim().length <= 500 && (!expires || expires >= todayIso());
  const close = () => (setType("staff_per_workspace"), setExtra("1"), setReason(""), setExpires(""), onClose());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grant extra room</DialogTitle>
          <DialogDescription>Adds to the package limit for {space.name} until revoked or expired.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField id="ovr-type" label="Limit *">
            <Select value={type} onValueChange={(v) => setType(v as OverrideLimitType)}>
              <SelectTrigger id="ovr-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff_per_workspace">Staff per workspace</SelectItem>
                <SelectItem value="workspaces">Workspaces</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="ovr-extra" label="Extra *" hint="1 to 99.">
            <Input id="ovr-extra" type="number" min={1} max={99} value={extra} onChange={(e) => setExtra(e.target.value)} />
          </FormField>
          <FormField id="ovr-reason" label="Reason *" hint="3 to 500 characters. Recorded with the grant.">
            <Textarea id="ovr-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <FormField id="ovr-expires" label="Expires on" hint="Optional. Leave empty for no expiry.">
            <Input id="ovr-expires" type="date" min={todayIso()} value={expires} onChange={(e) => setExpires(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <SubmitButton
            pending={grant.isPending}
            disabled={!valid}
            onClick={() =>
              void grant
                .mutateAsync({ limit_type: type, extra: n, reason: reason.trim(), expires_at: expires || null })
                .then(() => (toast.success("Extra room granted"), close()))
                .catch((e) => applyApiError(e))
            }
          >
            Grant
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Staff who should be in the primary space but could not be added. Portal admins only. */
export function SyncIssuesPanel() {
  const { space } = useSpaceCtx();
  const { data: me } = useSession();
  const portalAdmin = me?.role === "super_admin" || me?.role === "ops_admin";
  const enabled = portalAdmin && space.kind === "client_primary";
  const { data: issues } = useSyncIssues(space.space_key, enabled);
  const sync = useSyncNow(space.space_key);
  if (!enabled) return null;
  const list = issues ?? [];

  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-sm font-semibold">Client team sync</h2>
          <p className="text-muted-foreground text-xs">
            {list.length ? "Assigned to this client but not added to the space." : "Members follow the client's assigned team. No open issues."}
          </p>
        </div>
        <SubmitButton
          size="sm"
          variant="outline"
          pending={sync.isPending}
          onClick={() =>
            void sync
              .mutateAsync()
              .then((r) => toast.success(`Synced: ${r.added.length} added, ${r.removed.length} removed, ${r.issues.length} still blocked`))
              .catch((e) => applyApiError(e))
          }
        >
          {!sync.isPending && <RefreshCw className="size-4" />} Sync now
        </SubmitButton>
      </div>
      <ul className="divide-y">
        {list.map((i) => (
          <li key={i.user_id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
            <span>
              <span className="block font-medium">{i.full_name}</span>
              <span className="text-muted-foreground block text-xs">{i.email}</span>
            </span>
            <span className="text-right">
              <span className="block">{REASON_LABELS[i.reason] ?? i.reason}</span>
              <span className="text-muted-foreground block text-xs">Since {formatDate(i.created_at)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
