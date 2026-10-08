import { getSessionUser } from "@/auth";
import { db } from "@/lib/db";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";


export default async function ActivityPage() {
  const [users, viewer] = await Promise.all([
    db.query.users.findMany({ orderBy: (u, { desc }) => desc(u.updatedAt) }),
    getSessionUser(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Weekly activity sheet</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Export the weekly Google Sheet as CSV with columns: user_id,
        signup_date, kyc_status, first_deposit_date, total_deposited,
        payout_count, last_active_date. Rows are matched to users by{" "}
        <code>user_id</code> (R5).
      </p>
      {viewer?.role === "operator" && <UploadForm />}

      <h2 className="mt-8 font-medium">Users ({users.length})</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="p-2">User ID</th>
              <th className="p-2">Activity</th>
              <th className="p-2">First deposit</th>
              <th className="p-2">Last active</th>
              <th className="p-2">Snapshot</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId} className="border-t border-neutral-100">
                <td className="p-2 font-mono">{u.userId}</td>
                <td className="p-2">{u.activity}</td>
                <td className="p-2">{u.firstDepositDate ?? "—"}</td>
                <td className="p-2">{u.lastActiveDate ?? "—"}</td>
                <td className="p-2">{u.snapshotDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-4 text-sm text-neutral-600">No activity data uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
