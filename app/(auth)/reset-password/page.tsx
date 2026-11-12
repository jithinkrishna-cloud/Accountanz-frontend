import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password">
      <Suspense>
        <SetPasswordForm mode="reset" />
      </Suspense>
    </AuthCard>
  );
}
