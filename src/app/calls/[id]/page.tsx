import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/auth";
import { db, schema } from "@/lib/db";
import IssueCard from "./IssueCard";
import PublishButton from "./PublishButton";

export const dynamic = "force-dynamic";


export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const call = await db.query.calls.findFirst({ where: eq(schema.calls.id, id) });
  if (!call) notFound();

  const [callIssues, callFollowUps, user, viewer] = await Promise.all([
    db.query.issues.findMany({ where: eq(schema.issues.callId, id) }),
    db.query.followUps.findMany({ where: eq(schema.followUps.callId, id) }),
    db.query.users.findFirst({ where: eq(schema.users.userId, call.userId) }),
    getSessionUser(),
  ]);

  const pendingCount = callIssues.filter((i) => i.reviewStatus === "pending").length;
  const isOperator = viewer?.role === "operator";
  const readOnly = !isOperator || call.status === "published";

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {call.userId} — {call.callDate}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Activity at time of call:{" "}
            <span className="font-medium">{call.userActivityAtCall ?? "unknown"}</span>
            {user && <> · currently {user.activity}</>}
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
          {call.status}
        </span>
      </div>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-medium">Summary</h2>
        <p className="mt-1 text-sm text-neutral-700">{call.summary}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-neutral-500">User goal</dt>
            <dd>{call.userGoal}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Onboarding stage</dt>
            <dd>{call.onboardingStage}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Sentiment</dt>
            <dd>{call.sentiment}</dd>
          </div>
        </dl>
        {call.redactionNotes && (
          <p className="mt-3 text-xs text-neutral-500">Masked: {call.redactionNotes}</p>
        )}
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">
            Issues ({callIssues.length}) — {pendingCount} pending review
          </h2>
          {isOperator && (
            <PublishButton callId={call.id} disabled={pendingCount > 0 || call.status === "published"} />
          )}
        </div>
        <div className="mt-3 space-y-3">
          {callIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} readOnly={readOnly} />
          ))}
          {callIssues.length === 0 && (
            <p className="text-sm text-neutral-600">No issues were extracted from this call.</p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-medium">Follow-ups</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {callFollowUps.map((f) => (
            <li key={f.id}>
              • {f.action} {f.owner && <span className="text-neutral-500">({f.owner})</span>}
              {f.dueDate && <span className="text-neutral-500"> — due {f.dueDate}</span>}
            </li>
          ))}
          {callFollowUps.length === 0 && (
            <li className="text-neutral-600">No follow-ups extracted.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
