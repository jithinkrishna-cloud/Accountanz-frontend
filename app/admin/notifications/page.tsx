import { redirect } from "next/navigation";

/** Notifications moved into Settings; keeps old links and bookmarks working. */
export default function NotificationsPage() {
  redirect("/admin/settings?tab=notifications");
}
