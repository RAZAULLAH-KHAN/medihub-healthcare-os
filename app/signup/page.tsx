"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { AuthCard } from "@/app/login/page";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, {} as ActionState);

  return (
    <AuthCard title="Create Patient Account">
      <p className="mb-4 text-xs text-text-secondary leading-relaxed">
        Register to book consultations across accredited hospitals in Pakistan, track your live digital queue position, and access AI plain-language summaries.
      </p>
      <form action={action} className="space-y-4">
        <Field label="Full name">
          <input
            className={inputClass}
            name="name"
            required
            minLength={2}
            placeholder="e.g. Muhammad Ali"
          />
        </Field>
        <Field label="Email address">
          <input
            className={inputClass}
            name="email"
            type="email"
            required
            placeholder="e.g. ali.hassan@example.pk"
          />
        </Field>
        <Field label="Phone number (optional)">
          <input
            className={inputClass}
            name="phone"
            type="tel"
            placeholder="+92 300 1234567"
          />
        </Field>
        <Field label="Password (min. 8 characters)">
          <input
            className={inputClass}
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
          />
        </Field>
        {state.error ? (
          <p className="text-xs font-semibold text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating Account…" : "Create Patient Account"}
        </Button>
      </form>
      <div className="mt-5 border-t border-border/80 pt-4 text-center text-xs font-semibold">
        <span className="text-text-secondary">Already registered? </span>
        <Link href="/login" className="text-primary hover:underline">
          Sign in here →
        </Link>
      </div>
    </AuthCard>
  );
}
