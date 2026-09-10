"use client";

import { useEffect, useState } from "react";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { estimateWaitMinutes } from "@/lib/slots";
import type { QueueStatus } from "@/lib/types";

export function PatientQueueLive({
  tokenId,
  hospitalId,
  departmentId,
  initialNumber,
  initialStatus,
  isEmergency,
  hospitalName,
}: {
  tokenId: string;
  hospitalId: string;
  departmentId: string | null;
  initialNumber: number;
  initialStatus: string;
  isEmergency: boolean;
  hospitalName: string;
}) {
  const [number, setNumber] = useState(initialNumber);
  const [status, setStatus] = useState(initialStatus);
  const [ahead, setAhead] = useState<number | null>(null);
  const [lastKnown, setLastKnown] = useState(initialNumber);

  useEffect(() => {
    const supabase = createClient();

    async function loadAhead() {
      let q = supabase
        .from("queue_tokens")
        .select("id, token_number, status, is_emergency")
        .eq("hospital_id", hospitalId)
        .eq("service_date", new Date().toISOString().slice(0, 10))
        .in("status", ["waiting", "called", "in_progress"]);
      if (departmentId) q = q.eq("department_id", departmentId);
      const { data } = await q;
      const waiting = (data ?? []).sort((a, b) => {
        if (a.is_emergency !== b.is_emergency) return a.is_emergency ? -1 : 1;
        return a.token_number - b.token_number;
      });
      const idx = waiting.findIndex((t) => t.id === tokenId);
      setAhead(idx < 0 ? 0 : idx);
    }

    loadAhead();

    const channel = supabase
      .channel(`queue-${hospitalId}-${departmentId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            token_number?: number;
            status?: string;
            hospital_id?: string;
          };
          if (row.hospital_id && row.hospital_id !== hospitalId) return;
          if (row.id === tokenId) {
            if (row.token_number) {
              setNumber(row.token_number);
              setLastKnown(row.token_number);
            }
            if (row.status) setStatus(row.status);
          }
          loadAhead();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenId, hospitalId, departmentId]);

  const position = (ahead ?? 0) + 1;
  const wait = estimateWaitMinutes(position);
  const kind =
    status === "done"
      ? "success"
      : status === "no_show"
        ? "danger"
        : isEmergency
          ? "emergency"
          : "waiting";

  return (
    <div className="space-y-4">
      <OfflineBanner />
      <p className="text-text-secondary">{hospitalName}</p>
      <div className="rounded-2xl bg-primary px-6 py-12 text-center text-white">
        <p className="text-sm uppercase tracking-widest">Your token</p>
        <p
          className="mt-2 text-7xl font-semibold tabular-nums"
          aria-live="polite"
        >
          {number}
        </p>
        <p className="mt-4 text-lg" aria-live="polite">
          You are #{position}
          {wait ? ` · about ${wait} min` : ""}
        </p>
      </div>
      <StatusBadge kind={kind} label={status.replace("_", " ")} />
      <p className="text-sm text-text-secondary">
        Last known token {lastKnown}. This screen updates when reception calls
        the next patient.
      </p>
    </div>
  );
}

export function statusLabel(status: QueueStatus) {
  return status.replace("_", " ");
}
