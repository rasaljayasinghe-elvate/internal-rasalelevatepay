"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { requireOperator } from "@/auth";
import { toIsoDate } from "./activity-sheet";
import { databaseErrorMessage, db, schema } from "./db";
import { metricoolConfig, pullBrandTotals } from "./metricool";

// Every action takes (previous state, FormData) so forms can use
// useActionState and show the returned error. Errors are returned, not
// thrown: production builds hide thrown server action messages.
export type ActionState = { error?: string; ok?: boolean } | null;

class InputError extends Error {}

function text(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function required(fd: FormData, name: string, label: string): string {
  const v = text(fd, name);
  if (!v) throw new InputError(`${label} is required.`);
  return v;
}

function oneOf<T extends string>(fd: FormData, name: string, values: readonly T[], label: string): T {
  const v = text(fd, name);
  if (!v || !(values as readonly string[]).includes(v)) {
    throw new InputError(`Pick a valid ${label}.`);
  }
  return v as T;
}

/** Accepts "12,400", "12.4k" or "1.2M". */
function number(fd: FormData, name: string, label: string): number | null {
  const raw = text(fd, name)?.replace(/,/g, "").toLowerCase();
  if (!raw) return null;
  const m = raw.match(/^(-?\d*\.?\d+)\s*([km])?$/);
  if (!m) throw new InputError(`${label} must be a number.`);
  const scale = m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1;
  return Number(m[1]) * scale;
}

function integer(fd: FormData, name: string, label: string): number | null {
  const n = number(fd, name, label);
  return n == null ? null : Math.round(n);
}

function numeric(fd: FormData, name: string, label: string): string | null {
  const n = number(fd, name, label);
  return n == null ? null : String(n);
}

function isoDate(fd: FormData, name: string, label: string): string | null {
  const raw = text(fd, name);
  if (!raw) return null;
  const d = toIsoDate(raw);
  if (!d) throw new InputError(`${label} must be a real date.`);
  return d;
}

/** Only http(s) links, since these are rendered as clickable hrefs. */
function link(fd: FormData, name: string, label: string): string | null {
  const raw = text(fd, name);
  if (!raw) return null;
  const withScheme = /^[a-z]+:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {}
  throw new InputError(`${label} must be a web link.`);
}

function checked(fd: FormData, name: string): boolean {
  const v = fd.get(name);
  return v === "on" || v === "true" || v === "1";
}

function optionalOneOf<T extends string>(
  fd: FormData,
  name: string,
  values: readonly T[],
  label: string,
): T | null {
  const v = text(fd, name);
  if (!v) return null;
  if (!(values as readonly string[]).includes(v)) throw new InputError(`Pick a valid ${label}.`);
  return v as T;
}

async function run(work: () => Promise<void>, paths: string[]): Promise<ActionState> {
  await requireOperator();
  try {
    await work();
  } catch (err) {
    if (err instanceof InputError) return { error: err.message };
    return { error: databaseErrorMessage(err) };
  }
  // "layout" so detail pages under each path refresh too.
  for (const p of paths) revalidatePath(p, "layout");
  return { ok: true };
}

const DECISIONS = schema.creatorDecisionEnum.enumValues;
const PLATFORMS = schema.socialPlatformEnum.enumValues;
const FITS = schema.platformFitEnum.enumValues;
const CAMPAIGN_STATUSES = schema.campaignStatusEnum.enumValues;
const BOOKING_STATUSES = schema.bookingStatusEnum.enumValues;
const FORMATS = schema.deliverableFormatEnum.enumValues;
const DELIVERABLE_STATUSES = schema.deliverableStatusEnum.enumValues;
const INVOICE_STATUSES = schema.invoiceStatusEnum.enumValues;
const PAYMENT_STATUSES = schema.paymentStatusEnum.enumValues;

// --- Creators -------------------------------------------------------------

function creatorFields(fd: FormData) {
  return {
    name: required(fd, "name", "Name"),
    decision: oneOf(fd, "decision", DECISIONS, "decision"),
    notes: text(fd, "notes"),
    slAudiencePct: numeric(fd, "slAudiencePct", "Audience in Sri Lanka"),
  };
}

export async function createCreator(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = randomUUID();
  const result = await run(async () => {
    await db.insert(schema.creators).values({ id, ...creatorFields(fd) });
  }, ["/creators"]);
  if (result?.error) return result;
  redirect(`/creators/${id}`);
}

export async function updateCreator(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = required(fd, "id", "Creator");
    await db.update(schema.creators).set(creatorFields(fd)).where(eq(schema.creators.id, id));
  }, ["/creators", "/campaigns"]);
}

