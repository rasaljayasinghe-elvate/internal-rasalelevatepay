"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h1 className="text-xl font-bold tracking-tight">This page couldn’t load</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Something went wrong while rendering this page. The rest of the app is still available.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
      >
        Try again
      </button>
    </div>
  );
}
