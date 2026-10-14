import Link from "next/link";
import { DataError } from "@/components/DataError";
import FollowUpDone from "@/components/FollowUpDone";
import { COHORT_LABEL } from "@/lib/activity-sheet";
import { Badge } from "@/components/fields";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_STYLE,
  DECISION_LABEL,
  DECISION_ORDER,
  formatCount,
  formatLkr,
} from "@/lib/campaigns";
import {
  WEEKLY_CALL_TARGET,
  ageLabel,
  formatDay,
  loadDashboard,
  type DashboardData,
  type ReviewQueue,
} from "@/lib/dashboard";
import { databaseErrorMessage } from "@/lib/db";

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

export default async function Home() {
  let data: DashboardData | null = null;
  let loadError: string | null = null;
  try {
    data = await loadDashboard();
  } catch (err) {
    loadError = databaseErrorMessage(err);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
            Elevate Pay · Internal
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">This week</h1>
        </div>
        <Link
          href="/calls/new"
          className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          New call
        </Link>
      </div>

      {loadError && (
        <div className="mt-6">
          <DataError message={loadError} />
        </div>
      )}

      {data && <Dashboard data={data} />}
    </div>
  );
}

function Dashboard({ data }: { data: DashboardData }) {
  const sheetStale = data.snapshotAgeDays == null || data.snapshotAgeDays > 7;
  const creatorTotal = Object.values(data.creatorCounts).reduce((sum, n) => sum + n, 0);
  const notes = weekNotes(data, sheetStale);

  return (
    <>
      <section className="mt-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <p className="text-sm text-neutral-500">Since {formatDay(data.periodStart)}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums tracking-tight">
            {data.callsInPeriod}
          </span>
          <span className="text-neutral-500">of {WEEKLY_CALL_TARGET} calls</span>
        </p>
        <div
          className="mt-4 flex max-w-xl gap-1.5"
          role="img"
          aria-label={`${data.callsInPeriod} of ${WEEKLY_CALL_TARGET} calls in the last 7 days`}
        >
          {Array.from({ length: WEEKLY_CALL_TARGET }, (_, i) => (
            <span
              key={i}
              className={
                "h-2 flex-1 rounded-full " + (i < data.callsInPeriod ? "bg-brand" : "bg-neutral-200")
              }
            />
          ))}
        </div>
        {notes.length > 0 && (
          <p className="mt-3 text-sm text-neutral-600">
            {notes.map((note, index) => (
              <span key={note.href}>
                {index > 0 && " · "}
                <Link href={note.href} className="hover:text-brand">
                  {note.text}
                </Link>
              </span>
            ))}
          </p>
        )}
      </section>

      <div className="mt-6 grid items-start gap-6 min-[880px]:grid-cols-5">
        <div className="space-y-6 min-[880px]:col-span-3">
          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">Calls</h2>
              <Link href="/calls" className="text-sm text-brand hover:text-brand-dark">
                All calls
              </Link>
            </div>
            <div className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {data.recentCalls.length === 0 && (
                <p className="p-4 text-sm text-neutral-600">
                  No calls yet.{" "}
                  <Link href="/calls/new" className="font-medium text-brand hover:text-brand-dark">
                    Paste a transcript
                  </Link>{" "}
                  to start the week.
                </p>
              )}
              {data.recentCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-brand-50/50"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {call.userId}{" "}
                      <span className="font-normal text-neutral-500">
                        · {formatDay(call.callDate)}
                        {call.cohortAtCall ? ` · ${COHORT_LABEL[call.cohortAtCall]}` : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-sm text-neutral-600">
                      {call.summary ?? "No summary yet"}
                    </div>
                  </div>
                  <Badge className={QUEUE_STYLE[call.queue]}>{QUEUE_LABEL[call.queue]}</Badge>
                </Link>
              ))}
            </div>
          </section>

          {data.openFollowUps.length > 0 && (
            <section>
              <h2 className="font-semibold">Follow-ups</h2>
              <div className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
                {data.openFollowUps.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 p-4">
                    <Link href={`/calls/${item.callId}`} className="min-w-0 hover:text-brand">
                      <div className="font-medium">{item.action}</div>
                      <div className={"mt-0.5 text-sm " + (item.overdue ? "text-red-700" : "text-neutral-600")}>
                        {item.userId}
                        {item.owner ? ` · ${item.owner}` : ""}
                        {item.dueDate ? ` · due ${formatDay(item.dueDate)}` : ""}
                        {item.overdue ? " · overdue" : ""}
                      </div>
                    </Link>
                    <FollowUpDone id={item.id} done={false} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6 min-[880px]:col-span-2">
          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">Engineering list</h2>
              <Link href="/engineering" className="text-sm text-brand hover:text-brand-dark">
                Full list
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {data.topIssues.length === 0 && (
                <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                  No approved issues yet. Approve the issues on a call, then publish it.
                </p>
              )}
              {data.topIssues.map((issue, index) => (
                <Link
                  key={issue.key}
                  href="/engineering"
                  className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-brand"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium capitalize">
                      {index + 1}. {issue.title}
                    </div>
                    <span className="shrink-0 rounded bg-navy px-2 py-0.5 text-xs font-medium text-white">
                      {issue.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {issue.severity} · {issue.users} {issue.users === 1 ? "user" : "users"}
                  </div>
                  {issue.quote && (
                    <p className="mt-2 line-clamp-2 border-l-2 border-brand pl-3 text-sm italic text-neutral-700">
                      “{issue.quote}”
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">Campaigns</h2>
              <Link href="/campaigns" className="text-sm text-brand hover:text-brand-dark">
                All campaigns
              </Link>
            </div>
            <div className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {data.campaigns.length === 0 && (
                <p className="p-4 text-sm text-neutral-600">No campaigns yet.</p>
              )}
              {data.campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="block p-4 hover:bg-brand-50/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 font-medium">{campaign.name}</div>
                    <Badge className={CAMPAIGN_STATUS_STYLE[campaign.status]}>
                      {CAMPAIGN_STATUS_LABEL[campaign.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-neutral-600">
                    {campaign.live}/{campaign.promised} posts live
                    {campaign.missed > 0 && (
                      <span className="text-red-700"> · {campaign.missed} missed</span>
                    )}
                    {" · "}
                    {formatLkr(campaign.spendLkr)}
                    {campaign.signups != null && ` · ${formatCount(campaign.signups)} signups`}
                    {campaign.lodge && ` · ${campaign.lodge}`}
                  </div>
                </Link>
              ))}
              <div className="px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Creators</div>
                {creatorTotal === 0 ? (
                  <p className="mt-1 text-sm text-neutral-600">No shortlist yet.</p>
                ) : (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    {DECISION_ORDER.filter((decision) => (data.creatorCounts[decision] ?? 0) > 0).map(
                      (decision) => (
                        <Link
                          key={decision}
                          href={`/creators?decision=${decision}`}
                          className="text-neutral-600 hover:text-brand"
                        >
                          {DECISION_LABEL[decision]}{" "}
                          <span className="font-medium text-navy">{data.creatorCounts[decision]}</span>
                        </Link>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function weekNotes(data: DashboardData, sheetStale: boolean) {
  const notes: { href: string; text: string }[] = [];
  if (data.readyToPublish.length > 0) {
    const n = data.readyToPublish.length;
    notes.push({
      href: n === 1 ? `/calls/${data.readyToPublish[0].id}` : "/calls?queue=publish",
      text: n === 1 ? "1 call ready to publish" : `${n} calls ready to publish`,
    });
  } else if (data.needsReview.length > 0) {
    const n = data.needsReview.length;
    notes.push({
      href: n === 1 ? `/calls/${data.needsReview[0].id}` : "/calls?queue=review",
      text: n === 1 ? "1 call still in review" : `${n} calls still in review`,
    });
  }
  if (data.missedPosts > 0) {
    notes.push({
      href: "/campaigns",
      text: data.missedPosts === 1 ? "1 post missed" : `${data.missedPosts} posts missed`,
    });
  }
  if (sheetStale) {
    notes.push({
      href: "/activity",
      text:
        data.snapshotDate == null
          ? "Activity sheet not uploaded"
          : `Activity sheet ${ageLabel(data.snapshotAgeDays).toLowerCase()}`,
    });
  }
  return notes;
}
