"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/activity-sheet", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const skipped = data.unmatched?.length
        ? ` Skipped rows with invalid data: ${data.unmatched.join(", ")}.`
        : "";
      setStatus(`Matched ${data.matched} of ${data.total} rows (snapshot ${data.snapshotDate}).${skipped}`);
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex items-center gap-3">
      <input ref={fileInput} type="file" accept=".csv" required className="text-sm" />
      <button
        type="submit"
        disabled={isUploading}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {isUploading ? "Uploading…" : "Upload CSV"}
      </button>
      {status && <span className="text-sm text-neutral-600">{status}</span>}
    </form>
  );
}
