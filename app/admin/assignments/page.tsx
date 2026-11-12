import { AssignmentList } from "@/features/assignments/components/assignment-list";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ clientId?: string | string[] }> }) {
  const { clientId } = await searchParams;
  const id = Number(Array.isArray(clientId) ? clientId[0] : clientId);
  const valid = Number.isInteger(id) && id > 0;
  // key: switching between client filters remounts the list with fresh filter state.
  return <AssignmentList key={valid ? id : "all"} clientId={valid ? id : undefined} />;
}
