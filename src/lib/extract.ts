import { extractionSchema, type Extraction } from "./extraction-schema";
import { buildExtractPrompt, EXTRACT_PROMPT_VERSION } from "./extract-prompt";

// One extract() entry point, provider chosen by EXTRACT_PROVIDER so the rest
// of the app never knows which model answered (PRD: "Switch providers
// without code changes").

type Provider = "claude" | "grok";

function getProvider(): Provider {
  const p = (process.env.EXTRACT_PROVIDER ?? "claude").toLowerCase();
  if (p !== "claude" && p !== "grok") {
    throw new Error(`Unknown EXTRACT_PROVIDER "${p}" — expected "claude" or "grok"`);
  }
  return p;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Claude response had no text content");
  return text;
}

async function callGrok(prompt: string): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not set");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL ?? "grok-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Grok API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Grok response had no message content");
  return text;
}

function stripFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
}

export type ExtractResult = {
  extraction: Extraction;
  promptVersion: string;
  provider: Provider;
};

/**
 * Runs the masked transcript through the configured model and validates the
 * result against the fixed schema (R3). Retries once on invalid JSON/schema
 * mismatch before giving up — same shape every time, or a clear error.
 */
export async function extract(maskedTranscript: string): Promise<ExtractResult> {
  const provider = getProvider();
  const call = provider === "claude" ? callClaude : callGrok;
  const prompt = buildExtractPrompt(maskedTranscript);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await call(prompt);
      const parsed = JSON.parse(stripFences(raw));
      const extraction = extractionSchema.parse(parsed);
      return { extraction, promptVersion: EXTRACT_PROMPT_VERSION, provider };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `extract() failed after retry for provider "${provider}": ${String(lastError)}`,
  );
}
