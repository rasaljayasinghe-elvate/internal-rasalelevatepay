"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCallFromTranscript } from "@/lib/actions";

type Props = {
  users: { userId: string; activity: string }[];
};

export default function NewCallForm({ users }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState(users[0]?.userId ?? "");
  const [callDate, setCallDate] = useState(new Date().toISOString().slice(0, 10));
  const [transcript, setTranscript] = useState("");
  const [manualMasks, setManualMasks] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createCallFromTranscript({
          userId,
          callDate,
          transcript,
          manualMasks: manualMasks
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        router.push(`/calls/${result.callId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">User ID</span>
          {users.length > 0 ? (
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            >
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.userId} ({u.activity})
                </option>
              ))}
            </select>
          ) : (
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="No users loaded yet — upload the activity sheet, or type an ID"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
            />
          )}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Call date</span>
          <input
            type="date"
            value={callDate}
            onChange={(e) => setCallDate(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Transcript</span>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          required
          rows={14}
          placeholder="Paste the Granola transcript here..."
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 font-mono text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">
          Extra terms to mask (comma-separated, optional)
        </span>
        <input
          value={manualMasks}
          onChange={(e) => setManualMasks(e.target.value)}
          placeholder="e.g. the user's first name, a nickname for an account"
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending ? "Redacting and extracting…" : "Redact & extract"}
      </button>
    </form>
  );
}
