"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";

export function ReportForm({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        content: fd.get("content"),
        prescription: fd.get("prescription"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPending(false);
      setError(data.error ?? "Could not save");
      return;
    }

    const file = fd.get("file");
    if (file instanceof File && file.size > 0) {
      const up = new FormData();
      up.set("file", file);
      up.set("reportId", data.id);
      const ures = await fetch("/api/uploads", { method: "POST", body: up });
      const udata = await ures.json();
      if (!ures.ok) setFileError(udata.error ?? "Upload rejected");
    }

    setPending(false);
    router.push("/doctor");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">Write report</h2>
      <Field label="Clinical notes">
        <textarea className={inputClass} name="content" rows={6} required minLength={10} />
      </Field>
      <Field label="Prescription">
        <textarea className={inputClass} name="prescription" rows={3} />
      </Field>
      <Field
        label="Lab attachment (PDF, JPG, PNG · 10MB max)"
        error={fileError ?? undefined}
      >
        <input className={inputClass} type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving & summarizing…" : "Save report + AI summary"}
      </Button>
    </form>
  );
}
