"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireOperator } from "@/auth";
import { toIsoDate } from "./activity-sheet";
import { databaseErrorMessage, db, schema } from "./db";
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
  await requireOperator();
  const userId = input.userId.trim();
  if (!userId) return { error: "User ID is required." };
  if (!input.transcript.trim()) return { error: "Transcript is empty." };
  const callDate = toIsoDate(input.callDate);
  if (!callDate) return { error: "Call date must be a real date." };

  const { masked, matches } = redact(input.transcript);
  const fullyMasked = input.manualMasks?.length
    ? applyManualMasks(masked, input.manualMasks)
    : masked;

  let user;
  try {
    user = await db.query.users.findFirst({
      where: eq(schema.users.userId, userId),
    });
  } catch (err) {
    return { error: databaseErrorMessage(err) };
  }

  // Returned rather than thrown: production builds hide thrown server action messages.
  let result: Awaited<ReturnType<typeof extract>>;
  try {
    result = await extract(fullyMasked);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  const callId = randomUUID();
  try {
    // Users not yet in the activity sheet still need a row for the calls FK.
    if (!user) {
      await db.insert(schema.users).values({ userId }).onConflictDoNothing();
    }

    await db.insert(schema.calls).values({
      id: callId,
      userId,
      callDate,
      rawTranscriptMasked: fullyMasked,
      redactionNotes: summarizeRedactions(matches),
      summary: result.extraction.summary,
      userGoal: result.extraction.userGoal,
      onboardingStage: result.extraction.onboardingStage,
      sentiment: result.extraction.sentiment,
      status: "draft",
      userActivityAtCall: user?.activity ?? "not_activated",
      extractPromptVersion: result.promptVersion,
      createdBy: null,
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
          dueDate: toIsoDate(f.dueDate),
          done: false,
        })),
      );
    }
  } catch (err) {
    return { error: databaseErrorMessage(err) };
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
export async function publishCall(callId: string): Promise<{ error?: string }> {
  await requireOperator();
  try {
    const callIssues = await db.query.issues.findMany({
      where: eq(schema.issues.callId, callId),
    });
    const stillPending = callIssues.some((i) => i.reviewStatus === "pending");
    if (stillPending) {
      return { error: "Every issue must be approved or rejected before publishing." };
    }

    await db.update(schema.calls).set({ status: "published" }).where(eq(schema.calls.id, callId));
  } catch (err) {
    return { error: databaseErrorMessage(err) };
  }
  revalidatePath("/calls");
  revalidatePath("/engineering");
  revalidatePath("/digest");
  return {};
}

export async function toggleFollowUp(followUpId: string, done: boolean) {
  await requireOperator();
  await db.update(schema.followUps).set({ done }).where(eq(schema.followUps.id, followUpId));
  revalidatePath("/calls");
}