export async function deleteCreator(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await run(async () => {
    await db.delete(schema.creators).where(eq(schema.creators.id, required(fd, "id", "Creator")));
  }, ["/creators", "/campaigns"]);
  if (result?.error) return result;
  redirect("/creators");
}

// --- Platform profiles ----------------------------------------------------

function platformFields(fd: FormData) {
  return {
    platform: oneOf(fd, "platform", PLATFORMS, "platform"),
    handle: text(fd, "handle"),
    profileUrl: link(fd, "profileUrl", "Profile link"),
    insightsUrl: link(fd, "insightsUrl", "Insights link"),
    followers: integer(fd, "followers", "Followers"),
    avgViews: integer(fd, "avgViews", "Average views"),
    engagementPct: numeric(fd, "engagementPct", "Engagement"),
    fit: oneOf(fd, "fit", FITS, "fit"),
  };
}

export async function addPlatform(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db.insert(schema.creatorPlatforms).values({
      id: randomUUID(),
      creatorId: required(fd, "creatorId", "Creator"),
      ...platformFields(fd),
    });
  }, ["/creators"]);
}

export async function updatePlatform(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .update(schema.creatorPlatforms)
      .set(platformFields(fd))
      .where(eq(schema.creatorPlatforms.id, required(fd, "id", "Platform")));
  }, ["/creators"]);
}

export async function deletePlatform(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .delete(schema.creatorPlatforms)
      .where(eq(schema.creatorPlatforms.id, required(fd, "id", "Platform")));
  }, ["/creators"]);
}

// --- Quoted rates ---------------------------------------------------------

function rateFields(fd: FormData) {
  return {
    label: required(fd, "label", "Package"),
    amountLkr: numeric(fd, "amountLkr", "LKR amount"),
    amountUsd: numeric(fd, "amountUsd", "USD amount"),
    includes: text(fd, "includes"),
  };
}

export async function addRate(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db.insert(schema.creatorRates).values({
      id: randomUUID(),
      creatorId: required(fd, "creatorId", "Creator"),
      ...rateFields(fd),
    });
  }, ["/creators"]);
}

export async function updateRate(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .update(schema.creatorRates)
      .set(rateFields(fd))
      .where(eq(schema.creatorRates.id, required(fd, "id", "Package")));
  }, ["/creators", "/campaigns"]);
}

export async function deleteRate(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db.delete(schema.creatorRates).where(eq(schema.creatorRates.id, required(fd, "id", "Package")));
  }, ["/creators", "/campaigns"]);
}

// --- Campaigns ------------------------------------------------------------

function campaignFields(fd: FormData) {
  const startDate = isoDate(fd, "startDate", "Start date");
  const endDate = isoDate(fd, "endDate", "End date");
  if (startDate && endDate && endDate < startDate) {
    throw new InputError("End date is before the start date.");
  }
  const blogId = text(fd, "metricoolBlogId");
  if (blogId && !/^\d+$/.test(blogId)) {
    throw new InputError("Metricool brand id is the number in the brand URL.");
  }
  return {
    name: required(fd, "name", "Name"),
    status: oneOf(fd, "status", CAMPAIGN_STATUSES, "status"),
    startDate,
    endDate,
    notes: text(fd, "notes"),
    metricoolBlogId: blogId,
  };
}

