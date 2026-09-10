"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/client";

type Token = {
  id: string;
  token_number: number;
  status: string;
  is_emergency: boolean;
  department_id: string | null;
  appointments?: { profiles?: { name: string } | null } | null;
};

export function StaffQueueBoard({
  hospitalId,
  initial,
  departments,
  doctorLink,
}: {
  hospitalId: string;
  initial: Token[];
  departments: { id: string; name: string }[];
  doctorLink?: boolean;
}) {
  const [tokens, setTokens] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`staff-queue-${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens" },
        async () => {
          const { data } = await supabase
            .from("queue_tokens")
            .select("*, appointments(profiles:patient_id(name))")
            .eq("hospital_id", hospitalId)
            .eq("service_date", new Date().toISOString().slice(0, 10))
            .order("is_emergency", { ascending: false })
            .order("token_number");
          setTokens((data as Token[]) ?? []);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospitalId]);

  const sorted = useMemo(() => {
    return [...tokens].sort((a, b) => {
      if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
      return a.token_number - b.token_number;
    });
  }, [tokens]);

  async function act(tokenId: string, action: string) {
    await fetch("/api/queue/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenId, action }),
    });
  }

  if (!sorted.length) {
    return (
      <EmptyState
        title="Queue is empty"
        description="Check a patient in to issue the next token number."
      />
    );
  }

  return (
    <div className="space-y-3">
      <OfflineBanner />
      {sorted.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl border bg-surface p-4 ${
            t.is_emergency ? "border-emergency bg-emergency-bg" : "border-border"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {t.is_emergency ? (
                <span className="mb-1 inline-flex animate-pulse items-center rounded-full bg-emergency px-2 py-0.5 text-xs text-white">
                  Emergency
                </span>
              ) : null}
              <p className="text-3xl font-semibold tabular-nums">#{t.token_number}</p>
              <p className="text-text-secondary">
                {t.appointments?.profiles?.name ?? "Patient"} ·{" "}
                {departments.find((d) => d.id === t.department_id)?.name ?? "Dept"}
              </p>
            </div>
            <StatusBadge
              kind={
                t.is_emergency
                  ? "emergency"
                  : t.status === "done"
                    ? "success"
                    : t.status === "waiting"
                      ? "waiting"
                      : "info"
              }
              label={t.status.replace("_", " ")}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => act(t.id, "call_next")}>
              Call next
            </Button>
            <Button type="button" variant="secondary" onClick={() => act(t.id, "start")}>
              Start visit
            </Button>
            <Button type="button" variant="secondary" onClick={() => act(t.id, "skip")}>
              Skip
            </Button>
            <Button type="button" variant="danger" onClick={() => act(t.id, "no_show")}>
              No-show
            </Button>
            {doctorLink ? (
              <a
                className="inline-flex items-center rounded-lg px-4 py-2 text-primary"
                href={`/doctor/visit/${t.id}`}
              >
                Write report
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
