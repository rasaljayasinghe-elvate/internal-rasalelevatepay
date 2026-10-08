// Engineering ranking rule (PRD, "The three views"):
// Score = number of distinct users affected × severity weight (S1=3, S2=2, S3=1),
// with a visible boost for issues that hit activated or active users.
// The formula is shown on the page and can be changed — keep this file as the
// single source of truth so the UI and any export stay in sync.

export type Severity = "s1" | "s2" | "s3";
export type UserActivity = "not_activated" | "activated" | "active" | "dormant";

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  s1: 3,
  s2: 2,
  s3: 1,
};

// Multiplies the base score when at least one affected user is activated/active.
export const ACTIVE_USER_BOOST = 1.5;

export type ThemeForScoring = {
  severity: Severity;
  affectedUserIds: string[];
  affectedUserActivity: UserActivity[]; // same length/order as affectedUserIds
};

export type ScoredTheme = ThemeForScoring & {
  distinctUsers: number;
  hasActivatedOrActiveUser: boolean;
  score: number;
};

export function scoreTheme(theme: ThemeForScoring): ScoredTheme {
  const distinctUsers = new Set(theme.affectedUserIds).size;
  const hasActivatedOrActiveUser = theme.affectedUserActivity.some(
    (a) => a === "activated" || a === "active",
  );
  const base = distinctUsers * SEVERITY_WEIGHT[theme.severity];
  const score = hasActivatedOrActiveUser ? base * ACTIVE_USER_BOOST : base;

  return { ...theme, distinctUsers, hasActivatedOrActiveUser, score };
}

export function rankThemes(themes: ThemeForScoring[]): ScoredTheme[] {
  return themes.map(scoreTheme).sort((a, b) => b.score - a.score);
}

export const SCORING_FORMULA_LABEL =
  "Score = distinct users affected × severity weight (S1=3, S2=2, S3=1), ×1.5 if any affected user is activated or active";
