"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { useConnectJournl } from "../hooks/use-client-portal";

const schema = z.object({
  journl_email: z.email("Enter your JournL email"),
  journl_password: z.string().min(1, "Enter your JournL password"),
  company_id: z.string().optional(),
  authorize: z.boolean().refine((v) => v, "Tick the box to authorize Accountanz"),
});
type Values = z.infer<typeof schema>;
type JournlCompany = { id: string; name: string };

const CAN = [
  "Record and post entries in your JournL books",
  "Prepare GST returns and financial reports from your JournL books",
  "Use only the JournL modules your Accountanz team is assigned",
];
const CANNOT = ["Keep a copy of your ledger outside JournL", "See or store your JournL password"];

/** The server lists the owner's JournL companies when the account owns more than one. */
function companiesFrom(err: unknown): JournlCompany[] | null {
  if (!(err instanceof ApiError) || typeof err.details !== "object" || err.details === null) return null;
  const list = (err.details as { companies?: unknown }).companies;
  return Array.isArray(list) ? (list as JournlCompany[]) : null;
}

function AuthorizeForm({ companyName, onDone }: { companyName: string; onDone: () => void }) {
  const connect = useConnectJournl();
  const [companies, setCompanies] = useState<JournlCompany[] | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { journl_email: "", journl_password: "", authorize: false } });

  const onSubmit = handleSubmit(async (v) => {
    if (companies && !v.company_id) {
      setError("company_id", { message: "Choose the JournL company for this business" });
      return;
    }
    try {
      const rows = await connect.mutateAsync({ journl_email: v.journl_email, journl_password: v.journl_password, company_id: v.company_id || undefined, authorize: true });
      const org = rows.find((r) => r.provider === "journl");
      toast.success(`JournL connected${org?.external_org_name ? `: ${org.external_org_name}` : ""}`);
      onDone();
    } catch (err) {
      const list = companiesFrom(err);
      if (list) setCompanies(list);
      // The password is never kept: clear it after a failed attempt.
      setValue("journl_password", "");
      applyApiError(err, setError, ["journl_email", "journl_password", "company_id", "authorize"]);
    }
  });

  return (
    <>
      <DialogHeader>
        <div className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-xl" aria-hidden>
          <ShieldCheck className="size-5" />
        </div>
        <DialogTitle>Sign in with JournL</DialogTitle>
        <DialogDescription>
          Connect the JournL company account you already have: Accountanz doesn&apos;t create JournL accounts. JournL confirms which company is yours and Accountanz connects to it. Your password goes to JournL only and is never stored.
        </DialogDescription>
      </DialogHeader>

      <form id="authorize-journl-form" onSubmit={onSubmit} className="grid gap-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="journl_email" label="JournL email" error={errors.journl_email?.message}>
            <Input id="journl_email" type="email" autoComplete="off" placeholder="you@company.com" autoFocus aria-invalid={!!errors.journl_email} {...register("journl_email")} />
          </FormField>
          <FormField id="journl_password" label="JournL password" error={errors.journl_password?.message}>
            <Input id="journl_password" type="password" autoComplete="off" aria-invalid={!!errors.journl_password} {...register("journl_password")} />
          </FormField>
        </div>

        {companies && (
          <FormField id="company_id" label="JournL company" hint="Your JournL account has several companies. Choose the one for this business." error={errors.company_id?.message}>
            <Controller
              control={control}
              name="company_id"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="company_id" className="w-full" aria-invalid={!!errors.company_id}>
                    <SelectValue placeholder="Choose a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} · {c.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        )}

        <div className="bg-muted/50 grid gap-3 rounded-lg p-4 text-sm">
          <p className="font-medium">Your Accountanz team will be able to</p>
          <ul className="grid gap-1.5">
            {CAN.map((t) => (
              <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />{t}</li>
            ))}
          </ul>
          <p className="font-medium">Accountanz will not</p>
          <ul className="grid gap-1.5">
            {CANNOT.map((t) => (
              <li key={t} className="text-muted-foreground flex gap-2"><X className="mt-0.5 size-4 shrink-0" aria-hidden />{t}</li>
            ))}
          </ul>
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-start gap-3">
            <Controller
              control={control}
              name="authorize"
              render={({ field }) => (
                <Checkbox
                  id="authorize"
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={!!errors.authorize}
                  aria-describedby={errors.authorize ? "authorize-error" : undefined}
                />
              )}
            />
            <label htmlFor="authorize" className="text-sm leading-snug">
              As the owner of <span className="font-medium">{companyName}</span>, I authorize Accountanz to access our JournL company on our behalf.
            </label>
          </div>
          {errors.authorize && <p id="authorize-error" role="alert" className="text-destructive text-xs">{errors.authorize.message}</p>}
        </div>
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="authorize-journl-form" pending={connect.isPending}>
          <ShieldCheck className="size-4" aria-hidden /> Sign in &amp; authorize
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

/** The owner connects JournL by signing in with JournL. Remounts per open so it starts clean. */
export function AuthorizeJournlDialog({ open, onOpenChange, companyName }: { open: boolean; onOpenChange: (open: boolean) => void; companyName: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && <AuthorizeForm companyName={companyName} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
