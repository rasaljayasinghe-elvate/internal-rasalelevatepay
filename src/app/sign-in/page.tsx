import { signIn } from "@/auth";
import { LogoMark } from "@/components/Logo";

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <LogoMark className="mx-auto size-14" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">ElevatePay</h1>
        <p className="text-sm font-medium text-brand">Call Insights</p>
        <p className="mt-4 text-sm text-neutral-600">
          Restricted to Elevate Pay company Google accounts.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
