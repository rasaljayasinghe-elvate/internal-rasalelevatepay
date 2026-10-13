import Link from "next/link";
import { DataError } from "@/components/DataError";
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
  const attention = attentionItems(data);
  const sheetStale = data.snapshotAgeDays == null || data.snapshotAgeDays > 7;
  const creatorTotal = Object.values(data.creatorCounts).reduce((sum, n) => sum + n, 0);

  return (
    <>
      <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="grid min-[880px]:grid-cols-[1.35fr_1fr]">
          <div className="p-5 sm:p-6">
            <p className="text-sm text-neutral-500">Since {formatDay(data.periodStart)}</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums tracking-tight">
                {data.callsInPeriod}
              </span>
              <span className="text-neutral-500">of {WEEKLY_CALL_TARGET} calls</span>
            </p>
            <div
              className="mt-4 flex gap-1.5"
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
            <p className="mt-3 max-w-md text-sm text-neutral-600">
              Published calls are the only ones that reach the manager digest and the engineering list.
            </p>
          </div>

          <div className="grid grid-cols-2 border-t border-neutral-200 min-[880px]:border-t-0 min-[880px]:border-l">
            <Stat
              href="/digest"
              label="Published"
              value={String(data.publishedInPeriod)}
              hint="in the digest window"
              className="border-r border-b"
            />
            <Stat
              href="/calls"
              label="Unpublished"
              value={String(data.openCount)}
              hint={
                data.openCount === 0
                  ? "none waiting"
                  : data.readyToPublish.length > 0
                    ? `${data.readyToPublish.length} ready to publish`
                    : "still in review"
              }
              className="border-b"
            />
            <Stat
              href="/engineering"
              label="Ranked issues"
              value={String(data.rankedIssues)}
              hint={
                data.topIssues[0]
                  ? `Top score ${data.topIssues[0].score.toFixed(1)}`
                  : "Publish a call to rank"
              }
              className="border-r"
            />
            <Stat
              href="/activity"
              label="Activity sheet"
              value={data.snapshotDate ? formatDay(data.snapshotDate) : "None"}
              hint={data.userCount === 0 ? "Not uploaded" : ageLabel(data.snapshotAgeDays)}
              hintClassName={sheetStale ? "text-amber-800" : undefined}
            />
          </div>
        </div>

        <div className="border-t border-neutral-200">
          {attention.length === 0 ? (
            <p className="px-5 py-3 text-sm text-neutral-600">Nothing is waiting on review.</p>
          ) : (
            <ul>
              {attention.map((item) => (
                <li key={item.text} className="border-t border-neutral-100 first:border-t-0">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-neutral-50"
                  >
                    <span className={"size-1.5 shrink-0 rounded-full " + item.dot} />
                    <span className="min-w-0 flex-1">{item.text}</span>
                    <span className="shrink-0 text-neutral-400">{item.action} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
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
                      <span className="font-normal text-neutral-500">· {formatDay(call.callDate)}</span>
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
                  <Link
                    key={item.id}
                    href={`/calls/${item.callId}`}
                    className="block p-4 hover:bg-brand-50/50"
                  >
                    <div className="font-medium">{item.action}</div>
                    <div className={"mt-0.5 text-sm " + (item.overdue ? "text-red-700" : "text-neutral-600")}>
                      {item.userId}
                      {item.owner ? ` · ${item.owner}` : ""}
                      {item.dueDate ? ` · due ${formatDay(item.dueDate)}` : ""}
                      {item.overdue ? " · overdue" : ""}
                    </div>
                  </Link>
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

function Stat({
  href,
  label,
  value,
  hint,
  className = "",
  hintClassName = "text-neutral-500",
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
  className?: string;
  hintClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={"block px-4 py-4 transition-colors hover:bg-brand-50/40 sm:px-5 " + className}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className={"mt-0.5 text-sm " + hintClassName}>{hint}</div>
    </Link>
  );
}

function attentionItems(data: DashboardData) {
  const items: { href: string; text: string; action: string; dot: string }[] = [];

  if (data.needsReview.length > 0) {
    const n = data.needsReview.length;
    items.push({
      href: n === 1 ? `/calls/${data.needsReview[0].id}` : "/calls?queue=review",
      text: `${n} ${n === 1 ? "call still needs" : "calls still need"} review`,
      action: "Review",
      dot: "bg-amber-500",
    });
  }

  if (data.readyToPublish.length > 0) {
    const n = data.readyToPublish.length;
    items.push({
      href: n === 1 ? `/calls/${data.readyToPublish[0].id}` : "/calls?queue=publish",
      text:
        n === 1
          ? `${data.readyToPublish[0].userId} is ready to publish`
          : `${n} calls are ready to publish`,
      action: "Publish",
      dot: "bg-brand",
    });
  }

  if (data.openFollowUps.length > 0) {
    const overdue = data.openFollowUps.filter((item) => item.overdue).length;
    const n = data.openFollowUps.length;
    items.push({
      href: `/calls/${data.openFollowUps[0].callId}`,
      text:
        overdue > 0
          ? `${n} ${n === 1 ? "follow-up" : "follow-ups"} open, ${overdue} overdue`
          : `${n} ${n === 1 ? "follow-up" : "follow-ups"} open`,
      action: "Open",
      dot: overdue > 0 ? "bg-red-500" : "bg-amber-500",
    });
  }

  if (data.missedPosts > 0) {
    items.push({
      href: "/campaigns",
      text: `${data.missedPosts} ${data.missedPosts === 1 ? "post" : "posts"} missed`,
      action: "Campaigns",
      dot: "bg-red-500",
    });
  }

  if (data.snapshotAgeDays == null || data.snapshotAgeDays > 7) {
    items.push({
      href: "/activity",
      text:
        data.snapshotDate == null
          ? "Activity sheet has not been uploaded"
          : `Activity sheet is ${ageLabel(data.snapshotAgeDays).toLowerCase()}`,
      action: "Upload",
      dot: "bg-amber-500",
    });
  }

  return items;
}
