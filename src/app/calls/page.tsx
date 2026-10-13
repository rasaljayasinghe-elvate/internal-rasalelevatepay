import Link from "next/link";
import { getSessionUser } from "@/auth";
import { DataError } from "@/components/DataError";
import { Badge } from "@/components/fields";
import { loadIssueCounts, reviewQueue, type ReviewQueue } from "@/lib/dashboard";
import { databaseErrorMessage, db } from "@/lib/db";

export const dynamic = "force-dynamic";

const QUEUE_LABEL: Record<ReviewQueue, string> = {
  review: "Needs review",
  publish: "Ready to publish",
  published: "Published",
};

const QUEUE_STYLE: Record<ReviewQueue, string> = {
  review: "bg-neutral-100 text-neutral-700",
  publish: "bg-brand-50 text-brand",
  published: "bg-green-100 text-green-800",
};

const FILTERS: { queue: ReviewQueue | null; label: string }[] = [
  { queue: null, label: "All" },
  { queue: "review", label: "Needs review" },
  { queue: "publish", label: "Ready to publish" },
  { queue: "published", label: "Published" },
];

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ queue?: string }>;
}) {
  const { queue } = await searchParams;
  const filter = queue === "review" || queue === "publish" || queue === "published" ? queue : null;
  const user = await getSessionUser();
  let calls: Awaited<ReturnType<typeof db.query.calls.findMany>> = [];
  let issueCounts = new Map<string, { pending: number; total: number }>();
  let loadError: string | null = null;
  try {
    [calls, issueCounts] = await Promise.all([
      db.query.calls.findMany({ orderBy: (c, { desc }) => desc(c.callDate) }),
      loadIssueCounts(),
    ]);
  } catch (err) {
    loadError = databaseErrorMessage(err);
  }
  const isOperator = user?.role === "operator";
  const rows = calls.map((call) => {
    const issues = issueCounts.get(call.id) ?? { pending: 0, total: 0 };
    return { call, queue: reviewQueue(call.status, issues.pending, issues.total) };
  });
  const counts: Record<ReviewQueue, number> = { review: 0, publish: 0, published: 0 };
  for (const row of rows) counts[row.queue] += 1;
  const shown = filter ? rows.filter((row) => row.queue === filter) : rows;

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

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((item) => (
          <Link
            key={item.label}
            href={item.queue ? `/calls?queue=${item.queue}` : "/calls"}
            className={
              "rounded-md px-3 py-1 transition-colors " +
              (filter === item.queue
                ? "bg-brand-50 font-medium text-brand"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-navy")
            }
          >
            {item.label} ({item.queue ? counts[item.queue] : rows.length})
          </Link>
        ))}
      </div>

      {loadError && (
        <div className="mt-6">
          <DataError message={loadError} />
        </div>
      )}

      <div className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {shown.length === 0 && !loadError && (
          <p className="p-4 text-sm text-neutral-600">
            {rows.length === 0 ? "No calls yet." : "Nothing in this queue."}
          </p>
        )}
        {shown.map(({ call, queue: callQueue }) => (
          <Link
            key={call.id}
            href={`/calls/${call.id}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-brand-50/50"
          >
            <div className="min-w-0">
              <div className="font-medium">
                {call.userId} — {call.callDate}
              </div>
              <div className="mt-0.5 line-clamp-1 text-sm text-neutral-600">
                {call.summary ?? "No summary"}
              </div>
            </div>
            <Badge className={QUEUE_STYLE[callQueue]}>{QUEUE_LABEL[callQueue]}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
