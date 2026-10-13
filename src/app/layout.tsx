import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Call Insights — Elevate Pay",
  description:
    "Turn call transcripts into structured issues, a manager digest, and an engineering backlog.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-navy">
        <nav className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex shrink-0 items-center gap-3">
              <Logo />
              <span className="hidden border-l border-neutral-200 pl-3 text-sm text-neutral-500 sm:inline">
                Call Insights
              </span>
            </Link>
            <NavLinks isOperator />
          </div>
        </nav>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
