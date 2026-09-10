"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CheckInButton({
  appointmentId,
  emergency = false,
}: {
  appointmentId: string;
  emergency?: boolean;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    setErr(null);
    const res = await fetch("/api/queue/check-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appointmentId, emergency }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setErr(data.error ?? "Check-in failed");
      return;
    }
    router.push("/queue");
    router.refresh();
  }

  return (
    <div>
      <Button type="button" variant={emergency ? "emergency" : "primary"} disabled={pending} onClick={run}>
        {emergency ? "Emergency check-in" : "Check in"}
      </Button>
      {err ? <p className="mt-1 text-sm text-danger">{err}</p> : null}
    </div>
  );
}
