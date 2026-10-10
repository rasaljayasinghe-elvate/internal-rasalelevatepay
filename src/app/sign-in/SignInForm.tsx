"use client";

import { useActionState } from "react";
import { credentialsLogin } from "@/lib/auth-actions";

export default function SignInForm({ allowedDomain }: { allowedDomain?: string }) {
  const [state, formAction, isPending] = useActionState(credentialsLogin, null);

  return (
    <form action={formAction} className="mt-6 space-y-4 text-left">
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={allowedDomain ? `you@${allowedDomain}` : "you@company.com"}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
