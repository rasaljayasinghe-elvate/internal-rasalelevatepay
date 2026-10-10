import { LogoMark } from "@/components/Logo";
import { getAllowedEmailDomain } from "@/lib/allowed-domain";
import SignInForm from "./SignInForm";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const allowedDomain = getAllowedEmailDomain();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <LogoMark className="mx-auto size-14" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">ElevatePay</h1>
        <p className="text-sm font-medium text-brand">Call Insights</p>
        <p className="mt-4 text-sm text-neutral-600">
          {allowedDomain ? (
            <>
              Sign in with your <span className="font-medium">@{allowedDomain}</span> email and the
              shared team password.
            </>
          ) : (
            <>Sign in with your company email and the shared team password.</>
          )}
        </p>
        <SignInForm allowedDomain={allowedDomain} />
      </div>
    </div>
  );
}
