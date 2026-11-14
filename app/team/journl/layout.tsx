import { JournlSubnav } from "@/features/journl-workspace/components/journl-subnav";

/** JournL area: a module sub-sidebar beside the module page. */
export default function JournlLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
      <aside className="min-w-0">
        <JournlSubnav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
