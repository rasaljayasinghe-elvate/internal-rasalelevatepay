import { redirect } from "next/navigation";
import { getSessionUser } from "@/auth";
import { db } from "@/lib/db";
import NewCallForm from "./NewCallForm";

export const dynamic = "force-dynamic";


export default async function NewCallPage() {
  const viewer = await getSessionUser();
  if (viewer?.role !== "operator") redirect("/calls");

  const users = await db.query.users.findMany({ orderBy: (u, { asc }) => asc(u.userId) });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">New call</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Paste the Granola transcript, choose the user and call date. The
        transcript is redacted before anything is sent to the model (R1, R2).
      </p>
      <NewCallForm users={users.map((u) => ({ userId: u.userId, activity: u.activity }))} />
    </div>
  );
}
