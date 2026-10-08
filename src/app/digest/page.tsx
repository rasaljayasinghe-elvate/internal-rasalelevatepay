import { buildWeeklyDigest, digestToMarkdown } from "@/lib/digest";
import DigestEditor from "./DigestEditor";

export const dynamic = "force-dynamic";


export default async function DigestPage() {
  const digest = await buildWeeklyDigest();
  const markdown = digestToMarkdown(digest);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Weekly manager digest</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Generated from approved issues on published calls from the last 7
        days. Edit before sending (R7) — posting to Slack/Notion is on the v1
        roadmap (R11).
      </p>
      <DigestEditor initialMarkdown={markdown} />
    </div>
  );
}
