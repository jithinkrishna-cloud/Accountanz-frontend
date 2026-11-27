import { redirect } from "next/navigation";

/** Client Progress moved to /admin/firm-progress; keeps old links and bookmarks working. */
export default function AdminWorkspacePage() {
  redirect("/admin/firm-progress");
}
