// R5: parse the weekly activity Google Sheet (exported as CSV) and match
// rows to users by ID. Cut-offs for activated/active/dormant are an open
// question in the PRD — defaults here are placeholders to confirm with
// whoever owns analytics (see ACTIVE_WINDOW_DAYS / DORMANT_AFTER_DAYS).

export type ActivitySheetRow = {
  userId: string;
  signupDate?: string;
  kycStatus?: string;
  firstDepositDate?: string;
  totalDeposited?: string;
  payoutCount?: string;
  lastActiveDate?: string;
};

const EXPECTED_HEADERS = [
  "user_id",
  "signup_date",
  "kyc_status",
  "first_deposit_date",
  "total_deposited",
  "payout_count",
  "last_active_date",
] as const;

export function parseActivityCsv(csv: string): ActivitySheetRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const missing = EXPECTED_HEADERS.filter((h) => h !== "user_id" && !header.includes(h));
  if (!header.includes("user_id")) {
    throw new Error('Activity sheet CSV must have a "user_id" column.');
  }
  if (missing.length > 0) {
    // Not fatal — just means some fields will be left null for every row.
    console.warn(`Activity sheet CSV is missing columns: ${missing.join(", ")}`);
  }

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i]?.trim() ?? ""));
    return {
      userId: row.user_id,
      signupDate: toIsoDate(row.signup_date),
      kycStatus: row.kyc_status || undefined,
      firstDepositDate: toIsoDate(row.first_deposit_date),
      totalDeposited: toNumeric(row.total_deposited),
      payoutCount: toInteger(row.payout_count),
      lastActiveDate: toIsoDate(row.last_active_date),
    };
  }).filter((r) => r.userId);
}

// Sheets exports formatted numbers ("$1,500.00"); Postgres numeric wants "1500.00".
function toNumeric(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/[^0-9.-]/g, "");
  if (!cleaned || Number.isNaN(Number(cleaned))) return undefined;
  return cleaned;
}

function toInteger(value: string | undefined): string | undefined {
  const cleaned = toNumeric(value);
  if (!cleaned) return undefined;
  return String(Math.trunc(Number(cleaned)));
}

/** Keep only real calendar dates Postgres will accept. Sheets often uses M/D/YYYY. */
export function toIsoDate(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : (() => {
        const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!mdy) return undefined;
        return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
      })();
  if (!iso) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return iso;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export const ACTIVE_WINDOW_DAYS = 14; // "recent activity" — confirm with analytics owner
export const DORMANT_AFTER_DAYS = 30;

export type UserActivity = "not_activated" | "activated" | "active" | "dormant";

export function deriveActivity(row: ActivitySheetRow, asOf: Date = new Date()): UserActivity {
  if (!row.firstDepositDate) return "not_activated";
  if (!row.lastActiveDate) return "activated";

  const daysSinceActive =
    (asOf.getTime() - new Date(row.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceActive <= ACTIVE_WINDOW_DAYS) return "active";
  if (daysSinceActive > DORMANT_AFTER_DAYS) return "dormant";
  return "activated";
}
