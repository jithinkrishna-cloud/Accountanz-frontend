"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/hooks/use-session";
import { applyApiError } from "@/lib/form-errors";
import { useSettings, useUpdateSettings } from "../hooks/use-settings";
import { settingsFormSchema, type SettingsFormOutput, type SettingsFormValues } from "../schemas/settings.schema";
import type { AppSettings } from "../types/settings.types";

const toValues = (s: AppSettings): SettingsFormValues => ({
  company_name: s.company_name,
  legal_name: s.legal_name ?? "",
  gstin: s.gstin ?? "",
  pan: s.pan ?? "",
  email: s.email ?? "",
  phone: s.phone ?? "",
  address: s.address ?? "",
  gst_rate: s.gst_rate,
});

export function SettingsForm() {
  const { data: user } = useSession();
  const canEdit = user?.role === "super_admin";
  const settings = useSettings();
  const update = useUpdateSettings();
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<SettingsFormValues, unknown, SettingsFormOutput>({
    resolver: zodResolver(settingsFormSchema),
  });

  useEffect(() => {
    if (settings.data) reset(toValues(settings.data));
  }, [settings.data, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        ...v,
        legal_name: v.legal_name || null,
        gstin: v.gstin || null,
        pan: v.pan || null,
        email: v.email || null,
        phone: v.phone || null,
        address: v.address || null,
      });
      toast.success("Settings saved");
    } catch (err) {
      applyApiError(err, setError, Object.keys(v));
    }
  });

  const header = <PageHeader title="Settings" description="Accountanz's own billing identity and the GST rate used on service invoices." />;
  if (settings.error) return <>{header}<ErrorState error={settings.error} onRetry={() => void settings.refetch()} /></>;
  if (settings.isLoading) return <>{header}<Skeleton className="h-96 w-full rounded-xl" /></>;

  return (
    <>
      {header}
      {!canEdit && (
        <Alert className="mb-4"><AlertDescription>Only a super admin can change these settings.</AlertDescription></Alert>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <fieldset disabled={!canEdit} className="bg-card rounded-xl border shadow-xs">
          <legend className="sr-only">Company details</legend>
          <h2 className="border-b px-5 py-4 font-medium">Company details</h2>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <FormField id="company_name" label="Company name" error={errors.company_name?.message}><Input id="company_name" {...register("company_name")} /></FormField>
            <FormField id="legal_name" label="Legal name" error={errors.legal_name?.message}><Input id="legal_name" {...register("legal_name")} /></FormField>
            <FormField id="gstin" label="GSTIN" error={errors.gstin?.message}><Input id="gstin" className="uppercase" maxLength={15} {...register("gstin")} /></FormField>
            <FormField id="pan" label="PAN" error={errors.pan?.message}><Input id="pan" className="uppercase" maxLength={10} {...register("pan")} /></FormField>
            <FormField id="email" label="Email" error={errors.email?.message}><Input id="email" type="email" {...register("email")} /></FormField>
            <FormField id="phone" label="Phone" error={errors.phone?.message}><Input id="phone" type="tel" {...register("phone")} /></FormField>
            <FormField id="address" label="Address" error={errors.address?.message} className="sm:col-span-2"><Textarea id="address" rows={3} {...register("address")} /></FormField>
          </div>
        </fieldset>
        <fieldset disabled={!canEdit} className="bg-card rounded-xl border shadow-xs">
          <legend className="sr-only">Billing</legend>
          <div className="border-b px-5 py-4">
            <h2 className="font-medium">Billing</h2>
            <p className="text-muted-foreground text-sm">Applied when a service invoice is raised.</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <FormField id="gst_rate" label="GST rate (%)" error={errors.gst_rate?.message}
              hint="Invoices use the engagement's package fee as the taxable amount and add GST at this rate.">
              <Input id="gst_rate" type="number" inputMode="decimal" min={0} max={28} step="0.01" {...register("gst_rate")} />
            </FormField>
          </div>
        </fieldset>
        {canEdit && (
          <div className="flex justify-end">
            <SubmitButton pending={update.isPending} disabled={!isDirty}>Save settings</SubmitButton>
          </div>
        )}
      </form>
    </>
  );
}
