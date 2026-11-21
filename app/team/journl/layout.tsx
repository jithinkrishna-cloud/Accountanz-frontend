import { notFound } from "next/navigation";
import { JournlSubnav } from "@/features/journl-workspace/components/journl-subnav";
import { JOURNL_INTEGRATION } from "@/lib/features";

/** JournL area: a module sub-sidebar beside the module page. */
export default function JournlLayout({ children }: { children: React.ReactNode }) {
  // JournL integration off: accountants open JournL directly, so this area doesn't exist.
  if (!JOURNL_INTEGRATION) notFound();
  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
      <aside className="min-w-0">
        <JournlSubnav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
