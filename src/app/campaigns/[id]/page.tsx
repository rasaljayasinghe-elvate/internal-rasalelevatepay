import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import ActionForm from "@/components/ActionForm";
import { DataError } from "@/components/DataError";
import { Badge, ExternalLink } from "@/components/fields";
import {
  addDeliverable,
  deleteCampaign,
  deleteDeliverable,
  refreshMetricool,
  removeBooking,
  saveLodge,
  setDeliverableStatus,
  unlodgeBooking,
  updateBooking,
  updateCampaign,
  updateDeliverable,
} from "@/lib/campaign-actions";
import {
  BOOKING_STATUS_LABEL,
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_STYLE,
  DECISION_LABEL,
  DECISION_ORDER,
  DECISION_STYLE,
  DELIVERABLE_STATUS_LABEL,
  DELIVERABLE_STATUS_STYLE,
  FORMAT_LABEL,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_STYLE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
  PLATFORM_LABEL,
  bookingMetrics,
  campaignTotals,
  dateRange,
  formatCount,
  formatLkr,
  lodgeProgress,
  lodgeSummary,
} from "@/lib/campaigns";
import { metricoolConfig } from "@/lib/metricool";
import { databaseErrorMessage, db, schema } from "@/lib/db";
import { BookingFields, CampaignFields, DeliverableFields, LodgeFields } from "../CampaignFields";
import AddBookingForm from "./AddBookingForm";

export const dynamic = "force-dynamic";

function loadCampaign(id: string) {
  return db.query.campaigns.findFirst({
    where: eq(schema.campaigns.id, id),
    with: {
      bookings: {
        with: {
          creator: true,
          rate: true,
          deliverables: { orderBy: (d, { asc }) => [asc(d.dueDate), asc(d.platform)] },
        },
      },
    },
  });
}

