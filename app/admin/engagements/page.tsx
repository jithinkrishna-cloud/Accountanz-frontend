import { redirect } from "next/navigation";

/** Engagements now live under Clients. Kept so old links (including ?open=ID) keep working. */
export default async function EngagementsPage({ searchParams }: { searchParams: Promise<{ open?: string | string[] }> }) {
  const { open } = await searchParams;
  const id = Number(Array.isArray(open) ? open[0] : open);
  redirect(Number.isInteger(id) && id > 0 ? `/admin/clients?tab=engagements&open=${id}` : "/admin/clients?tab=engagements");
}
