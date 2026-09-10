"use client";

import { useActionState } from "react";
import { resetPassword, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { AuthCard } from "@/app/login/page";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, {} as ActionState);

  return (
    <AuthCard title="Reset password">
      {state.ok ? (
        <p className="text-success">Check your email for a reset link.</p>
      ) : (
        <form action={action} className="space-y-4">
          <Field label="Email">
            <input className={inputClass} name="email" type="email" required />
          </Field>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
