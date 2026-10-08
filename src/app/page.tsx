import Link from "next/link";

const cards = [
  {
    href: "/calls/new",
    title: "New call",
    body: "Paste a transcript, pick the user, and run extraction.",
  },
  {
    href: "/calls",
    title: "Calls",
    body: "Review drafts, approve or reject issues, then publish.",
  },
  {
    href: "/digest",
    title: "Manager digest",
    body: "Weekly themes, trends and recommended decisions.",
  },
  {
    href: "/engineering",
    title: "Engineering list",
    body: "Issues ranked by frequency, severity and user value.",
  },
  {
    href: "/activity",
    title: "Activity sheet",
    body: "Upload the weekly Google Sheet export (CSV).",
  },
];

export default function Home() {
  return (
    <div>
      <div className="rounded-2xl bg-navy px-8 py-10 text-white">
        <p className="text-sm font-medium text-brand-100">Elevate Pay · Internal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Call Insights</h1>
        <p className="mt-3 max-w-2xl text-neutral-300">
          Turns roughly 10 weekly user calls into structured summaries, a weekly
          manager digest, and a ranked issue list for engineering. Nothing
          reaches the manager or engineering until a call has been reviewed and
          published.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-brand hover:shadow-sm"
          >
            <div className="font-semibold group-hover:text-brand">{c.title} →</div>
            <div className="mt-1 text-sm text-neutral-600">{c.body}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
