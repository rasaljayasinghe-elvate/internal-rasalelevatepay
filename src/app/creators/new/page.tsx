import ActionForm from "@/components/ActionForm";
import { createCreator } from "@/lib/campaign-actions";
import { CreatorFields } from "../CreatorFields";

export default function NewCreatorPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">New creator</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Add the profile first. Platforms and quoted packages go on the next page.
      </p>
      <ActionForm
        action={createCreator}
        submitLabel="Create creator"
        className="mt-6 rounded-xl border border-neutral-200 bg-white p-4"
      >
        <CreatorFields />
      </ActionForm>
    </div>
  );
}
