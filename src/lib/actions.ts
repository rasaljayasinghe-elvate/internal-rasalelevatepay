"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireOperator } from "@/auth";
import { db, schema } from "./db";
import { redact, applyManualMasks, summarizeRedactions } from "./redact";
import { extract } from "./extract";
import type { ExtractedIssue } from "./extraction-schema";

export type CreateCallInput = {
  userId: string;
  callDate: string; // ISO date
  transcript: string;
  manualMasks?: string[];
};

/**
 * R1 + R2 + R3: paste a transcript, redact it, run extraction, and persist
 * the call plus its draft issues/follow-ups for review.
 */
export async function createCallFromTranscript(
  input: CreateCallInput,
): Promise<{ callId: string } | { error: string }> {
  const operator = await requireOperator();
  const userId = input.userId.trim();
  if (!userId) throw new Error("User ID is required.");
  if (!input.transcript.trim()) throw new Error("Transcript is empty.");

  const { masked, matches } = redact(input.transcript);
  const fullyMasked = input.manualMasks?.length
    ? applyManualMasks(masked, input.manualMasks)
    : masked;

  const user = await db.query.users.findFirst({
    where: eq(schema.users.userId, userId),
  });

  // Returned rather than thrown: production builds hide thrown server action messages.
  let result: Awaited<ReturnType<typeof extract>>;
  try {
    result = await extract(fullyMasked);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  // Users not yet in the activity sheet still need a row for the calls FK.
  if (!user) {
    await db.insert(schema.users).values({ userId }).onConflictDoNothing();
  }

  const callId = randomUUID();
  await db.insert(schema.calls).values({
    id: callId,
    userId,
    callDate: input.callDate,
    rawTranscriptMasked: fullyMasked,
    redactionNotes: summarizeRedactions(matches),
    summary: result.extraction.summary,
    userGoal: result.extraction.userGoal,
    onboardingStage: result.extraction.onboardingStage,
    sentiment: result.extraction.sentiment,
    status: "draft",
    userActivityAtCall: user?.activity ?? "not_activated",
    extractPromptVersion: result.promptVersion,
    createdBy: operator.email,
  });

  if (result.extraction.issues.length > 0) {
    await db.insert(schema.issues).values(
      result.extraction.issues.map((issue: ExtractedIssue) => ({
        id: randomUUID(),
        callId,
        type: issue.type,
        productArea: issue.productArea,
        severity: issue.severity,
        quote: issue.quote,
        timestampInCall: issue.timestampInCall,
        reviewStatus: "pending" as const,
      })),
    );
  }

  if (result.extraction.followUps.length > 0) {
    await db.insert(schema.followUps).values(
      result.extraction.followUps.map((f) => ({
        id: randomUUID(),
        callId,
        action: f.action,
        owner: f.owner,
        dueDate: f.dueDate,
        done: false,
      })),
    );
  }

  revalidatePath("/calls");
  return { callId };
}

/** R4: approve, reject or edit a single extracted issue. */
export async function setIssueReviewStatus(
  issueId: string,
  status: "approved" | "rejected",
) {
  await requireOperator();
  await db
    .update(schema.issues)
    .set({ reviewStatus: status })
    .where(eq(schema.issues.id, issueId));
  revalidatePath("/calls");
  revalidatePath("/engineering");
  revalidatePath("/digest");
}

export async function editIssue(
  issueId: string,
  patch: Partial<Pick<ExtractedIssue, "type" | "productArea" | "severity" | "quote">>,
) {
  await requireOperator();
  await db.update(schema.issues).set(patch).where(eq(schema.issues.id, issueId));
  revalidatePath("/calls");
}

/** Publishes a call once every issue has been reviewed (approved or rejected). */
export async function publishCall(callId: string) {
  await requireOperator();
  const callIssues = await db.query.issues.findMany({
    where: eq(schema.issues.callId, callId),
  });
  const stillPending = callIssues.some((i) => i.reviewStatus === "pending");
  if (stillPending) {
    throw new Error("Every issue must be approved or rejected before publishing.");
  }

  await db.update(schema.calls).set({ status: "published" }).where(eq(schema.calls.id, callId));
  revalidatePath("/calls");
  revalidatePath("/engineering");
  revalidatePath("/digest");
}

export async function toggleFollowUp(followUpId: string, done: boolean) {
  await requireOperator();
  await db.update(schema.followUps).set({ done }).where(eq(schema.followUps.id, followUpId));
  revalidatePath("/calls");
}
