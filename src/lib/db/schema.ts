import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";

// --- Enums -------------------------------------------------------------

export const callStatusEnum = pgEnum("call_status", [
  "draft",
  "reviewed",
  "published",
]);

export const issueTypeEnum = pgEnum("issue_type", [
  "bug",
  "friction",
  "missing_feature",
  "confusion_or_question",
  "praise",
]);

export const productAreaEnum = pgEnum("product_area", [
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
]);

export const severityEnum = pgEnum("severity", ["s1", "s2", "s3"]);

export const issueReviewStatusEnum = pgEnum("issue_review_status", [
  "pending",
  "approved",
  "rejected",
]);

export const userActivityEnum = pgEnum("user_activity", [
  "not_activated",
  "activated",
  "active",
  "dormant",
]);

export const roleEnum = pgEnum("role", ["operator", "reader"]);

// --- Operators / readers (people signing in to the tool) --------------

export const operators = pgTable("operators", {
  id: text("id").primaryKey(), // lowercased email, used as the stable id
  email: text("email").notNull().unique(),
  name: text("name"),
  role: roleEnum("role").notNull().default("reader"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- End users of Elevate Pay (joined from the weekly activity sheet) -

export const users = pgTable("users", {
  // Elevate Pay user ID — the join key with the weekly activity sheet
  userId: text("user_id").primaryKey(),
  signupDate: date("signup_date"),
  kycStatus: text("kyc_status"),
  firstDepositDate: date("first_deposit_date"),
  totalDeposited: numeric("total_deposited"),
  payoutCount: integer("payout_count"),
  lastActiveDate: date("last_active_date"),
  activity: userActivityEnum("activity").notNull().default("not_activated"),
  snapshotDate: date("snapshot_date"), // date of the activity sheet row this came from
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Calls --------------------------------------------------------------

export const calls = pgTable("calls", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.userId),
  callDate: date("call_date").notNull(),
  rawTranscriptMasked: text("raw_transcript_masked").notNull(), // redacted transcript only; raw text is never stored
  redactionNotes: text("redaction_notes"), // what was masked, shown to the operator
  summary: text("summary"),
  userGoal: text("user_goal"),
  onboardingStage: productAreaEnum("onboarding_stage"),
  sentiment: text("sentiment"),
  status: callStatusEnum("status").notNull().default("draft"),
  userActivityAtCall: userActivityEnum("user_activity_at_call"),
  extractPromptVersion: text("extract_prompt_version"),
  createdBy: text("created_by").references(() => operators.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Themes (cross-call grouping, R9) -----------------------------------

export const themes = pgTable("themes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  owner: text("owner"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Issues ---------------------------------------------------------------

export const issues = pgTable("issues", {
  id: text("id").primaryKey(),
  callId: text("call_id")
    .notNull()
    .references(() => calls.id),
  type: issueTypeEnum("type").notNull(),
  productArea: productAreaEnum("product_area").notNull(),
  severity: severityEnum("severity").notNull(),
  quote: text("quote").notNull(), // verbatim, redacted quote from the transcript
  timestampInCall: text("timestamp_in_call"), // free-form, e.g. "12:34"
  reviewStatus: issueReviewStatusEnum("review_status").notNull().default("pending"),
  themeId: text("theme_id").references(() => themes.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Follow-ups -------------------------------------------------------------

export const followUps = pgTable("follow_ups", {
  id: text("id").primaryKey(),
  callId: text("call_id")
    .notNull()
    .references(() => calls.id),
  action: text("action").notNull(),
  owner: text("owner"),
  dueDate: date("due_date"),
  done: boolean("done").notNull().default(false),
});
