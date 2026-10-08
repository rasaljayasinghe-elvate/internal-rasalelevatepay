import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getSessionUser, signOut } from "@/auth";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-navy">
        {user && (
          <nav className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
              <Link href="/" className="flex shrink-0 items-center gap-3">
                <Logo />
                <span className="hidden border-l border-neutral-200 pl-3 text-sm text-neutral-500 sm:inline">
                  Call Insights
                </span>
              </Link>
              <NavLinks isOperator={user.role === "operator"} />
              <form
                className="ml-auto flex shrink-0 items-center gap-3"
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/sign-in" });
                }}
              >
                <span className="hidden text-right text-xs leading-tight text-neutral-500 md:block">
                  {user.email}
                  <span className="block font-medium capitalize text-navy">{user.role}</span>
                </span>
                <button type="submit" className="text-sm text-neutral-600 hover:text-navy">
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        )}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
