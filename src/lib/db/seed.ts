// Seeds sample users so /calls/new has something to pick from in local dev,
// plus the Sri Lanka creator shortlist (decision paper, data as of
// 12 October 2026) and its buy-now campaign. Fixed ids make it safe to
// re-run. Run with: npx tsx src/lib/db/seed.ts
import { db, schema } from "./index";

type Platform = (typeof schema.socialPlatformEnum.enumValues)[number];
type Fit = (typeof schema.platformFitEnum.enumValues)[number];
type Decision = (typeof schema.creatorDecisionEnum.enumValues)[number];

type SeedCreator = {
  id: string;
  name: string;
  decision: Decision;
  notes: string;
  slAudiencePct?: number;
  platforms: {
    platform: Platform;
    fit: Fit;
    handle?: string;
    followers?: number;
    avgViews?: number;
    engagementPct?: number;
  }[];
  rates: { key: string; label: string; amountLkr: number; amountUsd?: number; includes?: string }[];
};

// Engagement is the lower of the two tool checks, and avg views the
// conservative figure, matching how the paper ranks cost per view.
const CREATORS: SeedCreator[] = [
  {
    id: "cr_hesara",
    name: "Hesara Yagi",
    decision: "buy_now",
    notes: "Only creator strong on all three platforms. Ask for the iPhone-videography version. Week 1 slot.",
    slAudiencePct: 89.8,
    platforms: [
      { platform: "instagram", fit: "strong", followers: 49_000, avgViews: 69_000, engagementPct: 5.3 },
      { platform: "tiktok", fit: "strong", followers: 257_500, avgViews: 206_000, engagementPct: 8.9 },
      { platform: "facebook", fit: "strong", handle: "hesara.yagi", followers: 92_000 },
    ],
    rates: [
      { key: "pkg", label: "3-platform package", amountLkr: 160_000, amountUsd: 484, includes: "TikTok, Instagram and Facebook" },
      { key: "fb", label: "Facebook reel", amountLkr: 70_000, includes: "Already inside the 3-platform package" },
    ],
  },
  {
    id: "cr_viren",
    name: "Viren Fernando",
    decision: "buy_now",
    notes: "Confirm his TikTok handle and Facebook page before the 50% advance. We found no TikTok. FDO Show page (186K) not yet linked to him.",
    platforms: [
      { platform: "instagram", fit: "strong", followers: 70_000, avgViews: 97_000, engagementPct: 6.7 },
      { platform: "tiktok", fit: "none" },
      { platform: "facebook", fit: "unverified", handle: "FDO Show", followers: 186_000 },
    ],
    rates: [
      { key: "pkg", label: "Instagram + TikTok", amountLkr: 140_000, amountUsd: 424 },
      { key: "fb", label: "Facebook add-on", amountLkr: 20_000, includes: "Only if the FDO Show page is confirmed as his" },
    ],
  },
  {
    id: "cr_lelumi",
    name: "Lelumi Jagoda",
    decision: "buy_now",
    notes: "Cheapest reach on the list, but a 7.6K account. Buy the TikTok add-on only after she shares screenshots.",
    platforms: [
      { platform: "instagram", fit: "strong", followers: 7_600, avgViews: 22_000, engagementPct: 6.2 },
      { platform: "tiktok", fit: "unverified", followers: 26_300 },
      { platform: "facebook", fit: "none" },
    ],
    rates: [
      { key: "pkg", label: "Instagram reel", amountLkr: 20_000, amountUsd: 61 },
      { key: "tt", label: "TikTok add-on", amountLkr: 25_000, includes: "Only after she shares TikTok screenshots" },
    ],
  },
  {
    id: "cr_anderson",
    name: "Anderson Kirubaharan",
    decision: "test",
    notes: "The two tools disagree on his Instagram engagement (14.7% vs 4.1%). Get the 30K content-reuse fee written into the deal.",
    slAudiencePct: 85.8,
    platforms: [
      { platform: "instagram", fit: "strong", followers: 91_000, avgViews: 48_000, engagementPct: 4.1 },
      { platform: "tiktok", fit: "weak", followers: 89_600, avgViews: 12_800, engagementPct: 8.1 },
      { platform: "facebook", fit: "weak", handle: "anderson.kirubaharan", followers: 8_500 },
    ],
    rates: [
      { key: "pkg", label: "Instagram + TikTok", amountLkr: 120_000, amountUsd: 363 },
      { key: "reuse", label: "Content-reuse fee", amountLkr: 30_000 },
    ],
  },
  {
    id: "cr_navidi",
    name: "Navidi Rapiyael",
    decision: "test",
    notes: "Best TikTok value after Hesara. Boosting rights included. Add Facebook only with her insights.",
    slAudiencePct: 83.7,
    platforms: [
      { platform: "instagram", fit: "ok", followers: 72_000, avgViews: 23_000, engagementPct: 1.6 },
      { platform: "tiktok", fit: "ok", followers: 46_600, avgViews: 27_400, engagementPct: 7.3 },
      { platform: "facebook", fit: "unverified", handle: "Navidirapiyael", followers: 35_700 },
    ],
    rates: [
      { key: "pkg", label: "TikTok + Instagram", amountLkr: 100_000, amountUsd: 302, includes: "Boosting rights included" },
      { key: "fb", label: "Facebook add-on", amountLkr: 25_000, includes: "Only with her insights" },
    ],
  },
  {
    id: "cr_sanuliya",
    name: "Sanuliya",
    decision: "test",
    notes: "Confirm which platforms 210K covers. Engagement split across the tools (0.9% vs 5.2% on Instagram). Only 17 comments against 2.1K likes on TikTok, so spot check before paying.",
    slAudiencePct: 89.7,
    platforms: [
      { platform: "instagram", fit: "ok", followers: 80_000, avgViews: 87_000, engagementPct: 0.9 },
      { platform: "tiktok", fit: "ok", followers: 245_400, avgViews: 24_900, engagementPct: 9.8 },
      { platform: "facebook", fit: "none" },
    ],
    rates: [{ key: "pkg", label: "Package (scope not in tracker)", amountLkr: 210_000, amountUsd: 635 }],
  },
  {
    id: "cr_sherangi",
    name: "Sherangi Natasha",
    decision: "rescope",
    notes: "Costs LKR 5,700 per 1K views on Instagram + TikTok. Ask to move to TikTok-only (70,000).",
    slAudiencePct: 85.8,
    platforms: [
      { platform: "instagram", fit: "weak", followers: 114_000, avgViews: 10_400, engagementPct: 0.4 },
      { platform: "tiktok", fit: "ok", followers: 175_400, avgViews: 18_600, engagementPct: 9.4 },
      { platform: "facebook", fit: "unverified", handle: "Sherangi Natasha", followers: 40_000 },
    ],
    rates: [
      { key: "pkg", label: "Agreed 3-platform", amountLkr: 170_000, amountUsd: 514 },
      { key: "tt", label: "TikTok only (proposed)", amountLkr: 70_000 },
    ],
  },
  {
    id: "cr_reshalee",
    name: "Reshalee",
    decision: "hold",
    notes: "No reach case at LKR 2,273 per 1K views on Instagram.",
    platforms: [
      { platform: "instagram", fit: "ok", followers: 31_000, avgViews: 22_000, engagementPct: 1.5 },
      { platform: "tiktok", fit: "weak", followers: 19_300, avgViews: 8_500, engagementPct: 6.7 },
      { platform: "facebook", fit: "none" },
    ],
    rates: [{ key: "pkg", label: "Instagram reel", amountLkr: 50_000 }],
  },
  {
    id: "cr_shaveena",
    name: "Shaveena Boange",
    decision: "hold",
    notes: "No reach case. Lowest Sri Lankan audience on the list (63%).",
    slAudiencePct: 63.2,
    platforms: [
      { platform: "instagram", fit: "weak", avgViews: 18_000 },
      { platform: "tiktok", fit: "weak", followers: 8_500, avgViews: 7_200, engagementPct: 6.9 },
      { platform: "facebook", fit: "none" },
    ],
    rates: [{ key: "pkg", label: "Instagram reel", amountLkr: 65_000 }],
  },
  {
    id: "cr_megara",
    name: "Megara Wijemanne",
    decision: "hold",
    notes: "No reach case. Revisit only as a cheap UGC asset.",
    platforms: [
      { platform: "instagram", fit: "weak", avgViews: 6_200 },
      { platform: "tiktok", fit: "weak", avgViews: 1_700 },
      { platform: "facebook", fit: "none", handle: "megaraaah", followers: 431 },
    ],
    rates: [{ key: "pkg", label: "Instagram + TikTok", amountLkr: 40_000, includes: "Instagram video + story option" }],
  },
  {
    id: "cr_chamanthi",
    name: "Chamanthi Bandara",
    decision: "hold",
    notes: "No reach case. Revisit only as a cheap UGC asset. First-check figure of 24K average likes was a glitch.",
    slAudiencePct: 87.3,
    platforms: [
      { platform: "instagram", fit: "weak", avgViews: 4_100, engagementPct: 1.6 },
      { platform: "tiktok", fit: "weak", avgViews: 2_400 },
      { platform: "facebook", fit: "none" },
    ],
    rates: [{ key: "pkg", label: "Instagram reel", amountLkr: 35_000 }],
  },
  {
    id: "cr_yasasi",
    name: "Yasasi Kushlani",
    decision: "hold",
    notes: "No reach case at LKR 6,723 per 1K views. No TikTok found; Facebook page inactive since 2019.",
    slAudiencePct: 87.0,
    platforms: [
      { platform: "instagram", fit: "weak", avgViews: 11_900 },
      { platform: "tiktok", fit: "none" },
      { platform: "facebook", fit: "none", handle: "yasassy96", followers: 2_100 },
    ],
    rates: [{ key: "pkg", label: "Instagram reel", amountLkr: 80_000 }],
  },
  {
    id: "cr_thaveesha",
    name: "Thaveesha Akurugoda",
    decision: "skipped",
    notes: "TikTok is her target but no averages and no Instagram figures. Unlocks with: TikTok analytics screenshot.",
    platforms: [{ platform: "tiktok", fit: "unverified", followers: 67_300 }],
    rates: [{ key: "pkg", label: "TikTok video", amountLkr: 50_000 }],
  },
  {
    id: "cr_dinithi",
    name: "Dinithi Thilakaratne",
    decision: "skipped",
    notes: "TikTok has no averages; Facebook \"7.5K+\" unverified; no Instagram link. Unlocks with: screenshots and Instagram handle.",
    platforms: [
      { platform: "tiktok", fit: "unverified", followers: 13_300 },
      { platform: "facebook", fit: "unverified", followers: 7_500 },
    ],
    rates: [],
  },
  {
    id: "cr_alosha",
    name: "Alosha Herath",
    decision: "skipped",
    notes: "No Instagram analytics. The TikTok account found has 13 followers and looks unconfirmed. Unlocks with: Instagram insights and the correct TikTok.",
    platforms: [{ platform: "tiktok", fit: "unverified", followers: 13 }],
    rates: [],
  },
  {
    id: "cr_sushmita",
    name: "Sushmita Wijayaratna",
    decision: "skipped",
    notes: "Replied but no rate yet. Instagram reach 81K, engagement 0.77%. Unlocks with: a quoted rate.",
    platforms: [{ platform: "instagram", fit: "unverified", engagementPct: 0.77 }],
    rates: [],
  },
  {
    id: "cr_senuri",
    name: "Senuri Rupasinghe",
    decision: "skipped",
    notes: "Not yet contacted, no rate. Instagram reach 67K, engagement 1.1%. Unlocks with: outreach and a quoted rate.",
    platforms: [{ platform: "instagram", fit: "unverified", engagementPct: 1.1 }],
    rates: [],
  },
];

