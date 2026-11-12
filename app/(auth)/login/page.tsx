import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
