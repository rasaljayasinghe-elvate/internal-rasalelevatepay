import Link from "next/link";
import { getSessionUser } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";


const STATUS_LABEL: Record<string, string> = {
  draft: "Needs review",
  reviewed: "Reviewed",
  published: "Published",
};

export default async function CallsPage() {
  const [calls, user] = await Promise.all([
    db.query.calls.findMany({ orderBy: (c, { desc }) => desc(c.callDate) }),
    getSessionUser(),
  ]);
  const isOperator = user?.role === "operator";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calls</h1>
        {isOperator && (
          <Link
            href="/calls/new"
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            New call
          </Link>
        )}
      </div>

      <div className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {calls.length === 0 && (
          <p className="p-4 text-sm text-neutral-600">No calls yet.</p>
        )}
        {calls.map((call) => (
          <Link
            key={call.id}
            href={`/calls/${call.id}`}
            className="flex items-center justify-between p-4 hover:bg-brand-50/50"
          >
            <div>
              <div className="font-medium">
                {call.userId} — {call.callDate}
              </div>
              <div className="mt-0.5 text-sm text-neutral-600 line-clamp-1">
                {call.summary ?? "No summary"}
              </div>
            </div>
            <span
              className={
                "rounded-full px-2.5 py-1 text-xs font-medium " +
                (call.status === "published"
                  ? "bg-green-100 text-green-800"
                  : call.status === "reviewed"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-neutral-100 text-neutral-700")
              }
            >
              {STATUS_LABEL[call.status]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
