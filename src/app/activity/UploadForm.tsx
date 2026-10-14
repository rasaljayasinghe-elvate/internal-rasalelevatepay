"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CALL_COHORTS, COHORT_LABEL, type CallCohort } from "@/lib/activity-sheet";

export default function UploadForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [cohort, setCohort] = useState<CallCohort>("depositors_active");
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
      form.append("cohort", cohort);
      const res = await fetch("/api/activity-sheet", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const skipped = data.unmatched?.length
        ? ` Skipped rows with invalid data: ${data.unmatched.join(", ")}.`
        : "";
      setStatus(
        `Added ${data.matched} of ${data.total} rows to ${COHORT_LABEL[cohort]} (snapshot ${data.snapshotDate}).${skipped}`,
      );
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-center gap-3">
      <select
        value={cohort}
        onChange={(e) => setCohort(e.target.value as CallCohort)}
        aria-label="Call list"
        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
      >
        {CALL_COHORTS.map((item) => (
          <option key={item} value={item}>
            {COHORT_LABEL[item]}
          </option>
        ))}
      </select>
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
