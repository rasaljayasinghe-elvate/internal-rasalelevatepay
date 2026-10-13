// Labels and derived numbers for creators and campaigns. Every metric is
// computed from figures typed in by hand; nothing is attributed from the
// activity sheet yet.

export const DECISION_ORDER = ["buy_now", "test", "rescope", "hold", "skipped"];

export const DECISION_LABEL: Record<string, string> = {
  buy_now: "Buy now",
  test: "Test",
  rescope: "Re-scope",
  hold: "Hold",
  skipped: "Skipped",
};

export const DECISION_STYLE: Record<string, string> = {
  buy_now: "bg-green-100 text-green-800",
  test: "bg-brand-50 text-brand",
  rescope: "bg-amber-100 text-amber-800",
  hold: "bg-neutral-100 text-neutral-700",
  skipped: "bg-neutral-100 text-neutral-500",
};

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
};

export const FIT_LABEL: Record<string, string> = {
  strong: "Strong",
  ok: "OK",
  weak: "Weak",
  unverified: "Unverified",
  none: "None found",
};

export const FIT_STYLE: Record<string, string> = {
  strong: "bg-green-100 text-green-800",
  ok: "bg-brand-50 text-brand",
  weak: "bg-amber-100 text-amber-800",
  unverified: "bg-neutral-100 text-neutral-700",
  none: "bg-neutral-100 text-neutral-400",
};

export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  live: "Live",
  reviewing: "Reviewing",
  closed: "Closed",
};

export const CAMPAIGN_STATUS_STYLE: Record<string, string> = {
  planning: "bg-neutral-100 text-neutral-700",
  live: "bg-green-100 text-green-800",
  reviewing: "bg-amber-100 text-amber-800",
  closed: "bg-neutral-100 text-neutral-500",
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  quoted: "Quoted",
  confirmed: "Confirmed",
  done: "Done",
  dropped: "Dropped",
};

export const FORMAT_LABEL: Record<string, string> = {
  reel: "Reel",
  video: "Video",
  story: "Story",
  post: "Post",
};

export const DELIVERABLE_STATUS_LABEL: Record<string, string> = {
  planned: "Planned",
  live: "Live",
  missed: "Missed",
};

export const DELIVERABLE_STATUS_STYLE: Record<string, string> = {
  planned: "bg-neutral-100 text-neutral-700",
  live: "bg-green-100 text-green-800",
  missed: "bg-red-100 text-red-800",
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  not_requested: "Not requested",
  requested: "Requested",
  received: "Received",
};

export const INVOICE_STATUS_STYLE: Record<string, string> = {
  not_requested: "bg-neutral-100 text-neutral-700",
  requested: "bg-amber-100 text-amber-800",
  received: "bg-green-100 text-green-800",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  "": "Unknown",
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
};

export const PAYMENT_STATUS_STYLE: Record<string, string> = {
  unpaid: "bg-red-100 text-red-800",
  partially_paid: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
};

type LodgeBooking = {
  status: string;
  lodged: boolean;
  briefSent: boolean;
  draftApproved: boolean;
  posted: boolean;
  invoiceStatus: string;
  paymentStatus: string | null;
};

export type LodgeProgress = {
  lodged: number;
  briefSent: number;
  draftApproved: number;
  posted: number;
  invoicesOut: number;
  unpaid: number;
};

/** Counts for creators who have been lodged onto the campaign. */
export function lodgeProgress(bookings: LodgeBooking[]): LodgeProgress {
  const rows = bookings.filter((b) => b.lodged && b.status !== "dropped");
  return {
    lodged: rows.length,
    briefSent: rows.filter((b) => b.briefSent).length,
    draftApproved: rows.filter((b) => b.draftApproved).length,
    posted: rows.filter((b) => b.posted).length,
    invoicesOut: rows.filter((b) => b.invoiceStatus === "requested").length,
    unpaid: rows.filter((b) => b.paymentStatus !== "paid").length,
  };
}

