import { Suspense } from "react";
import { AdminSettings } from "@/features/settings/components/admin-settings";

export default function SettingsPage() {
  // Suspense: the page reads ?tab= (General / Notifications).
  return (
    <Suspense>
      <AdminSettings />
    </Suspense>
  );
}
