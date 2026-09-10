"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/client";

export type ReceptionistArrival = {
  id: string;
  slot_time: string;
  status: string;
  is_emergency?: boolean;
  profiles?: { name: string } | null;
  doctors?: { specialty: string; profiles?: { name: string } | null } | null;
};

export type ReceptionistToken = {
  id: string;
  token_number: number;
  status: string;
  is_emergency: boolean;
  department_id: string | null;
  appointments?: {
    slot_time?: string;
    patient_id?: string;
    profiles?: { name: string } | null;
  } | null;
};

export function ReceptionistLiveBoard({
  hospitalId,
  hospitalName,
  initialArrivals,
  initialTokens,
  departments,
}: {
  hospitalId: string;
  hospitalName: string;
  initialArrivals: ReceptionistArrival[];
  initialTokens: ReceptionistToken[];
  departments: { id: string; name: string }[];
}) {
  const [arrivals, setArrivals] = useState<ReceptionistArrival[]>(initialArrivals);
  const [tokens, setTokens] = useState<ReceptionistToken[]>(initialTokens);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [liveAlert, setLiveAlert] = useState<string | null>(null);

  const refreshArrivals = async () => {
    try {
      const res = await fetch(`/api/appointments?hospitalId=${hospitalId}&today=true`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.appointments)) {
          const bookedOnly = json.appointments.filter(
            (a: ReceptionistArrival) => a.status === "booked",
          );
          setArrivals(bookedOnly);
        }
      }

      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data: tokenData } = await supabase
        .from("queue_tokens")
        .select("*, appointments(slot_time, patient_id, profiles:patient_id(name))")
        .eq("hospital_id", hospitalId)
        .eq("service_date", today)
        .order("is_emergency", { ascending: false })
        .order("token_number");
      if (tokenData) {
        setTokens(tokenData as ReceptionistToken[]);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // 1. Subscribe to Hospital Broadcast Channel
    const hospitalChannel = supabase.channel(`hospital-${hospitalId}`);
    hospitalChannel
      .on("broadcast", { event: "appointment_booked" }, (payload) => {
        const row = payload.payload as {
          patient_name: string;
          doctor_name: string;
          slot_time: string;
        };
        setLiveAlert(`New Booking: ${row.patient_name} with ${row.doctor_name}`);
        refreshArrivals();
        setTimeout(() => setLiveAlert(null), 6000);
      })
      .on("broadcast", { event: "queue_updated" }, () => {
        refreshArrivals();
      })
      .on("broadcast", { event: "queue_status_changed" }, () => {
        refreshArrivals();
      })
      .subscribe();

    // 2. Subscribe to Postgres Changes on queue_tokens
    const queueChannel = supabase
      .channel(`reception-queue-${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens" },
        () => {
          refreshArrivals();
        },
      )
      .subscribe();

    // 3. Fallback polling
    const interval = setInterval(refreshArrivals, 5000);

    return () => {
      supabase.removeChannel(hospitalChannel);
      supabase.removeChannel(queueChannel);
      clearInterval(interval);
    };
  }, [hospitalId]);

  // Actions
  async function handleCheckIn(appointmentId: string, emergency = false) {
    setCheckingInId(appointmentId);
    try {
      const res = await fetch("/api/queue/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appointmentId, emergency }),
      });
      if (res.ok) {
        await refreshArrivals();
      }
    } finally {
      setCheckingInId(null);
    }
  }

  async function handleQueueAction(tokenId: string, action: string) {
    setActionLoadingId(tokenId);
    try {
      await fetch("/api/queue/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokenId, action }),
      });
      await refreshArrivals();
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredTokens = selectedDept
    ? tokens.filter((t) => t.department_id === selectedDept)
    : tokens;

  return (
    <div className="space-y-6">
      {/* Live Alert Banner */}
      {liveAlert ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-teal-600 animate-ping" />
            <span className="font-semibold text-teal-800">Live Arrival:</span>
            <span>{liveAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setLiveAlert(null)}
            className="text-xs font-semibold uppercase tracking-wider text-teal-800 hover:text-teal-950"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Reception Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Reception & Token Desk
          </h1>
          <p className="text-sm text-text-secondary">
            {hospitalName} · Real-time patient intake and queue dispatch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshArrivals}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-slate-50 transition-colors shadow-xs"
          >
            Refresh Desk
          </button>
        </div>
      </div>

      {/* Section 1: Arrivals to Check In */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">
              Arrivals to Check In
            </h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
              {arrivals.length} pending
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Newly booked visits land here in real time
          </p>
        </div>

        {!arrivals.length ? (
          <EmptyState
            title="No pending arrivals"
            description="Patients who have booked slots for today will appear here in real time for check-in."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {arrivals.map((a) => {
              const patientName = a.profiles?.name ?? "Patient";
              const doctorName = a.doctors?.profiles?.name ?? "Doctor";
              const specialty = a.doctors?.specialty ?? "General";
              const when = new Date(a.slot_time);
              const timeStr = when.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isCheckingIn = checkingInId === a.id;

              return (
                <Card
                  key={a.id}
                  className="flex flex-col justify-between gap-4 border-border bg-surface p-4 shadow-xs hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-text-primary text-base">
                        {patientName}
                      </p>
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-primary border border-teal-200">
                        {timeStr}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Doctor: <span className="font-medium text-text-primary">{doctorName}</span> ({specialty})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                    <Button
                      type="button"
                      variant="primary"
                      disabled={isCheckingIn}
                      onClick={() => handleCheckIn(a.id, false)}
                    >
                      {isCheckingIn ? "Checking In..." : "Check In & Issue Token"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isCheckingIn}
                      onClick={() => handleCheckIn(a.id, true)}
                    >
                      Emergency Priority
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Active Live Queue */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">
              Active Lobby Queue ({tokens.length})
            </h2>
          </div>

          {departments.length > 1 ? (
            <div className="flex items-center gap-2">
              <label htmlFor="dept-filter" className="text-xs text-text-secondary">
                Department:
              </label>
              <select
                id="dept-filter"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-primary"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {!filteredTokens.length ? (
          <EmptyState
            title="Lobby queue is clear"
            description="Check a patient in from the arrivals above to issue the next token number."
          />
        ) : (
          <div className="space-y-3">
            {filteredTokens.map((t) => {
              const appt = t.appointments;
              const patientName = appt?.profiles?.name ?? "Walk-in Patient";
              const isLoading = actionLoadingId === t.id;

              return (
                <div
                  key={t.id}
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-surface p-4 shadow-xs ${
                    t.is_emergency ? "border-red-300 bg-red-50/40" : "border-border"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold tabular-nums text-text-primary">
                        #{t.token_number}
                      </span>
                      <p className="font-semibold text-text-primary">{patientName}</p>
                      {t.is_emergency ? (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Emergency Priority
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-text-secondary">
                      Department:{" "}
                      {departments.find((d) => d.id === t.department_id)?.name ?? "General"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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

                    <Button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQueueAction(t.id, "call_next")}
                    >
                      Call Next
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isLoading}
                      onClick={() => handleQueueAction(t.id, "start")}
                    >
                      Start Visit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isLoading}
                      onClick={() => handleQueueAction(t.id, "skip")}
                    >
                      Skip
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={isLoading}
                      onClick={() => handleQueueAction(t.id, "no_show")}
                    >
                      No-Show
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
