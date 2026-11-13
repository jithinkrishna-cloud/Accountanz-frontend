"use client";

import { CheckCircle2, CircleSlash, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { useAssignmentPermissions, useJournlCatalog, useSetModulePermission } from "../hooks/use-journl-permissions";
import type { AssignmentPermissions, CatalogModule, ModuleAccess } from "../types/journl-permission.types";

const POLICY_LABEL = { limited: "Limited access", configurable: null, restricted: "Restricted" } as const;

function Gate({ ok, label, hint }: { ok: boolean | null; label: string; hint?: string }) {
  const Icon = ok === null ? HelpCircle : ok ? CheckCircle2 : CircleSlash;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={cn("mt-0.5 size-4 shrink-0", ok === null ? "text-muted-foreground" : ok ? "text-emerald-600" : "text-destructive")} aria-hidden />
      <span>
        {label}
        <span className="sr-only">{ok === null ? " (unknown)" : ok ? " (yes)" : " (no)"}</span>
        {hint && <span className="text-muted-foreground block text-xs">{hint}</span>}
      </span>
    </li>
  );
}

function ModuleRow({ assignmentId, module, access, allowUnverified }: { assignmentId: number; module: CatalogModule; access: ModuleAccess; allowUnverified: boolean }) {
  const set = useSetModulePermission(assignmentId);
  const granted = access.grant?.status === "active" ? access.grant.allowed_actions : [];
  const restricted = module.default_policy === "restricted";
  const toggle = async (actionKey: string, on: boolean) => {
    const actions = on ? [...granted, actionKey] : granted.filter((a) => a !== actionKey);
    try {
      await set.mutateAsync({ moduleKey: module.module_key, actions });
      toast.success(`${module.label}: ${actions.length ? "updated" : "removed"}`);
    } catch (err) {
      applyApiError(err);
    }
  };
  const policy = POLICY_LABEL[module.default_policy];
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {module.label}
          {policy && <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-normal", restricted ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{policy}</span>}
        </p>
        <p className="text-muted-foreground text-xs">
          {!module.verified ? "Mapped, not verified against JournL" : `JournL features ${module.journl_module_id ?? "—"}`}
          {access.effective_actions.length > 0 && <span className="text-emerald-700"> · in effect</span>}
          {access.blocked_reason && <span className="text-amber-700"> · not in effect: {access.blocked_reason}</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {module.actions.length === 0 && <span className="text-muted-foreground text-xs">No actions configured</span>}
        {module.actions.map((a) => {
          const id = `perm-${module.module_key}-${a.action_key}`;
          const disabled = set.isPending || (restricted && !granted.includes(a.action_key)) || (!allowUnverified && !(module.verified && a.verified) && !granted.includes(a.action_key));
          return (
            <div key={a.action_key} className="flex items-center gap-2">
              <Checkbox id={id} checked={granted.includes(a.action_key)} disabled={disabled} onCheckedChange={(v) => void toggle(a.action_key, v === true)} />
              <Label htmlFor={id} className="text-sm font-normal">{a.label}</Label>
            </div>
          );
        })}
      </div>
    </li>
  );
}

function Body({ data, catalog }: { data: AssignmentPermissions; catalog: CatalogModule[] }) {
  return (
    <div className="grid gap-4">
      <ul className="bg-muted/40 grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
        <Gate ok={data.assignment_active} label="Assignment active today" />
        <Gate ok={data.engagement_active} label="Client has an active engagement" />
        <Gate ok={data.journl_access} label="JournL access on" hint={data.journl_access ? undefined : "Turn on under Edit dates & access; modules take effect only while it's on."} />
        <Gate ok={null} label="Client's own grant" hint="Decided and enforced in JournL." />
      </ul>
      {!data.allow_unverified && <p className="text-muted-foreground text-xs">Only modules and actions verified against JournL can be granted here.</p>}
      <ul className="divide-y">
        {catalog.map((m) => {
          const access = data.modules.find((x) => x.module_key === m.module_key);
          return access ? <ModuleRow key={m.module_key} assignmentId={data.assignment_id} module={m} access={access} allowUnverified={data.allow_unverified} /> : null;
        })}
      </ul>
    </div>
  );
}

/** Which JournL modules an assignment may use, mapped to JournL's feature ids. Read-only ("view") for now. */
export function ModulePermissionsDialog({ assignment, onClose }: { assignment: { id: number; full_name: string; client_name: string } | null; onClose: () => void }) {
  const perms = useAssignmentPermissions(assignment?.id ?? null);
  const catalog = useJournlCatalog(!!assignment);
  const error = perms.error ?? catalog.error;
  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>JournL modules: {assignment?.full_name}</DialogTitle>
          <DialogDescription>
            What {assignment?.full_name} may use in {assignment?.client_name}&apos;s JournL. Modules map to JournL&apos;s own features and are read-only for now (bookkeepers see them under Accounting — JournL). Changes are saved immediately and audited.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <ErrorState error={error} onRetry={() => { void perms.refetch(); void catalog.refetch(); }} />
        ) : !perms.data || !catalog.data ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <Body data={perms.data} catalog={catalog.data.modules} />
        )}
      </DialogContent>
    </Dialog>
  );
}
