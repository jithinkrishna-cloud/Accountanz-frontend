"use client";

import { Expand } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ItemDetailView } from "./item-detail";
import { useSpaceCtx } from "./space-layout";

/** Work item side sheet, opened from Board / Backlog / List via `?item=KEY-n`. */
export function ItemSheet({ number, onClose }: { number: number | null; onClose: () => void }) {
  const { space } = useSpaceCtx();
  return (
    <Sheet open={number != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-3xl xl:max-w-5xl">
        <SheetTitle className="sr-only">Work item {space.space_key}-{number}</SheetTitle>
        <SheetDescription className="sr-only">Details, comments and history of the work item.</SheetDescription>
        {number != null && (
          <div className="p-5 pt-12 sm:p-6 sm:pt-12">
            <Button variant="ghost" size="sm" asChild className="absolute top-3 left-4">
              <Link href={`/projects/${space.space_key}/items/${number}`}><Expand className="size-4" /> Open full page</Link>
            </Button>
            <ItemDetailView number={number} onDeleted={onClose} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
