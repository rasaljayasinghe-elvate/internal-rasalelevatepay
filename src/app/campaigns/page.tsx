import Link from "next/link";
import { DataError } from "@/components/DataError";
import { Badge } from "@/components/fields";
import { databaseErrorMessage, db } from "@/lib/db";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_STYLE,
  campaignTotals,
  dateRange,
  formatCount,
  formatLkr,
} from "@/lib/campaigns";

export const dynamic = "force-dynamic";

function loadCampaigns() {
  return db.query.campaigns.findMany({
    orderBy: (c, { desc }) => desc(c.createdAt),
    with: { bookings: { with: { deliverables: true } } },
  });
}

export default async function CampaignsPage() {
  let campaigns: Awaited<ReturnType<typeof loadCampaigns>> = [];
  let loadError: string | null = null;
  try {
    campaigns = await loadCampaigns();
  } catch (err) {
    loadError = databaseErrorMessage(err);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
        <Link
          href="/campaigns/new"
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          New campaign
        </Link>
      </div>

      {loadError && (
        <div className="mt-6">
          <DataError message={loadError} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="p-3 font-medium">Campaign</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Creators</th>
              <th className="p-3 text-right font-medium">Agreed spend</th>
              <th className="p-3 text-right font-medium">Posts live</th>
              <th className="p-3 text-right font-medium">Signups</th>
              <th className="p-3 text-right font-medium">Per signup</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {campaigns.length === 0 && !loadError && (
              <tr>
                <td colSpan={7} className="p-4 text-neutral-600">
                  No campaigns yet.
                </td>
              </tr>
            )}
            {campaigns.map((c) => {
              const t = campaignTotals(c.bookings);
              return (
                <tr key={c.id} className="hover:bg-brand-50/50">
                  <td className="p-3">
                    <Link href={`/campaigns/${c.id}`} className="font-medium hover:text-brand">
                      {c.name}
                    </Link>
                    <div className="mt-0.5 text-neutral-600">{dateRange(c.startDate, c.endDate)}</div>
                  </td>
                  <td className="p-3">
                    <Badge className={CAMPAIGN_STATUS_STYLE[c.status]}>{CAMPAIGN_STATUS_LABEL[c.status]}</Badge>
                  </td>
                  <td className="p-3 text-right">{t.creators}</td>
                  <td className="whitespace-nowrap p-3 text-right">{formatLkr(t.spendLkr)}</td>
                  <td className="p-3 text-right">
                    {t.live}/{t.promised}
                    {t.missed > 0 && <span className="ml-1 text-red-700">({t.missed} missed)</span>}
                  </td>
                  <td className="p-3 text-right">{formatCount(t.signups)}</td>
                  <td className="whitespace-nowrap p-3 text-right">{formatLkr(t.costPerSignup)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}