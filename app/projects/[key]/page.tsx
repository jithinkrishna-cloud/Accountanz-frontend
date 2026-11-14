import { redirect } from "next/navigation";

export default async function SpaceIndex({ params }: { params: Promise<{ key: string }> }) {
  redirect(`/projects/${(await params).key}/board`);
}
