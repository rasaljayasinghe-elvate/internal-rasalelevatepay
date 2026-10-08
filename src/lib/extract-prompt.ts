// Versioned so a prompt change can be re-run on past calls (see PRD, "Prove it first").
export const EXTRACT_PROMPT_VERSION = "v1";

export function buildExtractPrompt(maskedTranscript: string): string {
  return `You are reading a redacted call transcript between an Elevate Pay growth operator and a user. Personal data has already been masked as [REDACTED_*] tokens — never try to guess or reconstruct what they were.

Extract a structured result as JSON matching exactly this shape:
{
  "summary": string (120 words or fewer),
  "userGoal": string,
  "onboardingStage": one of "signup" | "verification" | "funding" | "holding_usd" | "payout" | "pricing_and_fx" | "card" | "support" | "trust_and_safety" | "other",
  "sentiment": one of "positive" | "neutral" | "mixed" | "negative",
  "issues": array of {
    "type": one of "bug" | "friction" | "missing_feature" | "confusion_or_question" | "praise",
    "productArea": same enum as onboardingStage,
    "severity": "s1" (blocks onboarding or moving money) | "s2" (major friction or workaround needed) | "s3" (minor),
    "quote": a verbatim quote from the transcript supporting this issue (keep any [REDACTED_*] tokens as-is, do not remove them),
    "timestampInCall": optional, e.g. "12:34" if the transcript carries timestamps
  },
  "featureRequests": array of strings,
  "followUps": array of { "action": string, "owner": string (optional), "dueDate": string (optional, ISO date) }
}

Rules:
- Every issue must carry a verbatim quote from the transcript below. Never invent a quote.
- Keep [REDACTED_*] tokens exactly as they appear in any quote you extract.
- Return ONLY the JSON object, no prose, no markdown fences.

Transcript (redacted):
"""
${maskedTranscript}
"""`;
}
