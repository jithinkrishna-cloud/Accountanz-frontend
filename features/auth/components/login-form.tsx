"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { ApiError } from "@/lib/api-client";
import { useSignedIn } from "../hooks/use-session";
import { loginSchema, type LoginValues } from "../schemas/auth.schema";
import { authService } from "../services/auth-service";

export function LoginForm() {
  const next = useSearchParams().get("next");
  const signedIn = useSignedIn();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      signedIn(await authService.login(values), next);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" autoFocus aria-invalid={!!errors.email} {...register("email")} />
      </FormField>
      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
        aside={
          <Link href="/forgot-password" className="text-primary text-xs font-medium hover:underline">
            Forgot password?
          </Link>
        }
      >
        <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={!!errors.password} {...register("password")} />
      </FormField>
      <SubmitButton pending={isSubmitting} className="w-full">
        Log in
      </SubmitButton>
    </form>
  );
}
