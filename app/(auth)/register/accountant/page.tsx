import Link from "next/link";
import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout";
import { AccountantRegisterForm } from "@/features/auth/components/accountant-register-form";

export default function AccountantRegisterPage() {
  return (
    <AuthSplitLayout
      narrow
      title="Accountant registration"
      description="Create your accountant account and submit it for admin approval."
      footer={
        <>
          Want to register a company instead?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Company registration
          </Link>
          {" · "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <AccountantRegisterForm />
    </AuthSplitLayout>
  );
}