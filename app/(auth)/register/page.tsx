import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Register your business with Accountanz"
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
    </AuthCard>
  );
}
