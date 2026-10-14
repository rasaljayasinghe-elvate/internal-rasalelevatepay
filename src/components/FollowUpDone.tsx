"use client";

import { useState, useTransition } from "react";
import { toggleFollowUp } from "@/lib/actions";

export default function FollowUpDone({ id, done }: { id: string; done: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleFollowUp(id, !done);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        aria-pressed={done}
        className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-navy transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
      >
        {isPending ? "Saving…" : done ? "Reopen" : "Done"}
      </button>
      {error && <p className="mt-1 max-w-40 text-xs text-red-600">{error}</p>}
    </div>
  );
}
