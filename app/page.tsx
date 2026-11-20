import { displayFont } from "@/features/landing/display-font";
import { LandingPage } from "@/features/landing/landing-page";

/** Public home page. Signed-in visitors see "Open your portal" instead of sign-in links. */
export default function Home() {
  return <LandingPage fontClass={displayFont.variable} />;
}
