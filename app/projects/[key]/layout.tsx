"use client";

import { useParams } from "next/navigation";
import { SpaceLayout } from "@/features/projects/components/space-layout";

export default function SpaceRouteLayout({ children }: { children: React.ReactNode }) {
  const { key } = useParams<{ key: string }>();
  return <SpaceLayout spaceKey={key}>{children}</SpaceLayout>;
}
