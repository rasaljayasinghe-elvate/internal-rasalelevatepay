import ActionForm from "@/components/ActionForm";
import { createCampaign } from "@/lib/campaign-actions";
import { CampaignFields } from "../CampaignFields";

export default function NewCampaignPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">New campaign</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Creators, agreed rates and posts are added on the campaign page.
      </p>
      <ActionForm
        action={createCampaign}
        submitLabel="Create campaign"
        className="mt-6 rounded-xl border border-neutral-200 bg-white p-4"
      >
        <CampaignFields />
      </ActionForm>
    </div>
  );
}
