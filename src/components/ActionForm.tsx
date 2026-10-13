"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/campaign-actions";

type Props = {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  /** Asks before submitting, for deletes. */
  confirm?: string;
  /** For button-only forms whose children are just hidden inputs. */
  compact?: boolean;
  className?: string;
};

const BUTTON: Record<NonNullable<Props["variant"]>, string> = {
  primary:
    "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50",
  secondary:
    "rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-navy hover:border-neutral-400 disabled:opacity-50",
  danger:
    "rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-50",
};

export default function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  variant = "primary",
  confirm,
  compact = false,
  className,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={className}
    >
      {children}
      <div className={compact ? "flex items-center gap-3" : "mt-3 flex items-center gap-3"}>
        <button type="submit" disabled={pending} className={BUTTON[variant]}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
