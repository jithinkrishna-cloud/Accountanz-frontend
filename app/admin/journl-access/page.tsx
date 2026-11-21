import { JournlAccessTasks } from "@/features/journl-access-tasks/journl-access-tasks";
import { JournlAccessOverviewView } from "@/features/journl-permissions/components/journl-access-overview";

export default function AdminJournlAccessPage() {
  return (
    <JournlAccessOverviewView>
      <JournlAccessTasks />
    </JournlAccessOverviewView>
  );
}