export function lodgeSummary(progress: LodgeProgress): string | null {
  if (progress.lodged === 0) return null;
  return `${progress.briefSent}/${progress.lodged} briefed · ${progress.posted}/${progress.lodged} posted`;
}

type DeliverableLike = { status: string; views: number | null };
type BookingLike = {
  status: string;
  agreedLkr: string | null;
  signups: number | null;
  kycCompletions: number | null;
  firstDeposits: number | null;
  deliverables: DeliverableLike[];
};

export type BookingMetrics = {
  spendLkr: number | null;
  promised: number;
  live: number;
  missed: number;
  views: number | null;
  costPer1kViews: number | null;
  costPerSignup: number | null;
};

export function bookingMetrics(b: BookingLike): BookingMetrics {
  const spendLkr = toNumber(b.agreedLkr);
  const live = b.deliverables.filter((d) => d.status === "live");
  const views = sumOrNull(live.map((d) => d.views));
  return {
    spendLkr,
    promised: b.deliverables.length,
    live: live.length,
    missed: b.deliverables.filter((d) => d.status === "missed").length,
    views,
    costPer1kViews: spendLkr != null && views ? (spendLkr / views) * 1000 : null,
    costPerSignup: spendLkr != null && b.signups ? spendLkr / b.signups : null,
  };
}

export type CampaignTotals = BookingMetrics & {
  creators: number;
  signups: number | null;
  kycCompletions: number | null;
  firstDeposits: number | null;
};

/**
 * Dropped bookings are left out of spend, delivery and results. Cost per
 * view and per signup only count the spend of creators who have that
 * result, so one early post isn't divided by the whole campaign budget.
 */
export function campaignTotals(bookings: BookingLike[]): CampaignTotals {
  const active = bookings.filter((b) => b.status !== "dropped");
  const per = active.map(bookingMetrics);
  const views = sumOrNull(per.map((m) => m.views));
  const signups = sumOrNull(active.map((b) => b.signups));
  const spendWithViews = sumOrNull(per.filter((m) => m.views).map((m) => m.spendLkr));
  const spendWithSignups = sumOrNull(
    active.filter((b) => b.signups).map((b) => toNumber(b.agreedLkr)),
  );
  return {
    creators: active.length,
    spendLkr: sumOrNull(per.map((m) => m.spendLkr)),
    promised: per.reduce((n, m) => n + m.promised, 0),
    live: per.reduce((n, m) => n + m.live, 0),
    missed: per.reduce((n, m) => n + m.missed, 0),
    views,
    costPer1kViews: spendWithViews != null && views ? (spendWithViews / views) * 1000 : null,
    signups,
    kycCompletions: sumOrNull(active.map((b) => b.kycCompletions)),
    firstDeposits: sumOrNull(active.map((b) => b.firstDeposits)),
    costPerSignup: spendWithSignups != null && signups ? spendWithSignups / signups : null,
  };
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Null when every value is missing, so an untracked result shows a dash rather than 0. */
function sumOrNull(values: (number | string | null | undefined)[]): number | null {
  const nums = values.map(toNumber).filter((n): n is number => n != null);
  return nums.length === 0 ? null : nums.reduce((a, b) => a + b, 0);
}

export function dateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "No dates set";
  if (start && end) return `${start} to ${end}`;
  return start ? `From ${start}` : `Until ${end}`;
}

export function formatLkr(value: string | number | null | undefined): string {
  const n = toNumber(value);
  return n == null ? "–" : `LKR ${Math.round(n).toLocaleString("en-US")}`;
}

export function formatUsd(value: string | number | null | undefined): string {
  const n = toNumber(value);
  return n == null ? "–" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatCount(value: string | number | null | undefined): string {
  const n = toNumber(value);
  if (n == null) return "–";
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}K`;
  return String(n);
}

export function formatPct(value: string | number | null | undefined): string {
  const n = toNumber(value);
  return n == null ? "–" : `${trim(n)}%`;
}

function trim(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}
