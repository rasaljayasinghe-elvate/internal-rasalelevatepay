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
      signupDate: row.signup_date || undefined,
      kycStatus: row.kyc_status || undefined,
      firstDepositDate: row.first_deposit_date || undefined,
      totalDeposited: toNumeric(row.total_deposited),
      payoutCount: toNumeric(row.payout_count),
      lastActiveDate: row.last_active_date || undefined,
    };
  }).filter((r) => r.userId);
}

// Sheets exports formatted numbers ("$1,500.00"); Postgres numeric wants "1500.00".
function toNumeric(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/[^0-9.-]/g, "");
  return cleaned ? cleaned : undefined;
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
