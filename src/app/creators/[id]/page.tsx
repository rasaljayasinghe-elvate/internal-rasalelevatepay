import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import ActionForm from "@/components/ActionForm";
import { DataError } from "@/components/DataError";
import { Badge, ExternalLink } from "@/components/fields";
import {
  addPlatform,
  addRate,
  deleteCreator,
  deletePlatform,
  deleteRate,
  updateCreator,
  updatePlatform,
  updateRate,
} from "@/lib/campaign-actions";
import {
  BOOKING_STATUS_LABEL,
  CAMPAIGN_STATUS_LABEL,
  DECISION_LABEL,
  DECISION_STYLE,
  FIT_LABEL,
  FIT_STYLE,
  PLATFORM_LABEL,
  bookingMetrics,
  formatCount,
  formatLkr,
  formatPct,
  formatUsd,
} from "@/lib/campaigns";
import { databaseErrorMessage, db, schema } from "@/lib/db";
import { CreatorFields, PlatformFields, RateFields } from "../CreatorFields";

export const dynamic = "force-dynamic";

function loadCreator(id: string) {
  return db.query.creators.findFirst({
    where: eq(schema.creators.id, id),
    with: {
      platforms: true,
      rates: true,
      bookings: { with: { campaign: true, deliverables: true } },
    },
  });
}

export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let creator: Awaited<ReturnType<typeof loadCreator>>;
  try {
    creator = await loadCreator(id);
  } catch (err) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Creator</h1>
        <div className="mt-4">
          <DataError message={databaseErrorMessage(err)} />
        </div>
      </div>
    );
  }
  if (!creator) notFound();

  return (
    <div>
      <Link href="/creators" className="text-sm text-neutral-500 hover:text-brand">
        ← Creators
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{creator.name}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Audience in Sri Lanka: <span className="font-medium">{formatPct(creator.slAudiencePct)}</span>
          </p>
        </div>
        <Badge className={DECISION_STYLE[creator.decision]}>{DECISION_LABEL[creator.decision]}</Badge>
      </div>
      {creator.notes && (
        <p className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
          {creator.notes}
        </p>
      )}

      <details className="mt-3 rounded-xl border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-brand">Edit profile</summary>
        <ActionForm action={updateCreator} submitLabel="Save profile" className="mt-4">
          <input type="hidden" name="id" value={creator.id} />
          <CreatorFields creator={creator} />
        </ActionForm>
      </details>

      <section className="mt-8">
        <h2 className="font-medium">Platforms</h2>
        <p className="text-sm text-neutral-500">Shortlist analytics, not campaign results.</p>
        <div className="mt-3 space-y-3">
          {creator.platforms.map((p) => (
            <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">
                    {PLATFORM_LABEL[p.platform]}
                    {p.handle && <span className="ml-2 text-neutral-500">{p.handle}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
                    <ExternalLink href={p.profileUrl}>Profile</ExternalLink>
                    <ExternalLink href={p.insightsUrl}>Insights screenshots</ExternalLink>
                  </div>
                </div>
                <Badge className={FIT_STYLE[p.fit]}>{FIT_LABEL[p.fit]}</Badge>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <Stat label="Followers" value={formatCount(p.followers)} />
                <Stat label="Avg views" value={formatCount(p.avgViews)} />
                <Stat label="Engagement" value={formatPct(p.engagementPct)} />
              </dl>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-brand">Edit</summary>
                <ActionForm action={updatePlatform} submitLabel="Save platform" className="mt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <PlatformFields platform={p} />
                </ActionForm>
                <ActionForm
                  action={deletePlatform}
                  submitLabel="Remove platform"
                  pendingLabel="Removing…"
                  variant="danger"
                  compact
                  confirm={`Remove ${PLATFORM_LABEL[p.platform]} from ${creator.name}?`}
                  className="mt-2"
                >
                  <input type="hidden" name="id" value={p.id} />
                </ActionForm>
              </details>
            </div>
          ))}
          {creator.platforms.length === 0 && (
            <p className="text-sm text-neutral-600">No platforms yet.</p>
          )}
          <details className="rounded-xl border border-dashed border-neutral-300 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-brand">Add platform</summary>
            <ActionForm action={addPlatform} submitLabel="Add platform" className="mt-3">
              <input type="hidden" name="creatorId" value={creator.id} />
              <PlatformFields />
            </ActionForm>
          </details>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-medium">Quoted packages</h2>
        <div className="mt-3 space-y-3">
          {creator.rates.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{r.label}</div>
                  {r.includes && <div className="mt-0.5 text-sm text-neutral-600">{r.includes}</div>}
                </div>
                <div className="whitespace-nowrap text-right text-sm">
                  <div className="font-medium">{formatLkr(r.amountLkr)}</div>
                  {r.amountUsd && <div className="text-neutral-500">{formatUsd(r.amountUsd)}</div>}
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-brand">Edit</summary>
                <ActionForm action={updateRate} submitLabel="Save package" className="mt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <RateFields rate={r} />
                </ActionForm>
                <ActionForm
                  action={deleteRate}
                  submitLabel="Remove package"
                  pendingLabel="Removing…"
                  variant="danger"
                  compact
                  confirm={`Remove the "${r.label}" package?`}
                  className="mt-2"
                >
                  <input type="hidden" name="id" value={r.id} />
                </ActionForm>
              </details>
            </div>
          ))}
          {creator.rates.length === 0 && <p className="text-sm text-neutral-600">No packages yet.</p>}
          <details className="rounded-xl border border-dashed border-neutral-300 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-brand">Add package</summary>
            <ActionForm action={addRate} submitLabel="Add package" className="mt-3">
              <input type="hidden" name="creatorId" value={creator.id} />
              <RateFields />
            </ActionForm>
          </details>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-medium">Campaigns</h2>
        <div className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {creator.bookings.map((b) => {
            const m = bookingMetrics(b);
            return (
              <Link
                key={b.id}
                href={`/campaigns/${b.campaignId}`}
                className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-brand-50/50"
              >
                <div>
                  <div className="font-medium">{b.campaign.name}</div>
                  <div className="mt-0.5 text-neutral-600">
                    {CAMPAIGN_STATUS_LABEL[b.campaign.status]} · {BOOKING_STATUS_LABEL[b.status]} ·{" "}
                    {m.live}/{m.promised} posts live
                  </div>
                </div>
                <div className="whitespace-nowrap text-right">
                  <div className="font-medium">{formatLkr(b.agreedLkr)}</div>
                  <div className="text-neutral-500">{formatCount(b.signups)} signups</div>
                </div>
              </Link>
            );
          })}
          {creator.bookings.length === 0 && (
            <p className="p-4 text-sm text-neutral-600">Not on any campaign yet.</p>
          )}
        </div>
      </section>

      <ActionForm
        action={deleteCreator}
        submitLabel="Delete creator"
        pendingLabel="Deleting…"
        variant="danger"
        compact
        confirm={`Delete ${creator.name}? This also removes them from every campaign.`}
        className="mt-10"
      >
        <input type="hidden" name="id" value={creator.id} />
      </ActionForm>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