const CAMPAIGN_ID = "cmp_sl_oct_2026";

// Buy-now set. Deliverables assume one post per platform in each package.
const BOOKINGS: {
  creatorId: string;
  rateKey: string;
  agreedLkr: number;
  notes?: string;
  posts: { platform: Platform; format: "reel" | "video" }[];
}[] = [
  {
    creatorId: "cr_hesara",
    rateKey: "pkg",
    agreedLkr: 160_000,
    posts: [
      { platform: "tiktok", format: "video" },
      { platform: "instagram", format: "reel" },
      { platform: "facebook", format: "reel" },
    ],
  },
  {
    creatorId: "cr_viren",
    rateKey: "pkg",
    agreedLkr: 140_000,
    notes: "50% advance on contract, after he confirms his TikTok handle and Facebook page.",
    posts: [
      { platform: "instagram", format: "reel" },
      { platform: "tiktok", format: "video" },
    ],
  },
  {
    creatorId: "cr_lelumi",
    rateKey: "pkg",
    agreedLkr: 20_000,
    posts: [{ platform: "instagram", format: "reel" }],
  },
];

async function seedUsers() {
  await db
    .insert(schema.users)
    .values([
      {
        userId: "u_1001",
        signupDate: "2026-09-01",
        kycStatus: "verified",
        firstDepositDate: "2026-09-03",
        totalDeposited: "1200.00",
        payoutCount: 2,
        lastActiveDate: "2026-10-05",
        activity: "active",
        snapshotDate: "2026-10-06",
      },
      {
        userId: "u_1002",
        signupDate: "2026-09-20",
        kycStatus: "pending",
        activity: "not_activated",
        snapshotDate: "2026-10-06",
      },
      {
        userId: "u_1003",
        signupDate: "2026-07-01",
        kycStatus: "verified",
        firstDepositDate: "2026-07-05",
        totalDeposited: "300.00",
        payoutCount: 1,
        lastActiveDate: "2026-08-01",
        activity: "dormant",
        snapshotDate: "2026-10-06",
      },
    ])
    .onConflictDoNothing();
}

