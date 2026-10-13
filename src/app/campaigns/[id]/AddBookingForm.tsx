"use client";

import { useActionState, useState } from "react";
import { Field, INPUT_CLASS } from "@/components/fields";
import { addBooking } from "@/lib/campaign-actions";
import { DECISION_LABEL, formatLkr } from "@/lib/campaigns";

type Option = {
  id: string;
  name: string;
  decision: string;
  rates: { id: string; label: string; amountLkr: string | null }[];
};

export default function AddBookingForm({ campaignId, creators }: { campaignId: string; creators: Option[] }) {
  const [state, formAction, pending] = useActionState(addBooking, null);
  const [picked, setCreatorId] = useState(creators[0]?.id ?? "");
  // The roster shrinks after each add, so fall back when the pick is gone.
  const creatorId = creators.some((c) => c.id === picked) ? picked : (creators[0]?.id ?? "");
  const rates = creators.find((c) => c.id === creatorId)?.rates ?? [];

  if (creators.length === 0) {
    return <p className="text-sm text-neutral-600">Every creator on the roster is already on this campaign.</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Creator">
          <select
            name="creatorId"
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className={INPUT_CLASS}
          >
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({DECISION_LABEL[c.decision]})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Package" className="sm:col-span-2">
          <select key={creatorId} name="rateId" defaultValue={rates[0]?.id ?? ""} className={INPUT_CLASS}>
            <option value="">No package</option>
            {rates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} · {formatLkr(r.amountLkr)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Agreed LKR" hint="Leave blank to use the package price">
          <input name="agreedLkr" inputMode="decimal" className={INPUT_CLASS} />
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add to campaign"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
