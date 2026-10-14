import type { ReactNode } from "react";
import Link from "next/link";
import { getSessionUser } from "@/auth";
import { CALL_COHORTS, COHORT_LABEL, isCallCohort } from "@/lib/activity-sheet";
import { DataError } from "@/components/DataError";
import { databaseErrorMessage, db } from "@/lib/db";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";


export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortParam } = await searchParams;
  const cohort = isCallCohort(cohortParam) ? cohortParam : null;
  const viewer = await getSessionUser();
  let users: Awaited<ReturnType<typeof db.query.users.findMany>> = [];
  let loadError: string | null = null;
  try {
    users = await db.query.users.findMany({ orderBy: (u, { desc }) => desc(u.updatedAt) });
  } catch (err) {
    loadError = databaseErrorMessage(err);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Weekly activity sheet</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Each tab needs an email or a user id. Other columns are optional:
        signup_date, kyc_status, first_deposit_date, total_deposited,
        payout_count, last_active_date. Pick the list before uploading. A later
        upload of the same email or user id moves them onto that list.
      </p>
      {loadError && (
        <div className="mt-4">
          <DataError message={loadError} />
        </div>
      )}
      {viewer?.role === "operator" && <UploadForm />}

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <FilterLink href="/activity" active={!cohort}>
          All ({users.length})
        </FilterLink>
        {CALL_COHORTS.map((item) => (
          <FilterLink key={item} href={`/activity?cohort=${item}`} active={cohort === item}>
            {COHORT_LABEL[item]} ({users.filter((u) => u.cohort === item).length})
          </FilterLink>
        ))}
      </div>

      <h2 className="mt-6 font-medium">
        Users ({cohort ? users.filter((u) => u.cohort === cohort).length : users.length})
      </h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="p-2">User</th>
              <th className="p-2">List</th>
              <th className="p-2">Activity</th>
              <th className="p-2">First deposit</th>
              <th className="p-2">Last active</th>
              <th className="p-2">Snapshot</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter((u) => !cohort || u.cohort === cohort)
              .map((u) => (
              <tr key={u.userId} className="border-t border-neutral-100">
                <td className="p-2">
                  <div>{u.email ?? u.userId}</div>
                  {u.email && u.email !== u.userId && (
                    <div className="font-mono text-xs text-neutral-500">{u.userId}</div>
                  )}
                </td>
                <td className="p-2">{u.cohort ? COHORT_LABEL[u.cohort] : "—"}</td>
                <td className="p-2">{u.activity}</td>
                <td className="p-2">{u.firstDepositDate ?? "—"}</td>
                <td className="p-2">{u.lastActiveDate ?? "—"}</td>
                <td className="p-2">{u.snapshotDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.filter((u) => !cohort || u.cohort === cohort).length === 0 && !loadError && (
          <p className="p-4 text-sm text-neutral-600">
            {users.length === 0 ? "No activity data uploaded yet." : "Nobody on this list yet."}
          </p>
        )}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-md px-3 py-1 transition-colors " +
        (active ? "bg-brand-50 font-medium text-brand" : "text-neutral-600 hover:bg-neutral-100 hover:text-navy")
      }
    >
      {children}
    </Link>
  );
}
