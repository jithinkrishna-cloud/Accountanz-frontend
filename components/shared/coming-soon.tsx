import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";

/** Placeholder for admin areas scheduled in a later module, so navigation stays complete. */
export function ComingSoon({ title, description, module }: { title: string; description: string; module: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="bg-card flex flex-col items-center gap-2 rounded-xl border px-6 py-16 text-center">
        <Construction className="text-muted-foreground size-8" aria-hidden />
        <p className="font-medium">Not built yet</p>
        <p className="text-muted-foreground max-w-md text-sm">This page is part of the {module} module in the implementation plan.</p>
      </div>
    </>
  );
}
