import { LogoMark } from "@/components/Logo";
import SignInForm from "./SignInForm";

const ALLOWED_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN ??
  process.env.ALLOWED_GOOGLE_DOMAIN ??
  "elevatepay.com";

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <LogoMark className="mx-auto size-14" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">ElevatePay</h1>
        <p className="text-sm font-medium text-brand">Call Insights</p>
        <p className="mt-4 text-sm text-neutral-600">
          Sign in with your <span className="font-medium">@{ALLOWED_DOMAIN}</span> email and the
          shared team password.
        </p>
        <SignInForm allowedDomain={ALLOWED_DOMAIN} />
      </div>
    </div>
  );
}
