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
  serviceDate,
}: {
  tokenId: string;
  hospitalId: string;
  departmentId: string | null;
  initialNumber: number;
  initialStatus: string;
  isEmergency: boolean;
  hospitalName: string;
  serviceDate?: string;
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
        .in("status", ["waiting", "called", "in_progress"]);
      if (serviceDate) {
        q = q.eq("service_date", serviceDate);
      }
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
  }, [tokenId, hospitalId, departmentId, serviceDate]);

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
    <div className="space-y-4 max-w-lg mx-auto">
      <OfflineBanner />
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Live Healthcare Queue</span>
          <p className="font-bold text-base text-text-primary">{hospitalName}</p>
        </div>
        <StatusBadge kind={kind} label={status.replace("_", " ")} />
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-hover p-8 text-center text-white shadow-xl shadow-primary/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Your Live Queue Token</p>
        <p
          className="mt-2 text-8xl font-black tracking-tight tabular-nums drop-shadow-xs"
          aria-live="polite"
        >
          #{number}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold backdrop-blur-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>You are #{position} in line</span>
          {wait ? <span>· ~{wait} min estimated wait</span> : ""}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-text-secondary flex items-center justify-between shadow-xs">
        <span>Current Token Served: <strong className="text-text-primary font-bold">#{lastKnown}</strong></span>
        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live WebSocket Sync
        </span>
      </div>
    </div>
  );
}

export function statusLabel(status: QueueStatus) {
  return status.replace("_", " ");
}
