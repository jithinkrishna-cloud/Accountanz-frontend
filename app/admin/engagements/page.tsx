import { EngagementList } from "@/features/engagements/components/engagement-list";

export default async function EngagementsPage({ searchParams }: { searchParams: Promise<{ open?: string | string[] }> }) {
  const { open } = await searchParams;
  const id = Number(Array.isArray(open) ? open[0] : open);
  return <EngagementList initialOpenId={Number.isInteger(id) && id > 0 ? id : undefined} />;
}
