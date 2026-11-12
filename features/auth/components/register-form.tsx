"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { applyApiError } from "@/lib/form-errors";
import { useSignedIn } from "../hooks/use-session";
import { registerSchema, type RegisterValues } from "../schemas/auth.schema";
import { authService } from "../services/auth-service";

export function RegisterForm() {
  const signedIn = useSignedIn();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterValues) => {
    try {
      signedIn(await authService.register(values));
    } catch (err) {
      applyApiError(err, setError, ["fullName", "email", "password"]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="name" autoFocus aria-invalid={!!errors.fullName} {...register("fullName")} />
      </FormField>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register("email")} />
      </FormField>
      <FormField id="password" label="Password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
      </FormField>
      <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
      </FormField>
      <SubmitButton pending={isSubmitting} className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
