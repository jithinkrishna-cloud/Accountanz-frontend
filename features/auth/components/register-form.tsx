"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { ACCOUNTING_SOFTWARE_LABELS, INDIAN_STATES } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { useSignedIn } from "../hooks/use-session";
import { registerSchema, type RegisterValues } from "../schemas/auth.schema";
import { authService } from "../services/auth-service";

function Section({ step, title, description, children }: { step: number; title: string; description: string; children: React.ReactNode }) {
  return (
    <fieldset className="bg-card rounded-xl border p-5 shadow-xs sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-start gap-3">
        <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">{step}</span>
        <div>
          <p className="leading-7 font-semibold">{title}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}


/** A company joins the platform: its owner's login plus the company, which Accountanz then assesses. */
export function RegisterForm() {
  const signedIn = useSignedIn();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      legal_name: "",
      trade_name: "",
      business_type: "",
      date_of_establishment: "",
      gstin: "",
      pan: "",
      state: "",
      address: "",
      primary_contact_name: "",
      primary_contact_email: "",
      primary_contact_phone: "",
      accounting_software: "none",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    try {
      signedIn(await authService.register(values));
    } catch (err) {
      applyApiError(err, setError, ["fullName", "email", "password", "gstin"]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
      <Section step={1} title="Your company" description="The business you want us to manage accounts for. Basics now, details during onboarding.">
        <FormField id="legal_name" label="Legal name" error={errors.legal_name?.message} className="sm:col-span-2">
          <Input id="legal_name" autoComplete="organization" autoFocus placeholder="Acme Traders Private Limited" aria-invalid={!!errors.legal_name} {...register("legal_name")} />
        </FormField>
        <FormField id="trade_name" label="Trade name" hint="Optional" error={errors.trade_name?.message}>
          <Input id="trade_name" placeholder="Acme" {...register("trade_name")} />
        </FormField>
        <FormField id="business_type" label="Business type" hint="Optional" error={errors.business_type?.message}>
          <Controller control={control} name="business_type" render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="business_type" className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{(["private_limited","public_limited","llp","partnership","proprietorship","opc"] as const).map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField id="state" label="State" error={errors.state?.message}>
          <Controller control={control} name="state" render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="state" className="w-full" aria-invalid={!!errors.state}><SelectValue placeholder="Select a state" /></SelectTrigger>
              <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField id="date_of_establishment" label="Established on" hint="Optional" error={errors.date_of_establishment?.message}>
          <Input id="date_of_establishment" type="date" {...register("date_of_establishment")} />
        </FormField>
        <FormField id="gstin" label="GSTIN" hint="Optional" error={errors.gstin?.message}>
          <Input id="gstin" className="font-mono uppercase" maxLength={15} placeholder="22AAAAA0000A1Z5" aria-invalid={!!errors.gstin} {...register("gstin")} />
        </FormField>
        <FormField id="pan" label="PAN" hint="Optional" error={errors.pan?.message}>
          <Input id="pan" className="font-mono uppercase" maxLength={10} placeholder="AAAAA0000A" aria-invalid={!!errors.pan} {...register("pan")} />
        </FormField>
        <FormField id="accounting_software" label="Accounting software" error={errors.accounting_software?.message}>
          <Controller control={control} name="accounting_software" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="accounting_software" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(["journl","none"] as const).map((s) => <SelectItem key={s} value={s}>{ACCOUNTING_SOFTWARE_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField id="primary_contact_name" label="Primary contact name" hint="Optional" error={errors.primary_contact_name?.message}>
          <Input id="primary_contact_name" {...register("primary_contact_name")} />
        </FormField>
        <FormField id="primary_contact_phone" label="Primary contact phone" hint="Optional" error={errors.primary_contact_phone?.message}>
          <Input id="primary_contact_phone" {...register("primary_contact_phone")} />
        </FormField>
        <FormField id="primary_contact_email" label="Primary contact email" hint="Optional" error={errors.primary_contact_email?.message} className="sm:col-span-2">
          <Input id="primary_contact_email" type="email" {...register("primary_contact_email")} />
        </FormField>
        <FormField id="address" label="Address" hint="Optional" error={errors.address?.message} className="sm:col-span-2">
          <Textarea id="address" rows={2} {...register("address")} />
        </FormField>
      </Section>

      <Section step={2} title="Your login" description="You'll use these details to sign in as the company owner.">
        <FormField id="fullName" label="Your full name" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
        </FormField>
        <FormField id="email" label="Work email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!errors.email} {...register("email")} />
        </FormField>
        <FormField id="password" label="Password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
          <PasswordInput id="password" invalid={!!errors.password} {...register("password")} />
        </FormField>
        <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
          <PasswordInput id="confirmPassword" invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
        </FormField>
      </Section>

      <SubmitButton pending={isSubmitting} className="h-11 w-full text-base">
          Register company
        </SubmitButton>
    </form>
  );
}
