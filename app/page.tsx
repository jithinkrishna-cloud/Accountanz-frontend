import { Bricolage_Grotesque } from "next/font/google";
import { LandingPage } from "@/features/landing/landing-page";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });

/** Public home page. Signed-in visitors see "Open your portal" instead of sign-in links. */
export default function Home() {
  return <LandingPage fontClass={display.variable} />;
}
