import { Bot, Eye, GraduationCap, IndianRupee, Maximize2, UserX, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/layouts/logo";
import { cn } from "@/lib/utils";

const BENEFITS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: GraduationCap, title: "Professionally qualified", text: "Accountants, finance managers and virtual CFOs" },
  { icon: Bot, title: "AI-enabled", text: "Works on JournL AI, delivers more in less time" },
  { icon: IndianRupee, title: "Minimal cost", text: "A fraction of in-house salary and overheads" },
  { icon: UserX, title: "No hiring hassle", text: "No recruitment, training, attrition or leave gaps" },
  { icon: Maximize2, title: "Scales with you", text: "Accountant first, then finance manager or CFO" },
  { icon: Eye, title: "Full visibility", text: "Books stay on your JournL account" },
];

/** Two-pane auth screen: brand story on the left (large screens), the form on the right. */
export function AuthSplitLayout({
  title,
  description,
  children,
  footer,
  narrow = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Narrower form column for short forms such as login. */
  narrow?: boolean;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.3_0.06_180)] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:self-start">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-[oklch(0.6_0.12_175)] opacity-25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-112 rounded-full bg-[oklch(0.7_0.14_160)] opacity-15 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-10 py-10 [scrollbar-width:none] xl:px-14">
          <Logo inverted />

          <div className="my-auto max-w-xl py-12">
            <p className="text-xs font-semibold tracking-[0.18em] text-[oklch(0.82_0.1_170)] uppercase">Why Accountanz</p>
            <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
              A dedicated finance team, without the full-time payroll.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/70">
              Qualified remote accountants, finance managers and virtual CFOs working on JournL AI, backed by technology and quality oversight.
            </p>

            <ul className="mt-10 grid gap-x-6 gap-y-6 sm:grid-cols-2">
              {BENEFITS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <Icon className="size-5 text-[oklch(0.85_0.12_165)]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-white/65">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/45">© {new Date().getFullYear()} Accountanz · Managed accounting</p>
        </div>
      </aside>

      <section className="flex flex-col px-4 py-8 sm:px-8 lg:px-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className={cn("mx-auto flex w-full flex-1 flex-col justify-center py-10", narrow ? "max-w-md" : "max-w-xl")}>
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground mt-2 text-base">{description}</p>}
          </div>
          {children}
          {footer && <div className="text-muted-foreground mt-8 text-center text-sm">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