export async function createCampaign(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = randomUUID();
  const result = await run(async () => {
    await db.insert(schema.campaigns).values({ id, ...campaignFields(fd) });
  }, ["/campaigns"]);
  if (result?.error) return result;
  redirect(`/campaigns/${id}`);
}

export async function updateCampaign(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .update(schema.campaigns)
      .set(campaignFields(fd))
      .where(eq(schema.campaigns.id, required(fd, "id", "Campaign")));
  }, ["/campaigns", "/creators"]);
}

export async function deleteCampaign(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await run(async () => {
    await db.delete(schema.campaigns).where(eq(schema.campaigns.id, required(fd, "id", "Campaign")));
  }, ["/campaigns", "/creators"]);
  if (result?.error) return result;
  redirect("/campaigns");
}

// --- Creators on a campaign -----------------------------------------------

export async function addBooking(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const campaignId = required(fd, "campaignId", "Campaign");
    const creatorId = required(fd, "creatorId", "Creator");
    const rateId = text(fd, "rateId");
    let agreedLkr = numeric(fd, "agreedLkr", "Agreed LKR");

    const existing = await db.query.campaignCreators.findFirst({
      where: and(
        eq(schema.campaignCreators.campaignId, campaignId),
        eq(schema.campaignCreators.creatorId, creatorId),
      ),
    });
    if (existing) throw new InputError("That creator is already on this campaign.");

    if (rateId) {
      const rate = await db.query.creatorRates.findFirst({
        where: eq(schema.creatorRates.id, rateId),
      });
      if (!rate || rate.creatorId !== creatorId) {
        throw new InputError("That package belongs to a different creator.");
      }
      agreedLkr ??= rate.amountLkr;
    }

    await db.insert(schema.campaignCreators).values({
      id: randomUUID(),
      campaignId,
      creatorId,
      rateId,
      agreedLkr,
      status: "quoted",
    });
  }, ["/campaigns", "/creators"]);
}

function lodgeFields(fd: FormData) {
  const goLiveDate = isoDate(fd, "goLiveDate", "Go-live date");
  const paidDate = isoDate(fd, "paidDate", "Paid date");
  return {
    briefSent: checked(fd, "briefSent"),
    draftApproved: checked(fd, "draftApproved"),
    posted: checked(fd, "posted"),
    goLiveDate,
    deliverableSummary: text(fd, "deliverableSummary"),
    emailUrl: link(fd, "emailUrl", "Email thread"),
    invoiceStatus: oneOf(fd, "invoiceStatus", INVOICE_STATUSES, "invoice status"),
    paymentStatus: optionalOneOf(fd, "paymentStatus", PAYMENT_STATUSES, "payment status"),
    paidDate,
    paymentRef: text(fd, "paymentRef"),
    notes: text(fd, "notes"),
  };
}

/** Records a creator as agreed and in production: brief, draft, post, invoice, payment. */
export async function saveLodge(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = required(fd, "id", "Booking");
    const booking = await db.query.campaignCreators.findFirst({
      where: eq(schema.campaignCreators.id, id),
    });
    if (!booking) throw new InputError("That creator is not on this campaign.");

    const fields = lodgeFields(fd);
    await db
      .update(schema.campaignCreators)
      .set({
        ...fields,
        lodged: true,
        status: booking.status === "quoted" ? "confirmed" : booking.status,
      })
      .where(eq(schema.campaignCreators.id, id));

    if (fields.goLiveDate) {
      await db
        .update(schema.deliverables)
        .set({ dueDate: fields.goLiveDate })
        .where(and(eq(schema.deliverables.campaignCreatorId, id), isNull(schema.deliverables.dueDate)));
    }
  }, ["/", "/campaigns", "/creators"]);
}

export async function unlodgeBooking(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .update(schema.campaignCreators)
      .set({ lodged: false })
      .where(eq(schema.campaignCreators.id, required(fd, "id", "Booking")));
  }, ["/", "/campaigns"]);
}

