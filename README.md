# Call Insights Tool — Elevate Pay

Turns ~10 weekly user calls into structured summaries, a weekly manager
digest, and a ranked issue list for engineering. See the PRD this was built
from for the full picture; this README covers running it locally.

Version 1 is for one operator and two readers (manager, engineering).
Transcripts are pasted in by hand (Granola is on the free plan, no API
export) and personal data is redacted before anything reaches a model.

## Stack

- **App**: Next.js (App Router) on Vercel
- **Database**: Neon Postgres via Drizzle ORM
- **Auth**: NextAuth (email + shared password), restricted to one company domain
- **Model**: `extract()` in `src/lib/extract.ts`, switches between Claude and
  Grok via `EXTRACT_PROVIDER` — no code changes to swap providers
- **Secrets**: environment variables (Doppler recommended for the team)

## Getting started

```bash
cp .env.example .env.local
# fill in DATABASE_URL (a Neon branch), AUTH_SECRET, AUTH_PASSWORD,
# ALLOWED_EMAIL_DOMAIN, OPERATOR_EMAILS, and one model provider's key

npm install
npm run db:push    # creates tables from src/lib/db/schema.ts
npm run db:seed    # optional: a few sample users for local testing
npm run dev
```

### Deploying on Netlify

In **Site configuration → Environment variables**, set at least:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string; run `npm run db:push` against it once |
| `AUTH_SECRET` | `openssl rand -base64 32` or `npx auth secret` |
| `AUTH_PASSWORD` | Shared team password for sign-in |
| `ALLOWED_EMAIL_DOMAIN` | e.g. `your-company.com` — only `*@domain` can sign in |
| `OPERATOR_EMAILS` | Comma-separated operator emails |

Redeploy after saving env vars. If Netlify secret scanning fails on
`ALLOWED_EMAIL_DOMAIN`, either unmark it as a **secret** in the Netlify UI (it is
not sensitive) or rely on `netlify.toml` `SECRETS_SCAN_OMIT_KEYS` in this repo.

Roles: everyone on `ALLOWED_GOOGLE_DOMAIN` can sign in and read; only
`OPERATOR_EMAILS` can add calls, review/publish, and upload the activity sheet
(enforced in `src/lib/actions.ts` and the upload route, not just hidden in the UI).

## Brand

Colours, logo mark and type follow the Elevate Pay brand guidelines: navy
`#0F0F31`, blue `#3536FD`, white (tokens in `src/app/globals.css`), and the
mark is redrawn as SVG in `src/components/Logo.tsx` / `src/app/icon.svg`.

Söhne is a licensed font, so it isn't bundled — the font stack uses it when
it's installed and falls back to Inter. To ship it, add the licensed `.woff2`
files under `src/app/fonts/` and load them with `next/font/local` in
`src/app/layout.tsx` (Buch 400, Kräftig 500, Halbfett 600, Dreiviertelfett 700,
Fett 800).

## How it maps to the PRD

| PRD requirement | Where |
| --- | --- |
| R1 Paste transcript, pick user/date | `src/app/calls/new` |
| R2 Redact before any model call | `src/lib/redact.ts` |
| R3 Structured extraction | `src/lib/extract.ts`, `src/lib/extraction-schema.ts` |
| R4 Review: edit/approve/reject | `src/app/calls/[id]`, `src/lib/actions.ts` |
| R5 Weekly activity CSV upload | `src/app/activity`, `src/lib/activity-sheet.ts` |
| R6 Per-call page | `src/app/calls/[id]` |
| R7 Manager digest | `src/app/digest`, `src/lib/digest.ts` |
| R8 Engineering list, ranked, exportable | `src/app/engineering`, `src/lib/engineering.ts`, `src/lib/scoring.ts` |

R9–R13 (theme merging across calls, trends, Slack/Notion posting, ticket
creation, search) and R14–R16 (automatic Granola import, automatic activity
sync, multiple operators) are not built — they're P1/P2 in the PRD. The
engineering list currently groups issues by `(type, productArea)` as a
stand-in for full theme merging.

## Before relying on this for real calls

The PRD's "Prove it first" step still applies: run 3–5 real redacted
transcripts through `extract()`, compare the output against your own read of
the call, and adjust `src/lib/extract-prompt.ts` (it's versioned —
`EXTRACT_PROMPT_VERSION` — so a change can be re-run against past calls).

Also confirm, per the PRD's open questions, before going further:
- Where engineering actually tracks work (for R12)
- Who owns the activity Sheet and whether `user_id` is stable
- That the chosen model vendor is approved for user transcripts, and its
  retention/training terms (use the no-retention setting if offered)
- Retention period for redacted transcripts
- The cut-offs for activated/active/dormant — placeholders are in
  `src/lib/activity-sheet.ts` (`ACTIVE_WINDOW_DAYS`, `DORMANT_AFTER_DAYS`)
