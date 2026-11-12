"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { INDIAN_STATES } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
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
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", legal_name: "", trade_name: "", gstin: "", pan: "", state: "" },
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
      <Section step={1} title="Your company" description="The business you want us to manage accounts for.">
        <FormField id="legal_name" label="Legal name" error={errors.legal_name?.message} className="sm:col-span-2">
          <Input id="legal_name" autoComplete="organization" autoFocus placeholder="Acme Traders Private Limited" aria-invalid={!!errors.legal_name} {...register("legal_name")} />
        </FormField>
        <FormField id="trade_name" label="Trade name" hint="Optional, if different from the legal name." error={errors.trade_name?.message}>
          <Input id="trade_name" placeholder="Acme" {...register("trade_name")} />
        </FormField>
        <FormField id="state" label="State" error={errors.state?.message}>
          <Controller
            control={control}
            name="state"
            render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="state" className="w-full" aria-invalid={!!errors.state}>
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField id="gstin" label="GSTIN" hint="Optional · 15 characters" error={errors.gstin?.message}>
          <Input id="gstin" className="font-mono uppercase" maxLength={15} placeholder="22AAAAA0000A1Z5" aria-invalid={!!errors.gstin} {...register("gstin")} />
        </FormField>
        <FormField id="pan" label="PAN" hint="Optional · 10 characters" error={errors.pan?.message}>
          <Input id="pan" className="font-mono uppercase" maxLength={10} placeholder="AAAAA0000A" aria-invalid={!!errors.pan} {...register("pan")} />
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
