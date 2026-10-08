import { eq, and } from "drizzle-orm";
import { db, schema } from "./db";
import { scoreTheme, type ScoredTheme, type Severity, type UserActivity } from "./scoring";

export type EngineeringGroup = ScoredTheme & {
  key: string;
  type: string;
  productArea: string;
  quotes: string[];
  callIds: string[];
};

/**
 * Groups approved issues by (type, productArea) — a lightweight stand-in for
 * full cross-call theme merging (R9, P1) — and ranks the groups with the
 * formula in lib/scoring.ts.
 */
export async function buildEngineeringList(): Promise<EngineeringGroup[]> {
  const approvedIssues = await db
    .select({
      issue: schema.issues,
      call: schema.calls,
    })
    .from(schema.issues)
    .innerJoin(schema.calls, eq(schema.issues.callId, schema.calls.id))
    .where(and(eq(schema.issues.reviewStatus, "approved"), eq(schema.calls.status, "published")));

  const groups = new Map<
    string,
    {
      type: string;
      productArea: string;
      severity: Severity;
      affectedUserIds: string[];
      affectedUserActivity: UserActivity[];
      quotes: string[];
      callIds: string[];
    }
  >();

  for (const { issue, call } of approvedIssues) {
    const key = `${issue.type}::${issue.productArea}`;
    const existing = groups.get(key);
    const severityRank: Record<Severity, number> = { s1: 3, s2: 2, s3: 1 };

    if (!existing) {
      groups.set(key, {
        type: issue.type,
        productArea: issue.productArea,
        severity: issue.severity as Severity,
        affectedUserIds: [call.userId],
        affectedUserActivity: [(call.userActivityAtCall ?? "not_activated") as UserActivity],
        quotes: [issue.quote],
        callIds: [call.id],
      });
    } else {
      existing.affectedUserIds.push(call.userId);
      existing.affectedUserActivity.push((call.userActivityAtCall ?? "not_activated") as UserActivity);
      existing.quotes.push(issue.quote);
      existing.callIds.push(call.id);
      // Keep the group's severity at the worst (highest-weight) seen.
      if (severityRank[issue.severity as Severity] > severityRank[existing.severity]) {
        existing.severity = issue.severity as Severity;
      }
    }
  }

  const result: EngineeringGroup[] = Array.from(groups.entries()).map(([key, g]) => {
    const scored = scoreTheme({
      severity: g.severity,
      affectedUserIds: g.affectedUserIds,
      affectedUserActivity: g.affectedUserActivity,
    });
    return { ...scored, key, type: g.type, productArea: g.productArea, quotes: g.quotes, callIds: g.callIds };
  });

  return result.sort((a, b) => b.score - a.score);
}

export function engineeringListToMarkdown(groups: EngineeringGroup[]): string {
  const lines = ["# Engineering issue list", ""];
  groups.forEach((g, i) => {
    lines.push(
      `## ${i + 1}. ${g.type} — ${g.productArea} (score ${g.score.toFixed(1)}, ${g.distinctUsers} users, ${g.severity.toUpperCase()})`,
    );
    g.quotes.slice(0, 3).forEach((q) => lines.push(`> ${q}`));
    lines.push("");
  });
  return lines.join("\n");
}

export function engineeringListToCsv(groups: EngineeringGroup[]): string {
  const header = ["rank", "type", "product_area", "severity", "distinct_users", "score", "sample_quote"];
  const rows = groups.map((g, i) => [
    String(i + 1),
    g.type,
    g.productArea,
    g.severity,
    String(g.distinctUsers),
    g.score.toFixed(2),
    `"${(g.quotes[0] ?? "").replace(/"/g, '""')}"`,
  ]);
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
