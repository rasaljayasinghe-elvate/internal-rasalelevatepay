import { Select, TextArea, TextInput } from "@/components/fields";
import { DECISION_LABEL, FIT_LABEL, PLATFORM_LABEL } from "@/lib/campaigns";
import type { schema } from "@/lib/db";

type Creator = typeof schema.creators.$inferSelect;
type Platform = typeof schema.creatorPlatforms.$inferSelect;
type Rate = typeof schema.creatorRates.$inferSelect;

export function CreatorFields({ creator }: { creator?: Creator }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TextInput label="Name" name="name" required defaultValue={creator?.name} className="sm:col-span-2" />
      <Select label="Call" name="decision" options={DECISION_LABEL} defaultValue={creator?.decision ?? "hold"} />
      <TextArea
        label="Condition or reason"
        name="notes"
        defaultValue={creator?.notes ?? ""}
        placeholder="e.g. Confirm TikTok handle and Facebook page before the advance"
        className="sm:col-span-2"
      />
      <TextInput
        label="Audience in Sri Lanka (%)"
        name="slAudiencePct"
        inputMode="decimal"
        defaultValue={creator?.slAudiencePct ?? ""}
        hint="Modash estimate, if known"
      />
    </div>
  );
}

export function PlatformFields({ platform }: { platform?: Platform }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Select label="Platform" name="platform" options={PLATFORM_LABEL} defaultValue={platform?.platform ?? "instagram"} />
      <TextInput label="Handle" name="handle" defaultValue={platform?.handle ?? ""} placeholder="@handle" />
      <TextInput label="Profile link" name="profileUrl" defaultValue={platform?.profileUrl ?? ""} className="sm:col-span-2" />
      <TextInput label="Followers" name="followers" inputMode="decimal" defaultValue={platform?.followers ?? ""} placeholder="e.g. 120k" />
      <TextInput label="Avg views" name="avgViews" inputMode="decimal" defaultValue={platform?.avgViews ?? ""} placeholder="conservative" />
      <TextInput label="Engagement (%)" name="engagementPct" inputMode="decimal" defaultValue={platform?.engagementPct ?? ""} />
      <Select label="Fit" name="fit" options={FIT_LABEL} defaultValue={platform?.fit ?? "unverified"} />
      <TextInput
        label="Insights screenshots link"
        name="insightsUrl"
        defaultValue={platform?.insightsUrl ?? ""}
        placeholder="Drive folder or image link"
        className="sm:col-span-4"
      />
    </div>
  );
}

export function RateFields({ rate }: { rate?: Rate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextInput label="Package" name="label" required defaultValue={rate?.label ?? ""} placeholder="e.g. 3-platform package" className="sm:col-span-2" />
      <TextInput label="LKR" name="amountLkr" inputMode="decimal" defaultValue={rate?.amountLkr ?? ""} />
      <TextInput label="USD" name="amountUsd" inputMode="decimal" defaultValue={rate?.amountUsd ?? ""} />
      <TextInput
        label="What it includes"
        name="includes"
        defaultValue={rate?.includes ?? ""}
        placeholder="e.g. 1 reel on Instagram, TikTok and Facebook"
        className="sm:col-span-4"
      />
    </div>
  );
}
