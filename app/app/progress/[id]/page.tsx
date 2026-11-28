import { notFound } from "next/navigation";
import { ClientTaskPage } from "@/features/client-portal/components/task-page";

export default async function ClientTaskRoute({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <ClientTaskPage id={id} />;
}
