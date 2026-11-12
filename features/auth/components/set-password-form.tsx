"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { ApiError } from "@/lib/api-client";
import { setPasswordSchema, type SetPasswordValues } from "../schemas/auth.schema";
import { authService } from "../services/auth-service";

/** Shared by "reset password" and "accept invite": both consume a one-time token from the e-mailed link. */
export function SetPasswordForm({ mode }: { mode: "reset" | "invite" }) {
  const token = useSearchParams().get("token");
  const [done, setDone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({ resolver: zodResolver(setPasswordSchema) });

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>This link is missing its token. Open the link from your email again.</AlertDescription>
      </Alert>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <CheckCircle2 className="text-success size-8" aria-hidden />
        <p className="text-sm">{done}</p>
        <Button asChild className="w-full">
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (values: SetPasswordValues) => {
    setFormError(null);
    try {
      const fn = mode === "invite" ? authService.acceptInvite : authService.resetPassword;
      setDone((await fn(token, values)).message);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>
            {formError}{" "}
            {mode === "reset" && (
              <Link href="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}
      <FormField id="password" label="New password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
        <Input id="password" type="password" autoComplete="new-password" autoFocus aria-invalid={!!errors.password} {...register("password")} />
      </FormField>
      <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
      </FormField>
      <SubmitButton pending={isSubmitting} className="w-full">
        {mode === "invite" ? "Set password and activate" : "Update password"}
      </SubmitButton>
    </form>
  );
}
