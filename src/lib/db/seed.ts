// Seeds a couple of sample users so /calls/new has something to pick from
// in local dev. Run with: npx tsx src/lib/db/seed.ts
import { db, schema } from "./index";

async function main() {
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

  console.log("Seeded sample users.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
