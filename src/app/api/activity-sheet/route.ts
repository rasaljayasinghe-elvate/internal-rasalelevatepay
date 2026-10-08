import { NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  parseActivityCsv,
  deriveActivity,
  type ActivitySheetRow,
  type UserActivity,
} from "@/lib/activity-sheet";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (user?.role !== "operator") {
    return NextResponse.json({ error: "Only operators can upload the activity sheet." }, { status: 403 });
  }

  const form = await req.formData();
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
    if (!row.userId) continue;
    const activity = deriveActivity(row);

    try {
      await upsertUser(row, activity, snapshotDate);
      matched++;
    } catch (err) {
      console.error(`Activity sheet row ${row.userId} rejected:`, err);
      unmatched.push(row.userId);
    }
  }

  return NextResponse.json({ matched, total: rows.length, unmatched, snapshotDate });
}

function upsertUser(row: ActivitySheetRow, activity: UserActivity, snapshotDate: string) {
  const payoutCount = row.payoutCount ? Number(row.payoutCount) : undefined;
  const fields = {
    signupDate: row.signupDate,
    kycStatus: row.kycStatus,
    firstDepositDate: row.firstDepositDate,
    totalDeposited: row.totalDeposited,
    payoutCount,
    lastActiveDate: row.lastActiveDate,
    activity,
    snapshotDate,
  };

  return db
    .insert(schema.users)
    .values({ userId: row.userId, ...fields })
    .onConflictDoUpdate({
      target: schema.users.userId,
      set: { ...fields, updatedAt: new Date() },
    });
}
