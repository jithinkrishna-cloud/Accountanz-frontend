import { notFound } from "next/navigation";
import { JOURNL_INTEGRATION } from "@/lib/features";
import { JournlAccessTasks } from "@/features/journl-access-tasks/journl-access-tasks";
import { JournlAccessOverviewView } from "@/features/journl-permissions/components/journl-access-overview";

export default function AdminJournlAccessPage() {
  if (!JOURNL_INTEGRATION) notFound();
  return (
    <JournlAccessOverviewView>
      <JournlAccessTasks />
    </JournlAccessOverviewView>
  );
}
