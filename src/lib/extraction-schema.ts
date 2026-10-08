import { z } from "zod";

// Mirrors the data model in the PRD ("Data model and issue taxonomy").
// This is the fixed JSON schema the model's output is validated against —
// invalid output is rejected and retried (see lib/extract.ts).

export const ISSUE_TYPES = [
  "bug",
  "friction",
  "missing_feature",
  "confusion_or_question",
  "praise",
] as const;

export const PRODUCT_AREAS = [
  "signup",
  "verification",
  "funding",
  "holding_usd",
  "payout",
  "pricing_and_fx",
  "card",
  "support",
  "trust_and_safety",
  "other",
] as const;

export const SEVERITIES = ["s1", "s2", "s3"] as const;

export const issueSchema = z.object({
  type: z.enum(ISSUE_TYPES),
  productArea: z.enum(PRODUCT_AREAS),
  severity: z.enum(SEVERITIES),
  quote: z.string().min(1).max(600),
  timestampInCall: z.string().max(20).optional(),
});

export const followUpSchema = z.object({
  action: z.string().min(1).max(300),
  owner: z.string().max(100).optional(),
  dueDate: z.string().optional(), // ISO date string, if the model can infer one
});

export const extractionSchema = z.object({
  summary: z.string().max(900), // ~120 words
  userGoal: z.string().max(300),
  onboardingStage: z.enum(PRODUCT_AREAS),
  sentiment: z.enum(["positive", "neutral", "mixed", "negative"]),
  issues: z.array(issueSchema).max(30),
  featureRequests: z.array(z.string().max(300)).max(20),
  followUps: z.array(followUpSchema).max(20),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type ExtractedIssue = z.infer<typeof issueSchema>;