export async function refreshMetricool(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const id = required(fd, "id", "Campaign");
    const config = metricoolConfig();
    if (!config.configured) {
      throw new InputError(
        "Add METRICOOL_TOKEN and METRICOOL_USER_ID on the server. The token is in Metricool under Account settings, API.",
      );
    }

    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, id),
      with: { bookings: { with: { deliverables: true } } },
    });
    if (!campaign) throw new InputError("Campaign not found.");

    const blogId = campaign.metricoolBlogId || config.blogId;
    if (!blogId) {
      throw new InputError("Add the Metricool brand id on this campaign. It is the blogId in the brand URL.");
    }

    const today = new Date().toISOString().slice(0, 10);
    const goLives = campaign.bookings
      .map((b) => b.goLiveDate)
      .filter((d): d is string => !!d)
      .sort();
    const from = campaign.startDate ?? goLives[0] ?? addIsoDays(today, -30);
    const end = campaign.endDate ?? goLives.at(-1) ?? today;
    const to = end < today ? end : today;
    const networks = [
      ...new Set(
        campaign.bookings
          .filter((b) => b.status !== "dropped")
          .flatMap((b) => b.deliverables.map((d) => d.platform)),
      ),
    ];

    const snapshot = await pullBrandTotals({ blogId, from, to: to < from ? from : to, networks });
    await db.update(schema.campaigns).set({ metricoolSnapshot: snapshot }).where(eq(schema.campaigns.id, id));
    if (snapshot.error && snapshot.series.length === 0) throw new InputError(snapshot.error);
  }, ["/", "/campaigns"]);
}

function addIsoDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function updateBooking(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .update(schema.campaignCreators)
      .set({
        status: oneOf(fd, "status", BOOKING_STATUSES, "booking status"),
        agreedLkr: numeric(fd, "agreedLkr", "Agreed LKR"),
        signups: integer(fd, "signups", "Signups"),
        kycCompletions: integer(fd, "kycCompletions", "KYC completions"),
        firstDeposits: integer(fd, "firstDeposits", "First deposits"),
        notes: text(fd, "notes"),
      })
      .where(eq(schema.campaignCreators.id, required(fd, "id", "Booking")));
  }, ["/campaigns", "/creators"]);
}

export async function removeBooking(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .delete(schema.campaignCreators)
      .where(eq(schema.campaignCreators.id, required(fd, "id", "Booking")));
  }, ["/campaigns", "/creators"]);
}

// --- Deliverables ---------------------------------------------------------

function deliverableFields(fd: FormData) {
  return {
    platform: oneOf(fd, "platform", PLATFORMS, "platform"),
    format: oneOf(fd, "format", FORMATS, "format"),
    status: oneOf(fd, "status", DELIVERABLE_STATUSES, "status"),
    dueDate: isoDate(fd, "dueDate", "Due date"),
    postUrl: link(fd, "postUrl", "Post link"),
    insightsUrl: link(fd, "insightsUrl", "Insights link"),
    views: integer(fd, "views", "Views"),
    likes: integer(fd, "likes", "Likes"),
    comments: integer(fd, "comments", "Comments"),
  };
}

export async function addDeliverable(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db.insert(schema.deliverables).values({
      id: randomUUID(),
      campaignCreatorId: required(fd, "campaignCreatorId", "Booking"),
      ...deliverableFields(fd),
    });
  }, ["/campaigns"]);
}

export async function updateDeliverable(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .update(schema.deliverables)
      .set(deliverableFields(fd))
      .where(eq(schema.deliverables.id, required(fd, "id", "Deliverable")));
  }, ["/campaigns"]);
}

export async function setDeliverableStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .update(schema.deliverables)
      .set({ status: oneOf(fd, "status", DELIVERABLE_STATUSES, "status") })
      .where(eq(schema.deliverables.id, required(fd, "id", "Deliverable")));
  }, ["/campaigns"]);
}

export async function deleteDeliverable(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await db
      .delete(schema.deliverables)
      .where(eq(schema.deliverables.id, required(fd, "id", "Deliverable")));
  }, ["/campaigns"]);
}
