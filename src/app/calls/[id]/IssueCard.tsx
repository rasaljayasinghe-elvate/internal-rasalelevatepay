"use client";

import { useTransition } from "react";
import { setIssueReviewStatus } from "@/lib/actions";
import type { schema } from "@/lib/db";

type Issue = typeof schema.issues.$inferSelect;

const SEVERITY_LABEL: Record<string, string> = {
  s1: "S1 — blocks onboarding/money",
  s2: "S2 — major friction",
  s3: "S3 — minor",
};

export default function IssueCard({ issue, readOnly }: { issue: Issue; readOnly: boolean }) {
  const [isPending, startTransition] = useTransition();

  function review(status: "approved" | "rejected") {
    startTransition(() => setIssueReviewStatus(issue.id, status));
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex gap-2 text-xs">
            <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium">{issue.type}</span>
            <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium">{issue.productArea}</span>
            <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium">
              {SEVERITY_LABEL[issue.severity]}
            </span>
          </div>
          <blockquote className="mt-2 border-l-2 border-brand pl-3 text-sm italic text-neutral-700">
            “{issue.quote}”
          </blockquote>
          {issue.timestampInCall && (
            <p className="mt-1 text-xs text-neutral-500">at {issue.timestampInCall}</p>
          )}
        </div>
        <span
          className={
            "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " +
            (issue.reviewStatus === "approved"
              ? "bg-green-100 text-green-800"
              : issue.reviewStatus === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-amber-100 text-amber-800")
          }
        >
          {issue.reviewStatus}
        </span>
      </div>

      {!readOnly && issue.reviewStatus === "pending" && (
        <div className="mt-3 flex gap-2">
          <button
            disabled={isPending}
            onClick={() => review("approved")}
            className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={isPending}
            onClick={() => review("rejected")}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-navy hover:border-neutral-400 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
