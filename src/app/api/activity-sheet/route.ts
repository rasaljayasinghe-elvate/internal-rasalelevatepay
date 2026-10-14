import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  parseActivityCsv,
  deriveActivity,
  isCallCohort,
  type ActivitySheetRow,
  type CallCohort,
  type UserActivity,
} from "@/lib/activity-sheet";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (user?.role !== "operator") {
    return NextResponse.json({ error: "Only operators can upload the activity sheet." }, { status: 403 });
  }

  const form = await req.formData();
  const cohortRaw = form.get("cohort");
  const cohort = typeof cohortRaw === "string" && isCallCohort(cohortRaw) ? cohortRaw : null;
  if (!cohort) {
    return NextResponse.json(
      { error: "Choose which list this CSV is: Depositors, active or Pending KYC." },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const csv = await file.text();
  let rows;
  try {
    rows = parseActivityCsv(csv);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const snapshotDate = new Date().toISOString().slice(0, 10);
  let matched = 0;
  const unmatched: string[] = [];

  for (const row of rows) {
    const userId = await resolveUserId(row);
    if (!userId) continue;
    const activity = deriveActivity(row);
    const label = row.email ?? userId;

    try {
      await upsertUser(userId, row, activity, cohort, snapshotDate);
      matched++;
    } catch (err) {
      console.error(`Activity sheet row ${label} rejected:`, err);
      unmatched.push(label);
    }
  }

  return NextResponse.json({ matched, total: rows.length, unmatched, snapshotDate, cohort });
}

async function resolveUserId(row: ActivitySheetRow): Promise<string | null> {
  if (row.userId) return row.userId;
  if (!row.email) return null;
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, row.email),
  });
  return existing?.userId ?? row.email;
}

function upsertUser(
  userId: string,
  row: ActivitySheetRow,
  activity: UserActivity,
  cohort: CallCohort,
  snapshotDate: string,
) {
  const payoutCount = row.payoutCount ? Number(row.payoutCount) : undefined;
  const fields = {
    ...(row.email ? { email: row.email } : {}),
    signupDate: row.signupDate,
    kycStatus: row.kycStatus,
    firstDepositDate: row.firstDepositDate,
    totalDeposited: row.totalDeposited,
    payoutCount,
    lastActiveDate: row.lastActiveDate,
    activity,
    cohort,
    snapshotDate,
  };

  return db
    .insert(schema.users)
    .values({ userId, ...fields })
    .onConflictDoUpdate({
      target: schema.users.userId,
      set: { ...fields, updatedAt: new Date() },
    });
}
