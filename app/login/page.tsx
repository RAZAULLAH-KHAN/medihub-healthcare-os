"use client";

import Link from "next/link";
import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { login, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { SaaSNavbar } from "@/components/navigation/SaaSNavbar";

function LoginForm() {
  const [state, action, pending] = useActionState(login, {} as ActionState);
  const searchParams = useSearchParams();
  const checkEmail = searchParams.get("check-email");
  const signedUp = searchParams.get("signed-up");
  const next = searchParams.get("next");

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {checkEmail ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          Account created! Sign in below with your password.
        </div>
      ) : null}
      {signedUp ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-800">
          Account ready! Sign in below to access your portal.
        </div>
      ) : null}
      <Field label="Email address" error={state.error?.includes("email") ? state.error : undefined}>
        <input
          className={inputClass}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="e.g. patient.ali@example.com or dr.sarah@citycare.local"
        />
      </Field>
      <Field label="Password">
        <input
          className={inputClass}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </Field>
      {state.error ? (
        <p className="text-xs font-semibold text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Authenticating…" : "Sign In to Portal"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthCard title="Sign In to MediHub">
      <Suspense fallback={<div className="py-4 text-center text-xs text-text-secondary">Loading…</div>}>
        <LoginForm />
      </Suspense>

      <div className="mt-5 flex items-center justify-between border-t border-border/80 pt-4 text-xs font-semibold">
        <Link href="/forgot-password" className="text-text-secondary hover:text-primary">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-primary hover:underline">
          Create patient account →
        </Link>
      </div>
    </AuthCard>
  );
}

export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col">
      <SaaSNavbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Enterprise Health Platform
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
