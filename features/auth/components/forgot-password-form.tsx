"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { applyApiError } from "@/lib/form-errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas/auth.schema";
import { authService } from "../services/auth-service";

export function ForgotPasswordForm() {
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      setSentMessage((await authService.forgotPassword(values)).message);
    } catch (err) {
      applyApiError(err, setError, ["email"]);
    }
  };

  if (sentMessage) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <MailCheck className="text-primary size-8" aria-hidden />
        <p className="text-sm">{sentMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" autoFocus aria-invalid={!!errors.email} {...register("email")} />
      </FormField>
      <SubmitButton pending={isSubmitting} className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}
