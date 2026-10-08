"use client";

import { useState } from "react";

export default function DigestEditor({ initialMarkdown }: { initialMarkdown: string }) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-4">
      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        rows={20}
        className="w-full rounded-lg border border-neutral-300 bg-white p-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 font-mono text-sm"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={copy}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          {copied ? "Copied" : "Copy markdown"}
        </button>
        <span className="text-xs text-neutral-500">
          Paste this into Slack, Notion or email until R11 is built.
        </span>
      </div>
    </div>
  );
}
