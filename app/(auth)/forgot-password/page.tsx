import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to reset it."
      footer={
        <Link href="/login" className="text-primary font-medium hover:underline">
          Back to login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
