"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/calls", label: "Calls", operatorOnly: false },
  { href: "/calls/new", label: "New call", operatorOnly: true },
  { href: "/digest", label: "Manager digest", operatorOnly: false },
  { href: "/engineering", label: "Engineering list", operatorOnly: false },
  { href: "/activity", label: "Activity sheet", operatorOnly: false },
];

export default function NavLinks({ isOperator }: { isOperator: boolean }) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => isOperator || !l.operatorOnly);

  // Longest matching prefix wins, so /calls/new doesn't also light up /calls.
  const active = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={
            "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors " +
            (l.href === active
              ? "bg-brand-50 font-medium text-brand"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-navy")
          }
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
