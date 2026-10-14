import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import type { MetricoolSnapshot } from "../metricool";
import { relations } from "drizzle-orm";

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

// Which call list the person was uploaded from. Separate from activity,
// which is derived from deposit and last-active dates.
export const callCohortEnum = pgEnum("call_cohort", ["depositors_active", "pending_kyc"]);

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
  cohort: callCohortEnum("cohort"),
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
  cohortAtCall: callCohortEnum("cohort_at_call"),
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

// --- Creators and campaigns ---------------------------------------------

export const creatorDecisionEnum = pgEnum("creator_decision", [
  "buy_now",
  "test",
  "rescope",
  "hold",
  "skipped",
]);

export const socialPlatformEnum = pgEnum("social_platform", [
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
]);

export const platformFitEnum = pgEnum("platform_fit", [
  "strong",
  "ok",
  "weak",
  "unverified",
  "none",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "planning",
  "live",
  "reviewing",
  "closed",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "quoted",
  "confirmed",
  "done",
  "dropped",
]);

export const deliverableFormatEnum = pgEnum("deliverable_format", [
  "reel",
  "video",
  "story",
  "post",
]);

export const deliverableStatusEnum = pgEnum("deliverable_status", [
  "planned",
  "live",
  "missed",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "not_requested",
  "requested",
  "received",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partially_paid",
  "paid",
]);

export const creators = pgTable("creators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  decision: creatorDecisionEnum("decision").notNull().default("hold"),
  notes: text("notes"), // condition or reason behind the decision
  slAudiencePct: numeric("sl_audience_pct"), // share of audience in Sri Lanka, 0–100
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Quoted analytics from the shortlist, not live campaign results.
export const creatorPlatforms = pgTable("creator_platforms", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "cascade" }),
  platform: socialPlatformEnum("platform").notNull(),
  handle: text("handle"),
  profileUrl: text("profile_url"),
  insightsUrl: text("insights_url"), // link to insights screenshots the creator shared
  followers: integer("followers"),
  avgViews: integer("avg_views"),
  engagementPct: numeric("engagement_pct"),
  fit: platformFitEnum("fit").notNull().default("unverified"),
});

export const creatorRates = pgTable("creator_rates", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  amountLkr: numeric("amount_lkr"),
  amountUsd: numeric("amount_usd"),
  includes: text("includes"),
});

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: campaignStatusEnum("status").notNull().default("planning"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  // Metricool brand (blogId). The API token stays in the server environment.
  metricoolBlogId: text("metricool_blog_id"),
  metricoolSnapshot: jsonb("metricool_snapshot").$type<MetricoolSnapshot | null>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const campaignCreators = pgTable(
  "campaign_creators",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    creatorId: text("creator_id")
      .notNull()
      .references(() => creators.id, { onDelete: "cascade" }),
    rateId: text("rate_id").references(() => creatorRates.id, { onDelete: "set null" }),
    agreedLkr: numeric("agreed_lkr"),
    status: bookingStatusEnum("status").notNull().default("quoted"),
    signups: integer("signups"),
    kycCompletions: integer("kyc_completions"),
    firstDeposits: integer("first_deposits"),
    notes: text("notes"),
    // An agreed creator being produced, as opposed to a quote still on the plan.
    lodged: boolean("lodged").notNull().default(false),
    briefSent: boolean("brief_sent").notNull().default(false),
    draftApproved: boolean("draft_approved").notNull().default(false),
    posted: boolean("posted").notNull().default(false),
    goLiveDate: date("go_live_date"),
    deliverableSummary: text("deliverable_summary"),
    emailUrl: text("email_url"),
    invoiceStatus: invoiceStatusEnum("invoice_status").notNull().default("not_requested"),
    paymentStatus: paymentStatusEnum("payment_status"),
    paidDate: date("paid_date"),
    paymentRef: text("payment_ref"),
  },
  (t) => [unique("campaign_creator_unique").on(t.campaignId, t.creatorId)],
);

export const deliverables = pgTable("deliverables", {
  id: text("id").primaryKey(),
  campaignCreatorId: text("campaign_creator_id")
    .notNull()
    .references(() => campaignCreators.id, { onDelete: "cascade" }),
  platform: socialPlatformEnum("platform").notNull(),
  format: deliverableFormatEnum("format").notNull(),
  status: deliverableStatusEnum("status").notNull().default("planned"),
  dueDate: date("due_date"),
  postUrl: text("post_url"),
  insightsUrl: text("insights_url"),
  views: integer("views"),
  likes: integer("likes"),
  comments: integer("comments"),
});

export const creatorsRelations = relations(creators, ({ many }) => ({
  platforms: many(creatorPlatforms),
  rates: many(creatorRates),
  bookings: many(campaignCreators),
}));

export const creatorPlatformsRelations = relations(creatorPlatforms, ({ one }) => ({
  creator: one(creators, { fields: [creatorPlatforms.creatorId], references: [creators.id] }),
}));

export const creatorRatesRelations = relations(creatorRates, ({ one }) => ({
  creator: one(creators, { fields: [creatorRates.creatorId], references: [creators.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  bookings: many(campaignCreators),
}));

export const campaignCreatorsRelations = relations(campaignCreators, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [campaignCreators.campaignId], references: [campaigns.id] }),
  creator: one(creators, { fields: [campaignCreators.creatorId], references: [creators.id] }),
  rate: one(creatorRates, { fields: [campaignCreators.rateId], references: [creatorRates.id] }),
  deliverables: many(deliverables),
}));

export const deliverablesRelations = relations(deliverables, ({ one }) => ({
  booking: one(campaignCreators, {
    fields: [deliverables.campaignCreatorId],
    references: [campaignCreators.id],
  }),
}));
