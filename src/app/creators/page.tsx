import Link from "next/link";
import { DataError } from "@/components/DataError";
import { Badge } from "@/components/fields";
import { databaseErrorMessage, db } from "@/lib/db";
import {
  DECISION_LABEL,
  DECISION_ORDER,
  DECISION_STYLE,
  FIT_LABEL,
  FIT_STYLE,
  PLATFORM_LABEL,
  formatLkr,
} from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ decision?: string }>;
}) {
  const { decision } = await searchParams;
  const filter = decision && DECISION_ORDER.includes(decision) ? decision : null;

  let creators: Awaited<ReturnType<typeof loadCreators>> = [];
  let loadError: string | null = null;
  try {
    creators = await loadCreators();
  } catch (err) {
    loadError = databaseErrorMessage(err);
  }

  const counts = Object.fromEntries(
    DECISION_ORDER.map((d) => [d, creators.filter((c) => c.decision === d).length]),
  );
  const shown = creators
    .filter((c) => !filter || c.decision === filter)
    .sort(
      (a, b) =>
        DECISION_ORDER.indexOf(a.decision) - DECISION_ORDER.indexOf(b.decision) ||
        a.name.localeCompare(b.name),
    );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Creators</h1>
        <Link
          href="/creators/new"
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          New creator
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <FilterLink href="/creators" active={!filter}>
          All ({creators.length})
        </FilterLink>
        {DECISION_ORDER.map((d) => (
          <FilterLink key={d} href={`/creators?decision=${d}`} active={filter === d}>
            {DECISION_LABEL[d]} ({counts[d]})
          </FilterLink>
        ))}
      </div>

      {loadError && (
        <div className="mt-6">
          <DataError message={loadError} />
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="p-3 font-medium">Creator</th>
              <th className="p-3 font-medium">Call</th>
              <th className="p-3 font-medium">Platforms</th>
              <th className="p-3 text-right font-medium">Quoted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {shown.length === 0 && !loadError && (
              <tr>
                <td colSpan={4} className="p-4 text-neutral-600">
                  No creators yet.
                </td>
              </tr>
            )}
            {shown.map((c) => (
              <tr key={c.id} className="hover:bg-brand-50/50">
                <td className="p-3">
                  <Link href={`/creators/${c.id}`} className="font-medium hover:text-brand">
                    {c.name}
                  </Link>
                  {c.notes && <div className="mt-0.5 line-clamp-1 text-neutral-600">{c.notes}</div>}
                </td>
                <td className="p-3">
                  <Badge className={DECISION_STYLE[c.decision]}>{DECISION_LABEL[c.decision]}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {c.platforms.map((p) => (
                      <span
                        key={p.id}
                        className={"rounded px-2 py-0.5 text-xs font-medium " + FIT_STYLE[p.fit]}
                        title={FIT_LABEL[p.fit]}
                      >
                        {PLATFORM_LABEL[p.platform]} · {FIT_LABEL[p.fit]}
                      </span>
                    ))}
                    {c.platforms.length === 0 && <span className="text-neutral-400">–</span>}
                  </div>
                </td>
                <td className="whitespace-nowrap p-3 text-right">{quotedRange(c.rates)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function loadCreators() {
  return db.query.creators.findMany({ with: { platforms: true, rates: true } });
}

function quotedRange(rates: { amountLkr: string | null }[]): string {
  const amounts = rates.map((r) => Number(r.amountLkr)).filter((n) => Number.isFinite(n) && n > 0);
  if (amounts.length === 0) return "–";
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return min === max ? formatLkr(min) : `${formatLkr(min)} – ${Math.round(max).toLocaleString("en-US")}`;
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-md px-3 py-1 transition-colors " +
        (active
          ? "bg-brand-50 font-medium text-brand"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-navy")
      }
    >
      {children}
    </Link>
  );
}
