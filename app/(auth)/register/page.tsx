import Link from "next/link";
import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      title="Create your account"
      description="Register your business and get matched with a dedicated accountant."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthSplitLayout>
  );
}
