// Pattern-based redaction (R2). Runs before any model call. Cheap, predictable
// first pass — see "Prove it first" in the PRD for the model-based second pass
// that can be layered on in lib/extract.ts once the patterns are tuned.

export type RedactionMatch = {
  kind: "email" | "phone" | "account_number" | "document_number";
  original: string;
  start: number;
  end: number;
};

export type RedactionResult = {
  masked: string;
  matches: RedactionMatch[];
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Phone numbers: optional +country code, then 7-15 digits with separators.
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/g;

// Bank account / routing numbers and similar: 8+ consecutive digits, optionally
// grouped with spaces or dashes (e.g. account numbers, ACH routing numbers).
const ACCOUNT_NUMBER_RE = /\b(?:\d[\s-]?){8,20}\b/g;

// Document / ID numbers: Sri Lankan NIC (9 digits + V/X, or 12 digits),
// passport-like alphanumeric (1-2 letters + 6-9 digits).
const DOCUMENT_NUMBER_RE = /\b(?:\d{9}[VXvx]|\d{12}|[A-Za-z]{1,2}\d{6,9})\b/g;

function maskValue(kind: RedactionMatch["kind"]): string {
  const tag = kind.toUpperCase();
  return `[REDACTED_${tag}]`;
}

/**
 * Masks emails, phone numbers, account numbers and document/ID numbers.
 * Order matters: emails first (so phone/account patterns don't eat into the
 * local part of an address), then document numbers (the loose phone pattern
 * would otherwise swallow NICs), then phones, then account numbers — each
 * pass only looks at text not already masked.
 */
export function redact(input: string): RedactionResult {
  const matches: RedactionMatch[] = [];
  let masked = input;

  const passes: Array<{ kind: RedactionMatch["kind"]; re: RegExp }> = [
    { kind: "email", re: EMAIL_RE },
    { kind: "document_number", re: DOCUMENT_NUMBER_RE },
    { kind: "phone", re: PHONE_RE },
    { kind: "account_number", re: ACCOUNT_NUMBER_RE },
  ];

  for (const { kind, re } of passes) {
    masked = masked.replace(re, (match, offset: number) => {
      // Skip short numeric incidental matches (e.g. a lone "2026" year) for
      // the account-number pass by requiring at least 8 digits total.
      const digitCount = match.replace(/\D/g, "").length;
      if (kind === "account_number" && digitCount < 8) return match;
      if (kind === "phone" && digitCount < 7) return match;

      matches.push({ kind, original: match, start: offset, end: offset + match.length });
      return maskValue(kind);
    });
  }

  return { masked, matches };
}

/** Lets the operator add extra strings to mask (names, slang for an account id, etc). */
export function applyManualMasks(text: string, extra: string[]): string {
  let out = text;
  for (const term of extra) {
    if (!term.trim()) continue;
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "[REDACTED_MANUAL]");
  }
  return out;
}

/** Human-readable summary of what was masked, shown to the operator (R2). */
export function summarizeRedactions(matches: RedactionMatch[]): string {
  if (matches.length === 0) return "No personal data patterns detected.";
  const counts = matches.reduce<Record<string, number>>((acc, m) => {
    acc[m.kind] = (acc[m.kind] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([kind, count]) => `${count} ${kind.replace(/_/g, " ")}${count > 1 ? "s" : ""}`)
    .join(", ");
}
