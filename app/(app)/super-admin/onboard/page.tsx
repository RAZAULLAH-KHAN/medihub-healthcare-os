"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";

export default function OnboardHospitalPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/hospitals/onboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hospitalName: fd.get("hospitalName"),
        address: fd.get("address"),
        subscriptionPlan: fd.get("subscriptionPlan"),
        adminName: fd.get("adminName"),
        adminEmail: fd.get("adminEmail"),
        adminPassword: fd.get("adminPassword"),
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not onboard");
      return;
    }
    router.push("/super-admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Onboard a hospital</h1>
      <p className="text-text-secondary">
        Creates a tenant hospital and the first hospital admin account.
      </p>
      <Field label="Hospital name">
        <input className={inputClass} name="hospitalName" required minLength={2} />
      </Field>
      <Field label="Address">
        <input className={inputClass} name="address" required minLength={4} />
      </Field>
      <Field label="Plan">
        <select className={inputClass} name="subscriptionPlan" defaultValue="starter">
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </Field>
      <Field label="Admin name">
        <input className={inputClass} name="adminName" required />
      </Field>
      <Field label="Admin email">
        <input className={inputClass} name="adminEmail" type="email" required />
      </Field>
      <Field label="Temporary password">
        <input className={inputClass} name="adminPassword" type="password" required minLength={8} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        Create hospital
      </Button>
    </form>
  );
}
