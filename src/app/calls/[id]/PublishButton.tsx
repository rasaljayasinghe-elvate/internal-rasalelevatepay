"use client";

import { useState, useTransition } from "react";
import { publishCall } from "@/lib/actions";

export default function PublishButton({ callId, disabled }: { callId: string; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      try {
        await publishCall(callId);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="text-right">
      <button
        onClick={onClick}
        disabled={disabled || isPending}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
      >
        {isPending ? "Publishing…" : "Publish to manager & engineering"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
