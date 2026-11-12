import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SetPasswordForm } from "@/features/auth/components/set-password-form";

export default function AcceptInvitePage() {
  return (
    <AuthCard title="Welcome to Accountanz" description="Set a password to activate your account.">
      <Suspense>
        <SetPasswordForm mode="invite" />
      </Suspense>
    </AuthCard>
  );
}
