import Link from "next/link";
import { Suspense } from "react";
import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthSplitLayout
      narrow
      title="Welcome back"
      description="Log in to your Accountanz account."
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
    </AuthSplitLayout>
  );
}
