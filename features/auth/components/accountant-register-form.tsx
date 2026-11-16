"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { registerAccountantSchema, type RegisterAccountantValues } from "../schemas/auth.schema";
import { authService } from "../services/auth-service";

const ROLES = [
  { value: "bookkeeper", label: ROLE_LABELS.bookkeeper },
  { value: "finance_manager", label: ROLE_LABELS.finance_manager },
  { value: "cfo", label: ROLE_LABELS.cfo },
] as const;

export function AccountantRegisterForm() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterAccountantValues>({
    resolver: zodResolver(registerAccountantSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirmPassword: "", portal_role: "bookkeeper" },
  });

  const onSubmit = async (values: RegisterAccountantValues) => {
    try {
      const res = await authService.registerAccountant(values);
      setSubmitted(res.message);
    } catch (err) {
      applyApiError(err, setError, ["fullName", "email", "phone", "password", "portal_role"]);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center shadow-xs" role="status">
        <MailCheck className="text-primary size-8" aria-hidden />
        <p className="font-medium">Registration submitted</p>
        <p className="text-muted-foreground text-sm">{submitted}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
      <fieldset className="bg-card rounded-xl border p-5 shadow-xs sm:p-6">
        <legend className="sr-only">Accountant details</legend>
        <div className="mb-5">
          <p className="leading-7 font-semibold">Your details</p>
          <p className="text-muted-foreground text-sm">Submit your details for admin review. You can sign in after approval.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="fullName" label="Full name" error={errors.fullName?.message} className="sm:col-span-2">
            <Input id="fullName" autoComplete="name" autoFocus aria-invalid={!!errors.fullName} {...register("fullName")} />
          </FormField>
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register("email")} />
          </FormField>
          <FormField id="phone" label="Phone" hint="Optional" error={errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
          </FormField>
          <FormField id="portal_role" label="Role" error={errors.portal_role?.message} className="sm:col-span-2">
            <Controller
              control={control}
              name="portal_role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="portal_role" className="w-full" aria-invalid={!!errors.portal_role}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="password" label="Password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
            <PasswordInput id="password" invalid={!!errors.password} {...register("password")} />
          </FormField>
          <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
            <PasswordInput id="confirmPassword" invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
          </FormField>
        </div>
      </fieldset>
      <SubmitButton pending={isSubmitting} className="h-11 w-full text-base">
        Submit for approval
      </SubmitButton>
    </form>
  );
}
