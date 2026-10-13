import { count, desc, eq, max, sql } from "drizzle-orm";
import { campaignTotals, lodgeProgress, lodgeSummary } from "./campaigns";
import { db, schema } from "./db";
import { buildEngineeringList } from "./engineering";

/** Matches the weekly pace described on the digest: about 10 user calls. */
export const WEEKLY_CALL_TARGET = 10;

/** Same window as the manager digest: published calls from the last 7 days. */
const DIGEST_WINDOW_DAYS = 7;

export type ReviewQueue = "review" | "publish" | "published";

export type DashboardCall = {
  id: string;
  userId: string;
  callDate: string;
  summary: string | null;
  status: string;
  pendingIssues: number;
  issueCount: number;
  queue: ReviewQueue;
};

export type DashboardFollowUp = {
  id: string;
  callId: string;
  userId: string;
  action: string;
  owner: string | null;
  dueDate: string | null;
  overdue: boolean;
};

export type DashboardData = {
  today: string;
  periodStart: string;
  callsInPeriod: number;
  publishedInPeriod: number;
  openCount: number;
  needsReview: DashboardCall[];
  readyToPublish: DashboardCall[];
  recentCalls: DashboardCall[];
  openFollowUps: DashboardFollowUp[];
  rankedIssues: number;
  topIssues: {
    key: string;
    title: string;
    severity: string;
    score: number;
    users: number;
    quote: string | null;
  }[];
  snapshotDate: string | null;
  userCount: number;
  snapshotAgeDays: number | null;
  missedPosts: number;
  campaigns: {
    id: string;
    name: string;
    status: string;
    live: number;
    promised: number;
    missed: number;
    spendLkr: number | null;
    signups: number | null;
    lodge: string | null;
  }[];
  creatorCounts: Record<string, number>;
};

/**
 * A call can be published once every extracted issue is approved or rejected.
 * Drafts with nothing left to decide are the actual publish queue. The
 * `reviewed` status exists on the enum but nothing writes it.
 */
export function reviewQueue(status: string, pendingIssues: number, issueCount: number): ReviewQueue {
  if (status === "published") return "published";
  if (issueCount > 0 && pendingIssues === 0) return "publish";
  return "review";
}

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function ageLabel(ageDays: number | null): string {
  if (ageDays == null) return "Not uploaded";
  if (ageDays <= 0) return "Today";
  if (ageDays === 1) return "Yesterday";
  return `${ageDays} days ago`;
}

export async function loadIssueCounts(): Promise<Map<string, { pending: number; total: number }>> {
  const rows = await db
    .select({
      callId: schema.issues.callId,
      pending: sql<string>`count(*) filter (where ${schema.issues.reviewStatus} = 'pending')`,
      total: count(),
    })
    .from(schema.issues)
    .groupBy(schema.issues.callId);

  return new Map(
    rows.map((row) => [
      row.callId,
      { pending: Number(row.pending), total: Number(row.total) },
    ]),
  );
}

export async function loadDashboard(): Promise<DashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const periodStart = addDays(today, -DIGEST_WINDOW_DAYS);

  const [callRows, issueCounts, followUpRows, snapshotRows, engineering, campaignRows, creatorRows, missedRows] =
    await Promise.all([
      db
        .select({
          id: schema.calls.id,
          userId: schema.calls.userId,
          callDate: schema.calls.callDate,
          summary: schema.calls.summary,
          status: schema.calls.status,
          createdAt: schema.calls.createdAt,
        })
        .from(schema.calls)
        .orderBy(desc(schema.calls.callDate), desc(schema.calls.createdAt)),
      loadIssueCounts(),
      db
        .select({
          id: schema.followUps.id,
          callId: schema.followUps.callId,
          action: schema.followUps.action,
          owner: schema.followUps.owner,
          dueDate: schema.followUps.dueDate,
          userId: schema.calls.userId,
        })
        .from(schema.followUps)
        .innerJoin(schema.calls, eq(schema.followUps.callId, schema.calls.id))
        .where(eq(schema.followUps.done, false)),
      db
        .select({ snapshotDate: max(schema.users.snapshotDate), userCount: count() })
        .from(schema.users),
      buildEngineeringList(),
      db.query.campaigns.findMany({
        orderBy: (c, { desc: byDesc }) => byDesc(c.createdAt),
        with: { bookings: { with: { deliverables: true } } },
      }),
      db
        .select({ decision: schema.creators.decision, n: count() })
        .from(schema.creators)
        .groupBy(schema.creators.decision),
      db
        .select({ n: count() })
        .from(schema.deliverables)
        .where(eq(schema.deliverables.status, "missed")),
    ]);

  const calls: DashboardCall[] = callRows.map((call) => {
    const issues = issueCounts.get(call.id) ?? { pending: 0, total: 0 };
    return {
      id: call.id,
      userId: call.userId,
      callDate: call.callDate,
      summary: call.summary,
      status: call.status,
      pendingIssues: issues.pending,
      issueCount: issues.total,
      queue: reviewQueue(call.status, issues.pending, issues.total),
    };
  });

  const inPeriod = calls.filter((call) => call.callDate >= periodStart);
  const needsReview = calls.filter((call) => call.queue === "review");
  const readyToPublish = calls.filter((call) => call.queue === "publish");
  const open = [...needsReview, ...readyToPublish].sort((a, b) => {
    if (a.queue !== b.queue) return a.queue === "review" ? -1 : 1;
    return a.callDate.localeCompare(b.callDate);
  });
  const published = calls.filter((call) => call.queue === "published");

  const openFollowUps = followUpRows
    .map((row) => ({
      id: row.id,
      callId: row.callId,
      userId: row.userId,
      action: row.action,
      owner: row.owner,
      dueDate: row.dueDate,
      overdue: row.dueDate != null && row.dueDate < today,
    }))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.action.localeCompare(b.action);
    });

  const snapshotDate = snapshotRows[0]?.snapshotDate ?? null;
  const statusRank: Record<string, number> = { live: 0, reviewing: 1, planning: 2, closed: 3 };

  return {
    today,
    periodStart,
    callsInPeriod: inPeriod.length,
    publishedInPeriod: inPeriod.filter((call) => call.queue === "published").length,
    openCount: open.length,
    needsReview,
    readyToPublish,
    recentCalls: [...open, ...published].slice(0, 8),
    openFollowUps,
    rankedIssues: engineering.length,
    topIssues: engineering.slice(0, 3).map((group) => ({
      key: group.key,
      title: `${phrase(group.type)} · ${phrase(group.productArea)}`,
      severity: group.severity.toUpperCase(),
      score: group.score,
      users: group.distinctUsers,
      quote: group.quotes[0] ?? null,
    })),
    snapshotDate,
    userCount: Number(snapshotRows[0]?.userCount ?? 0),
    snapshotAgeDays: snapshotDate ? daysBetween(snapshotDate, today) : null,
    missedPosts: Number(missedRows[0]?.n ?? 0),
    campaigns: campaignRows
      .map((campaign) => {
        const totals = campaignTotals(campaign.bookings);
        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          live: totals.live,
          promised: totals.promised,
          missed: totals.missed,
          spendLkr: totals.spendLkr,
          signups: totals.signups,
          lodge: lodgeSummary(lodgeProgress(campaign.bookings)),
        };
      })
      .sort((a, b) => statusRank[a.status] - statusRank[b.status])
      .slice(0, 4),
    creatorCounts: Object.fromEntries(creatorRows.map((row) => [row.decision, Number(row.n)])),
  };
}

function phrase(value: string): string {
  return value.replaceAll("_", " ");
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}
