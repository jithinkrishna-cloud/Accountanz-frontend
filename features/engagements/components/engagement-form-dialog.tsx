"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePackages, useServices } from "@/features/services/hooks/use-catalogue";
import { applyApiError } from "@/lib/form-errors";
import { formatINR } from "@/lib/format";
import { useEngagementClientOptions, useSaveEngagement } from "../hooks/use-engagements";
import { engagementFormSchema, type EngagementFormOutput, type EngagementFormValues } from "../schemas/engagement.schema";
import type { Engagement } from "../types/engagement.types";

const toValues = (e?: Engagement, clientId?: number): EngagementFormValues => ({
  client_id: e ? String(e.client_id) : clientId ? String(clientId) : "",
  package_id: e ? String(e.package_id) : "",
  start_date: e?.start_date ?? "",
  renewal_date: e?.renewal_date ?? "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement?: Engagement;
  onSaved?: (row: Engagement) => void;
  /** Create mode for a known client (e.g. right after creating it): the client is fixed and the picker hidden. */
  forClient?: { id: number; name: string };
}

export function EngagementFormDialog({ open, onOpenChange, engagement, onSaved, forClient }: Props) {
  const editing = !!engagement;
  const save = useSaveEngagement(engagement?.id);
  const packages = usePackages();
  const clients = useEngagementClientOptions(open && !editing && !forClient);
  const packageLocked = editing && engagement.status !== "draft";
  const services = useServices();
  // Per-client services (create only): pre-ticked from the chosen package; edits are kept per package, so
  // switching package starts again from that package's services.
  const [picked, setPicked] = useState<{ pkg: string; ids: number[] } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EngagementFormValues, unknown, EngagementFormOutput>({ resolver: zodResolver(engagementFormSchema), defaultValues: toValues(engagement, forClient?.id) });

  useEffect(() => {
    if (open) reset(toValues(engagement, forClient?.id));
  }, [open, engagement, forClient?.id, reset]);

  const packageId = useWatch({ control, name: "package_id" });
  const packageServices = packages.data?.find((p) => String(p.id) === packageId)?.services.map((s) => s.id) ?? [];
  const serviceIds = picked && picked.pkg === packageId ? picked.ids : packageServices;
  const close = (o: boolean) => {
    if (!o) setPicked(null);
    onOpenChange(o);
  };
  const toggleService = (id: number, on: boolean) =>
    setPicked({ pkg: packageId, ids: on ? [...serviceIds, id] : serviceIds.filter((x) => x !== id) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const extra = editing ? {} : { service_ids: serviceIds };
      const row = await save.mutateAsync(forClient ? { ...values, ...extra, activate_now: true } : { ...values, ...extra });
      toast.success(editing ? "Engagement updated" : forClient ? "Package active" : "Draft engagement created");
      close(false);
      onSaved?.(row);
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  const packageOptions = packages.data?.filter((p) => p.is_active || p.id === engagement?.package_id) ?? [];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit engagement" : forClient ? "Attach a package" : "New engagement"}</DialogTitle>
          <DialogDescription>
            {editing ? engagement.client_name : forClient ? `Pick the package and services for ${forClient.name}. It becomes active straight away; you can upload the signed agreement later.` : "Starts as a draft. Send it, record acceptance, then activate it with the signed agreement."}
          </DialogDescription>
        </DialogHeader>
        <form id="engagement-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {!editing && !forClient && (
            <FormField id="client_id" label="Client" error={errors.client_id?.message} className="sm:col-span-2">
              <Controller
                control={control}
                name="client_id"
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger id="client_id" className="w-full" aria-invalid={!!errors.client_id}>
                      <SelectValue placeholder={clients.isLoading ? "Loading clients…" : "Select a client"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.data?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.trade_name ?? c.legal_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField
            id="package_id"
            label="Package"
            error={errors.package_id?.message}
            hint={packageLocked ? "Once sent, use “Change package” on the engagement so the change is recorded." : undefined}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="package_id"
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange} disabled={packageLocked}>
                  <SelectTrigger id="package_id" className="w-full" aria-invalid={!!errors.package_id}>
                    <SelectValue placeholder={packages.isLoading ? "Loading packages…" : "Select a package"} />
                  </SelectTrigger>
                  <SelectContent>
                    {packageOptions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} · {formatINR(p.monthly_fee)}/mo</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="start_date" label="Start date" error={errors.start_date?.message} hint="Defaults to the activation date.">
            <Input id="start_date" type="date" {...register("start_date")} />
          </FormField>
          <FormField id="renewal_date" label="Renewal date" error={errors.renewal_date?.message}>
            <Input id="renewal_date" type="date" aria-invalid={!!errors.renewal_date} {...register("renewal_date")} />
          </FormField>
          {!editing && packageId && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 text-sm font-medium">Services</legend>
              <p className="text-muted-foreground mb-2 text-xs">From the package. Untick or add services for this client only; the fee stays the package price.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {services.data?.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={serviceIds.includes(s.id)} onCheckedChange={(v) => toggleService(s.id, v === true)} />
                    {s.name}
                  </label>
                ))}
              </div>
              {serviceIds.length === 0 && <p className="text-destructive mt-1 text-xs">Pick at least one service</p>}
            </fieldset>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>{forClient ? "Skip for now" : "Cancel"}</Button>
          <SubmitButton form="engagement-form" pending={save.isPending} disabled={!editing && !!packageId && serviceIds.length === 0}>{editing ? "Save changes" : forClient ? "Activate package" : "Create draft"}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
