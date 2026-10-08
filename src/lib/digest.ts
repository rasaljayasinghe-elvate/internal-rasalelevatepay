import { eq, and, gte } from "drizzle-orm";
import { db, schema } from "./db";

export type DigestData = {
  periodStart: string;
  callsHeld: number;
  userMix: Record<string, number>; // activity -> count of calls
  stalledByStage: Record<string, number>; // onboarding stage -> count of S1/S2 issues
  notableQuotes: { quote: string; severity: string; productArea: string }[];
};

/** R7: pulls the last 7 days of published calls and their approved issues. */
export async function buildWeeklyDigest(): Promise<DigestData> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);
  const periodStartIso = periodStart.toISOString().slice(0, 10);

  const calls = await db
    .select()
    .from(schema.calls)
    .where(and(eq(schema.calls.status, "published"), gte(schema.calls.callDate, periodStartIso)));

  const userMix: Record<string, number> = {};
  for (const c of calls) {
    const key = c.userActivityAtCall ?? "unknown";
    userMix[key] = (userMix[key] ?? 0) + 1;
  }

  const callIds = calls.map((c) => c.id);
  const stalledByStage: Record<string, number> = {};
  const notableQuotes: DigestData["notableQuotes"] = [];

  if (callIds.length > 0) {
    const issues = await db.query.issues.findMany({
      where: (i, { inArray, eq }) => and(inArray(i.callId, callIds), eq(i.reviewStatus, "approved")),
    });

    for (const issue of issues) {
      if (issue.severity === "s1" || issue.severity === "s2") {
        stalledByStage[issue.productArea] = (stalledByStage[issue.productArea] ?? 0) + 1;
      }
      if (issue.severity === "s1") {
        notableQuotes.push({ quote: issue.quote, severity: issue.severity, productArea: issue.productArea });
      }
    }
  }

  return {
    periodStart: periodStartIso,
    callsHeld: calls.length,
    userMix,
    stalledByStage,
    notableQuotes: notableQuotes.slice(0, 5),
  };
}

export function digestToMarkdown(d: DigestData): string {
  const lines = [
    `# Weekly manager digest`,
    ``,
    `Since ${d.periodStart}`,
    ``,
    `## Calls held and user mix`,
    `${d.callsHeld} ${d.callsHeld === 1 ? "call" : "calls"}.`,
    ...Object.entries(d.userMix).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Where onboarding stalls (S1/S2 issues by funnel stage)`,
    ...Object.entries(d.stalledByStage).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Notable quotes`,
    ...d.notableQuotes.map((q) => `> (${q.severity.toUpperCase()}, ${q.productArea}) ${q.quote}`),
    ``,
    `## Recommended decisions`,
    `_Add recommendations before sending._`,
  ];
  return lines.join("\n");
}
