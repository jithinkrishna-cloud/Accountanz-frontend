import { AccountantProfile } from "@/features/landing/accountant-profile";
import { displayFont } from "@/features/landing/display-font";

/** Public profile of one verified accountant. */
export default async function AccountantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AccountantProfile slug={slug} fontClass={displayFont.variable} />;
}