function loadRoster() {
  return db.query.creators.findMany({
    orderBy: (c, { asc }) => asc(c.name),
    with: { rates: true },
  });
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let campaign: Awaited<ReturnType<typeof loadCampaign>>;
  let roster: Awaited<ReturnType<typeof loadRoster>>;
  try {
    [campaign, roster] = await Promise.all([loadCampaign(id), loadRoster()]);
  } catch (err) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaign</h1>
        <div className="mt-4">
          <DataError message={databaseErrorMessage(err)} />
        </div>
      </div>
    );
  }
  if (!campaign) notFound();

  const totals = campaignTotals(campaign.bookings);
  const lodge = lodgeProgress(campaign.bookings);
  const metricool = metricoolConfig();
  const bookings = [...campaign.bookings].sort(
    (a, b) =>
      Number(a.status === "dropped") - Number(b.status === "dropped") ||
      a.creator.name.localeCompare(b.creator.name),
  );
  const onCampaign = new Set(campaign.bookings.map((b) => b.creatorId));
  const available = roster
    .filter((c) => !onCampaign.has(c.id))
    .sort((a, b) => DECISION_ORDER.indexOf(a.decision) - DECISION_ORDER.indexOf(b.decision))
    .map((c) => ({
      id: c.id,
      name: c.name,
      decision: c.decision,
      rates: c.rates.map((r) => ({ id: r.id, label: r.label, amountLkr: r.amountLkr })),
    }));

  return (
    <div>
      <Link href="/campaigns" className="text-sm text-neutral-500 hover:text-brand">
        ← Campaigns
      </Link>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="mt-1 text-sm text-neutral-600">{dateRange(campaign.startDate, campaign.endDate)}</p>
        </div>
        <Badge className={CAMPAIGN_STATUS_STYLE[campaign.status]}>
          {CAMPAIGN_STATUS_LABEL[campaign.status]}
        </Badge>
      </div>
      {campaign.notes && (
        <p className="mt-3 whitespace-pre-line text-sm text-neutral-700">{campaign.notes}</p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Total label="Agreed spend" value={formatLkr(totals.spendLkr)} />
        <Total
          label="Posts live"
          value={`${totals.live} / ${totals.promised}`}
          note={totals.missed > 0 ? `${totals.missed} missed` : undefined}
        />
        <Total
          label="Views"
          value={formatCount(totals.views)}
          note={totals.costPer1kViews != null ? `${formatLkr(totals.costPer1kViews)} per 1K` : undefined}
        />
        <Total
          label="Signups"
          value={formatCount(totals.signups)}
          note={totals.costPerSignup != null ? `${formatLkr(totals.costPerSignup)} each` : undefined}
        />
        <Total label="Creators" value={String(totals.creators)} />
        <Total label="KYC completions" value={formatCount(totals.kycCompletions)} />
        <Total label="First deposits" value={formatCount(totals.firstDeposits)} />
      </div>
      {lodge.lodged > 0 && (
        <p className="mt-3 text-sm text-neutral-700">
          {lodge.lodged} lodged · {lodgeSummary(lodge)} · {lodge.draftApproved} drafts approved
          {lodge.invoicesOut > 0 && ` · ${lodge.invoicesOut} invoices requested`}
          {lodge.unpaid > 0 && ` · ${lodge.unpaid} not marked paid`}
        </p>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        Views count live posts only. Cost per 1K views and per signup use the spend of creators
        who have those results so far. Dropped creators are left out. Post counts are typed in.
        Metricool, when connected, adds the brand totals for these dates underneath.
      </p>

      <MetricoolPanel
        campaignId={campaign.id}
        blogId={campaign.metricoolBlogId}
        configured={metricool.configured}
        snapshot={campaign.metricoolSnapshot}
      />

      {bookings.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="p-3 font-medium">Creator</th>
                <th className="p-3 font-medium">Booking</th>
                <th className="p-3 text-right font-medium">Agreed</th>
                <th className="p-3 text-right font-medium">Live</th>
                <th className="p-3 text-right font-medium">Views</th>
                <th className="p-3 text-right font-medium">Per 1K views</th>
                <th className="p-3 text-right font-medium">Signups</th>
                <th className="p-3 text-right font-medium">KYC</th>
                <th className="p-3 text-right font-medium">Deposits</th>
                <th className="p-3 text-right font-medium">Per signup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {bookings.map((b) => {
                const m = bookingMetrics(b);
                return (
                  <tr key={b.id} className={b.status === "dropped" ? "text-neutral-400" : ""}>
                    <td className="p-3">
                      <a href={`#booking-${b.id}`} className="font-medium hover:text-brand">
                        {b.creator.name}
                      </a>
                    </td>
                    <td className="p-3">{BOOKING_STATUS_LABEL[b.status]}</td>
                    <td className="whitespace-nowrap p-3 text-right">{formatLkr(m.spendLkr)}</td>
                    <td className="p-3 text-right">
                      {m.live}/{m.promised}
                      {m.missed > 0 && <span className="ml-1 text-red-700">({m.missed} missed)</span>}
                    </td>
                    <td className="p-3 text-right">{formatCount(m.views)}</td>
                    <td className="whitespace-nowrap p-3 text-right">{formatLkr(m.costPer1kViews)}</td>
                    <td className="p-3 text-right">{formatCount(b.signups)}</td>
                    <td className="p-3 text-right">{formatCount(b.kycCompletions)}</td>
                    <td className="p-3 text-right">{formatCount(b.firstDeposits)}</td>
                    <td className="whitespace-nowrap p-3 text-right">{formatLkr(m.costPerSignup)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-8 space-y-6">
        {bookings.map((b) => (
          <div
            key={b.id}
            id={`booking-${b.id}`}
            className="scroll-mt-20 rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link href={`/creators/${b.creatorId}`} className="font-semibold hover:text-brand">
                  {b.creator.name}
                </Link>
                <div className="mt-0.5 text-sm text-neutral-600">
                  {b.rate ? `${b.rate.label} · quoted ${formatLkr(b.rate.amountLkr)}` : "No package picked"}
                  {" · agreed "}
                  {formatLkr(b.agreedLkr)}
                </div>
                {b.notes && <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{b.notes}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {b.lodged && <Badge className="bg-navy text-white">Lodged</Badge>}
                <Badge className={DECISION_STYLE[b.creator.decision]}>{DECISION_LABEL[b.creator.decision]}</Badge>
                <Badge className="bg-neutral-100 text-neutral-700">{BOOKING_STATUS_LABEL[b.status]}</Badge>
              </div>
            </div>

            {b.lodged && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <Badge className={b.briefSent ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}>
                  {b.briefSent ? "Brief sent" : "Brief not sent"}
                </Badge>
                <Badge className={b.draftApproved ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}>
                  {b.draftApproved ? "Draft approved" : "Draft open"}
                </Badge>
                <Badge className={b.posted ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}>
                  {b.posted ? "Posted" : "Not posted"}
                </Badge>
                <Badge className={INVOICE_STATUS_STYLE[b.invoiceStatus]}>
                  Invoice {INVOICE_STATUS_LABEL[b.invoiceStatus].toLowerCase()}
                </Badge>
                <Badge className={b.paymentStatus ? PAYMENT_STATUS_STYLE[b.paymentStatus] : "bg-neutral-100 text-neutral-600"}>
                  {b.paymentStatus ? PAYMENT_STATUS_LABEL[b.paymentStatus] : "Payment unknown"}
                </Badge>
                {b.goLiveDate && <span className="text-neutral-500">Go-live {b.goLiveDate}</span>}
                <ExternalLink href={b.emailUrl}>Email</ExternalLink>
              </div>
            )}
            {b.lodged && b.deliverableSummary && (
              <p className="mt-2 text-sm text-neutral-700">{b.deliverableSummary}</p>
            )}

            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-brand">
                {b.lodged ? "Edit lodge" : "Lodge this creator"}
              </summary>
              <p className="mt-2 text-sm text-neutral-600">
                Record the agreed fee as in production: brief, draft, post, invoice and payment.
                Saving confirms a quote.
              </p>
              <ActionForm action={saveLodge} submitLabel={b.lodged ? "Save lodge" : "Lodge creator"} className="mt-3">
                <input type="hidden" name="id" value={b.id} />
                <LodgeFields booking={b} />
              </ActionForm>
              {b.lodged && (
                <ActionForm
                  action={unlodgeBooking}
                  submitLabel="Take off the lodge"
                  pendingLabel="Saving…"
                  variant="secondary"
                  compact
                  className="mt-2"
                >
                  <input type="hidden" name="id" value={b.id} />
                </ActionForm>
              )}
            </details>

            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-brand">Edit booking and results</summary>
              <ActionForm action={updateBooking} submitLabel="Save" className="mt-3">
                <input type="hidden" name="id" value={b.id} />
                <BookingFields booking={b} />
              </ActionForm>
            </details>

            <h3 className="mt-5 text-sm font-medium">Deliverables</h3>
            <div className="mt-2 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
              {b.deliverables.map((d) => (
                <div key={d.id} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">
                        {PLATFORM_LABEL[d.platform]} {FORMAT_LABEL[d.format].toLowerCase()}
                      </span>
                      <Badge className={DELIVERABLE_STATUS_STYLE[d.status]}>
                        {DELIVERABLE_STATUS_LABEL[d.status]}
                      </Badge>
                      {d.dueDate && <span className="text-neutral-500">due {d.dueDate}</span>}
                      <ExternalLink href={d.postUrl}>Post</ExternalLink>
                      <ExternalLink href={d.insightsUrl}>Insights</ExternalLink>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <span>{formatCount(d.views)} views</span>
                      <span>{formatCount(d.likes)} likes</span>
                      <span>{formatCount(d.comments)} comments</span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {d.status !== "live" && (
                      <StatusButton id={d.id} status="live" label="Mark live" />
                    )}
                    {d.status !== "missed" && (
                      <StatusButton id={d.id} status="missed" label="Mark missed" />
                    )}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-brand">Edit links and numbers</summary>
                    <ActionForm action={updateDeliverable} submitLabel="Save" className="mt-3">
                      <input type="hidden" name="id" value={d.id} />
                      <DeliverableFields deliverable={d} />
                    </ActionForm>
                    <ActionForm
                      action={deleteDeliverable}
                      submitLabel="Remove deliverable"
                      pendingLabel="Removing…"
                      variant="danger"
                      compact
                      confirm="Remove this deliverable?"
                      className="mt-2"
                    >
                      <input type="hidden" name="id" value={d.id} />
                    </ActionForm>
                  </details>
                </div>
              ))}
              {b.deliverables.length === 0 && (
                <p className="p-3 text-sm text-neutral-600">No deliverables yet. Add each promised post.</p>
              )}
              <details className="p-3">
                <summary className="cursor-pointer text-sm font-medium text-brand">Add deliverable</summary>
                <ActionForm action={addDeliverable} submitLabel="Add deliverable" className="mt-3">
                  <input type="hidden" name="campaignCreatorId" value={b.id} />
                  <DeliverableFields />
                </ActionForm>
              </details>
            </div>

            <ActionForm
              action={removeBooking}
              submitLabel="Remove from campaign"
              pendingLabel="Removing…"
              variant="danger"
              compact
              confirm={`Remove ${b.creator.name} and their deliverables from this campaign? Set the booking to Dropped instead to keep the record.`}
              className="mt-4"
            >
              <input type="hidden" name="id" value={b.id} />
            </ActionForm>
          </div>
        ))}
        {bookings.length === 0 && (
          <p className="text-sm text-neutral-600">No creators on this campaign yet.</p>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <h2 className="font-medium">Add a creator</h2>
        <div className="mt-3">
          <AddBookingForm campaignId={campaign.id} creators={available} />
        </div>
      </section>

      <details className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-brand">Edit campaign</summary>
        <ActionForm action={updateCampaign} submitLabel="Save campaign" className="mt-4">
          <input type="hidden" name="id" value={campaign.id} />
          <CampaignFields campaign={campaign} />
        </ActionForm>
        <ActionForm
          action={deleteCampaign}
          submitLabel="Delete campaign"
          pendingLabel="Deleting…"
          variant="danger"
          compact
          confirm={`Delete ${campaign.name} with all its bookings and deliverables?`}
          className="mt-4"
        >
          <input type="hidden" name="id" value={campaign.id} />
        </ActionForm>
      </details>
    </div>
  );
}

function MetricoolPanel({
  campaignId,
  blogId,
  configured,
  snapshot,
}: {
  campaignId: string;
  blogId: string | null;
  configured: boolean;
  snapshot: {
    syncedAt: string;
    from: string;
    to: string;
    series: { network: string; metric: string; total: number }[];
    error?: string;
  } | null;
}) {
  return (
    <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Metricool</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Refresh pulls the connected brand&apos;s analytics for this campaign&apos;s dates.
            Those numbers are the brand account, not the views on a creator&apos;s post. Paste each
            post link below and type its views until the post is on a brand Metricool can read.
          </p>
        </div>
        <ActionForm action={refreshMetricool} submitLabel="Refresh" pendingLabel="Refreshing…" variant="secondary" compact>
          <input type="hidden" name="id" value={campaignId} />
        </ActionForm>
      </div>
      {!configured && (
        <p className="mt-3 text-sm text-amber-800">
          Not connected. Set METRICOOL_TOKEN and METRICOOL_USER_ID on the server. The token is in
          Metricool under Account settings → API, and API access needs the Advanced plan.
        </p>
      )}
      {configured && !blogId && (
        <p className="mt-3 text-sm text-neutral-600">
          Add the brand id in Edit campaign, or set METRICOOL_BLOG_ID. It is the blogId in the brand URL.
        </p>
      )}
      {snapshot && (
        <div className="mt-3 text-sm text-neutral-700">
          <p>
            Last refresh {snapshot.syncedAt.slice(0, 16).replace("T", " ")} UTC · {snapshot.from} to {snapshot.to}
          </p>
          {snapshot.series.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {snapshot.series.map((point) => (
                <li key={`${point.network}-${point.metric}`} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium">
                  {point.network} {point.metric} {formatCount(point.total)}
                </li>
              ))}
            </ul>
          )}
          {snapshot.error && <p className="mt-2 text-red-700">{snapshot.error}</p>}
        </div>
      )}
    </section>
  );
}

function StatusButton({ id, status, label }: { id: string; status: "live" | "missed"; label: string }) {
  return (
    <ActionForm action={setDeliverableStatus} submitLabel={label} pendingLabel="Saving…" variant="secondary" compact>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
    </ActionForm>
  );
}

function Total({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {note && <div className="text-xs text-neutral-500">{note}</div>}
    </div>
  );
}
