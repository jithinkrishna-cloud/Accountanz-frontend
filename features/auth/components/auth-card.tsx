import { Logo } from "@/components/layouts/logo";

export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="bg-card rounded-xl border p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="text-muted-foreground mt-6 text-center text-sm">{footer}</div>}
      </div>
    </main>
  );
}
