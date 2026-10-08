import Link from "next/link";
import { buildEngineeringList } from "@/lib/engineering";
import { SCORING_FORMULA_LABEL } from "@/lib/scoring";

export const dynamic = "force-dynamic";


const SEVERITY_LABEL: Record<string, string> = { s1: "S1", s2: "S2", s3: "S3" };

export default async function EngineeringPage() {
  const groups = await buildEngineeringList();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Engineering issue list</h1>
        <div className="flex gap-3 whitespace-nowrap text-sm">
          <Link
            href="/api/engineering/export?format=markdown"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-medium hover:border-brand hover:text-brand"
          >
            Export markdown
          </Link>
          <Link
            href="/api/engineering/export?format=csv"
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-medium hover:border-brand hover:text-brand"
          >
            Export CSV
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-neutral-600">{SCORING_FORMULA_LABEL}</p>

      <div className="mt-6 space-y-3">
        {groups.map((g, i) => (
          <div key={g.key} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                {i + 1}. {g.type.replace(/_/g, " ")} — {g.productArea.replace(/_/g, " ")}
              </div>
              <div className="flex flex-wrap items-center gap-2 whitespace-nowrap text-xs">
                <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium">
                  {SEVERITY_LABEL[g.severity]}
                </span>
                <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium">
                  {g.distinctUsers} {g.distinctUsers === 1 ? "user" : "users"}
                </span>
                {g.hasActivatedOrActiveUser && (
                  <span className="rounded bg-brand-50 px-2 py-0.5 font-medium text-brand">
                    hits active users
                  </span>
                )}
                <span className="rounded bg-navy px-2 py-0.5 font-medium text-white">
                  score {g.score.toFixed(1)}
                </span>
              </div>
            </div>
            <ul className="mt-2 space-y-1">
              {g.quotes.slice(0, 3).map((q, qi) => (
                <li key={qi} className="border-l-2 border-brand pl-3 text-sm italic text-neutral-700">
                  “{q}”
                </li>
              ))}
            </ul>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-neutral-600">
            No approved issues yet — publish a reviewed call to populate this list.
          </p>
        )}
      </div>
    </div>
  );
}