async function seedCreators() {
  await db
    .insert(schema.creators)
    .values(
      CREATORS.map((c) => ({
        id: c.id,
        name: c.name,
        decision: c.decision,
        notes: c.notes,
        slAudiencePct: c.slAudiencePct?.toString(),
      })),
    )
    .onConflictDoNothing();

  const platforms = CREATORS.flatMap((c) =>
    c.platforms.map((p) => ({
      id: `${c.id}_${p.platform}`,
      creatorId: c.id,
      platform: p.platform,
      fit: p.fit,
      handle: p.handle,
      followers: p.followers,
      avgViews: p.avgViews,
      engagementPct: p.engagementPct?.toString(),
    })),
  );
  await db.insert(schema.creatorPlatforms).values(platforms).onConflictDoNothing();

  const rates = CREATORS.flatMap((c) =>
    c.rates.map((r) => ({
      id: `${c.id}_rate_${r.key}`,
      creatorId: c.id,
      label: r.label,
      amountLkr: String(r.amountLkr),
      amountUsd: r.amountUsd?.toString(),
      includes: r.includes,
    })),
  );
  await db.insert(schema.creatorRates).values(rates).onConflictDoNothing();
}

async function seedCampaign() {
  await db
    .insert(schema.campaigns)
    .values({
      id: CAMPAIGN_ID,
      name: "Sri Lanka creators · Oct 2026",
      status: "planning",
      notes:
        "Buy-now set from the 12 Oct shortlist: Hesara, Viren and Lelumi (LKR 320,000, about $968). " +
        "Tests to add once scope and rates are confirmed: Anderson, Navidi, Sanuliya (LKR 430,000). " +
        "Review after week 1 on signups, cost per signup, KYC completion and first deposits.",
    })
    .onConflictDoNothing();

  for (const b of BOOKINGS) {
    const bookingId = `${CAMPAIGN_ID}_${b.creatorId}`;
    await db
      .insert(schema.campaignCreators)
      .values({
        id: bookingId,
        campaignId: CAMPAIGN_ID,
        creatorId: b.creatorId,
        rateId: `${b.creatorId}_rate_${b.rateKey}`,
        agreedLkr: String(b.agreedLkr),
        status: "quoted",
        notes: b.notes,
      })
      .onConflictDoNothing();
    await db
      .insert(schema.deliverables)
      .values(
        b.posts.map((p) => ({
          id: `${bookingId}_${p.platform}`,
          campaignCreatorId: bookingId,
          platform: p.platform,
          format: p.format,
          status: "planned" as const,
        })),
      )
      .onConflictDoNothing();
  }
}

async function main() {
  await seedUsers();
  await seedCreators();
  await seedCampaign();
  console.log(`Seeded sample users, ${CREATORS.length} creators and the Oct 2026 campaign.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
