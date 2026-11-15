"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useClientJournlCatalog, useClientSetModulePermission } from "../hooks/use-journl-permissions";
import { journlPermissionService } from "../services/journl-permission-service";
import type { CatalogModule, ClientAssignmentPermission } from "../types/journl-permission.types";

function ModuleRow({
  assignmentId,
  module,
  access,
}: {
  assignmentId: number;
  module: CatalogModule;
  access: { client_actions: string[]; effective: boolean; reason: string | null };
}) {
  const set = useClientSetModulePermission(assignmentId);
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{module.label}</p>
          <p className="text-muted-foreground text-xs">
            {!module.verified ? "Mapped, not verified against JournL" : `JournL features ${module.journl_module_id ?? "—"}`}
            {access.effective && <span className="text-emerald-700 ml-2">· in effect</span>}
            {access.reason && <span className="text-amber-700 ml-2">· not in effect: {access.reason}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {module.actions.length === 0 && <span className="text-muted-foreground text-xs">No actions configured</span>}
          {module.actions.map((a: { action_key: string; label: string }) => {
            const checked = access.client_actions.includes(a.action_key);
            const id = `client-perm-${module.module_key}-${a.action_key}`;
            return (
              <div key={a.action_key} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={set.isPending}
                  onCheckedChange={(v) => {
                    const next = v === true ? [...access.client_actions, a.action_key] : access.client_actions.filter((x) => x !== a.action_key);
                    void set.mutateAsync({ moduleKey: module.module_key, actions: next });
                    toast.success(`${module.label}: ${next.length ? "updated" : "removed"}`);
                  }}
                />
                <Label htmlFor={id} className="text-sm font-normal">{a.label}</Label>
              </div>
            );
          })}
        </div>
      </div>
    </li>
  );
}

/** Client owner: which JournL modules an accountant on your team may use for your company. */
export function ClientJournlPermissionsDialog({
  accountant,
  onClose,
}: {
  accountant: { user_id: number; full_name: string; team_role: string } | null;
  onClose: () => void;
}) {
  const catalog = useClientJournlCatalog(true);
  const { data, isLoading, error } = useQuery({
    queryKey: ["app", "journl-permissions", "team", accountant?.user_id ?? 0],
    queryFn: async () => {
      const all = await journlPermissionService.clientTeam();
      return all.find((a: ClientAssignmentPermission) => a.user_id === accountant?.user_id) ?? null;
    },
    enabled: !!accountant,
  });

  if (!accountant) return null;
  if (error) return <div className="p-4">{String(error)}</div>;
  if (isLoading || !data || !catalog.data) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>JournL access for {accountant.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">{[0, 1, 2].map((i: number) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>JournL access for {accountant.full_name}</DialogTitle>
          <DialogDescription>
            Choose which JournL modules this accountant can use for your company. Your grant is the ceiling —
            Accountanz&rsquo;s team grant and JournL also apply.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary/10 font-medium text-xs">
              {accountant.full_name.split(" ").map((n: string) => n[0]).join("")}
            </div>
            <div>
              <p className="text-sm font-medium">{accountant.full_name}</p>
              <p className="text-muted-foreground text-xs">{accountant.team_role.replaceAll("_", " ")}</p>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Your grant acts as a ceiling: Accountanz&rsquo;s team grant must also allow it, and JournL enforces your side. Only verified modules and actions can be granted.
          </p>
          <ul className="divide-y">
            {catalog.data.modules.map((m: CatalogModule) => {
              const access = data.modules.find((x: { module_key: string }) => x.module_key === m.module_key);
              return access ? (
                <ModuleRow key={m.module_key} assignmentId={data.user_id} module={m} access={access} />
              ) : null;
            })}
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
