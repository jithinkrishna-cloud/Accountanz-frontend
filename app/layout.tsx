import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/layouts/providers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Accountanz — Managed Accounting Operations",
  description: "Clients, accounting teams, tasks, documents, reviews and service billing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
