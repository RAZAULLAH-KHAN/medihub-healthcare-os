"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/client";

export type DoctorAppointment = {
  id: string;
  slot_time: string;
  status: string;
  is_emergency?: boolean;
  notes?: string | null;
  patient_id: string;
  profiles?: { name: string; phone?: string | null; email?: string | null } | null;
  isNew?: boolean;
};

export type DoctorToken = {
  id: string;
  token_number: number;
  status: string;
  is_emergency: boolean;
  department_id: string | null;
  appointment_id?: string | null;
  appointments?: { id?: string; profiles?: { name: string } | null } | null;
};

export function DoctorLiveDashboard({
  hospitalId,
  doctorId,
  doctorName,
  specialty,
  initialAppointments,
  initialTokens,
  departments,
}: {
  hospitalId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  initialAppointments: DoctorAppointment[];
  initialTokens: DoctorToken[];
  departments: { id: string; name: string }[];
}) {
  const [appointments, setAppointments] = useState<DoctorAppointment[]>(initialAppointments);
  const [tokens, setTokens] = useState<DoctorToken[]>(initialTokens);
  const [activeTab, setActiveTab] = useState<"schedule" | "queue">("schedule");
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null);

  // Sync today's appointments and tokens
  const refreshData = async () => {
    try {
      const res = await fetch(`/api/appointments?doctorId=${doctorId}&today=true`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.appointments)) {
          setAppointments(json.appointments);
        }
      }

      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data: tokenData } = await supabase
        .from("queue_tokens")
        .select("*, appointments(id, profiles:patient_id(name))")
        .eq("hospital_id", hospitalId)
        .eq("service_date", today)
        .order("is_emergency", { ascending: false })
        .order("token_number");
      if (tokenData) {
        setTokens(tokenData as DoctorToken[]);
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
          id: string;
          doctor_id: string;
          patient_name: string;
          slot_time: string;
          status: string;
        };
        if (row.doctor_id === doctorId) {
          setRealtimeAlert(`New booking: ${row.patient_name} at ${new Date(row.slot_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
          refreshData();
          setTimeout(() => setRealtimeAlert(null), 6000);
        }
      })
      .on("broadcast", { event: "queue_updated" }, () => {
        refreshData();
      })
      .on("broadcast", { event: "queue_status_changed" }, () => {
        refreshData();
      })
      .subscribe();

    // 2. Subscribe to Postgres Changes on queue_tokens
    const queueChannel = supabase
      .channel(`doctor-queue-watch-${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tokens" },
        () => {
          refreshData();
        },
      )
      .subscribe();

    // 3. Resilient 5-second polling fallback
    const interval = setInterval(refreshData, 5000);

    return () => {
      supabase.removeChannel(hospitalChannel);
      supabase.removeChannel(queueChannel);
      clearInterval(interval);
    };
  }, [hospitalId, doctorId]);

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
        await refreshData();
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
      await refreshData();
    } finally {
      setActionLoadingId(null);
    }
  }

  // Derived metrics
  const bookedCount = appointments.filter((a) => a.status === "booked").length;
  const waitingTokens = tokens.filter((t) => t.status === "waiting");
  const inProgressTokens = tokens.filter(
    (t) => t.status === "in_progress" || t.status === "called",
  );
  const completedCount = appointments.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Real-time Toast Banner */}
      {realtimeAlert ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/90 px-4 py-3 text-sm text-teal-900 shadow-sm backdrop-blur-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-teal-600 animate-ping" />
            <span className="font-semibold text-teal-800">Live Booking Alert</span>
            <span className="text-teal-700">{realtimeAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setRealtimeAlert(null)}
            className="text-xs font-semibold uppercase tracking-wider text-teal-800 hover:text-teal-950"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Doctor Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Dr. {doctorName}
            </h1>
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-primary border border-teal-200">
              {specialty}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Today&apos;s Live Consultation Desk & Patient Queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-slate-50 transition-colors shadow-xs"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Appointments Today
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary tabular-nums">
            {appointments.length}
          </p>
          <p className="text-xs text-text-secondary">{bookedCount} to check in</p>
        </Card>
        <Card className="border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Waiting in Queue
          </p>
          <p className="mt-1 text-2xl font-bold text-primary tabular-nums">
            {waitingTokens.length}
          </p>
          <p className="text-xs text-text-secondary">Ready outside</p>
        </Card>
        <Card className="border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            In Room / Called
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600 tabular-nums">
            {inProgressTokens.length}
          </p>
          <p className="text-xs text-text-secondary">Active visits</p>
        </Card>
        <Card className="border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Completed Today
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">
            {completedCount}
          </p>
          <p className="text-xs text-text-secondary">Consultations finished</p>
        </Card>
      </div>

      {/* Current Patient In Consultation Spotlight */}
      {inProgressTokens.length ? (
        <div className="rounded-2xl border-2 border-primary/40 bg-teal-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Active Consultation In Progress
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
              In Room
            </span>
          </div>
          {inProgressTokens.map((t) => {
            const appt = t.appointments as { id?: string; profiles?: { name: string } } | null;
            const targetApptId = t.appointment_id || appt?.id;
            return (
              <div
                key={t.id}
                className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-primary/20 pt-3"
              >
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    Token #{t.token_number} · {appt?.profiles?.name ?? "Patient"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Status: {t.status === "called" ? "Patient Called to Door" : "Consultation in Progress"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {targetApptId ? (
                    <Link
                      href={`/doctor/visit/${targetApptId}`}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
                    >
                      Open Clinical Chart & Notes →
                    </Link>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={actionLoadingId === t.id}
                    onClick={() => handleQueueAction(t.id, "complete")}
                  >
                    Mark Done
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "schedule"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Today&apos;s Booked Appointments ({appointments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "queue"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Live Token Queue ({tokens.length})
        </button>
      </div>

      {/* Tab 1: Today's Booked Schedule */}
      {activeTab === "schedule" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Booked Schedule for Today
            </h2>
            <p className="text-xs text-text-secondary">
              Appointments booked by patients update here in real time
            </p>
          </div>

          {!appointments.length ? (
            <EmptyState
              title="No appointments booked today yet"
              description="When a patient books an appointment with you, it will appear here instantly in real time."
            />
          ) : (
            appointments.map((a) => {
              const patientName = a.profiles?.name ?? "Patient";
              const when = new Date(a.slot_time);
              const timeStr = when.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isCheckingIn = checkingInId === a.id;

              return (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text-primary">{patientName}</p>
                      {a.is_emergency ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          Emergency
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-text-secondary">
                      Time Slot: <strong className="text-text-primary">{timeStr}</strong>
                      {a.profiles?.phone ? ` · Tel: ${a.profiles.phone}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      kind={
                        a.status === "completed"
                          ? "success"
                          : a.status === "in_progress"
                            ? "info"
                            : a.status === "checked_in"
                              ? "waiting"
                              : a.status === "cancelled"
                                ? "danger"
                                : "waiting"
                      }
                      label={a.status.replace("_", " ")}
                    />

                    {a.status === "booked" ? (
                      <Button
                        type="button"
                        variant="primary"
                        disabled={isCheckingIn}
                        onClick={() => handleCheckIn(a.id)}
                      >
                        {isCheckingIn ? "Admitting..." : "Check In to Queue"}
                      </Button>
                    ) : null}

                    {a.status === "checked_in" || a.status === "in_progress" ? (
                      <Link
                        href={`/doctor/visit/${a.id}`}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
                      >
                        Open Chart & Prescribe
                      </Link>
                    ) : null}

                    {a.status === "completed" ? (
                      <Link
                        href={`/doctor/visit/${a.id}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-slate-50 transition-colors"
                      >
                        View Visit Notes
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Tab 2: Live Queue Board */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Live Queue Desk
            </h2>
            <p className="text-xs text-text-secondary">
              Patients checked in and waiting in the lobby
            </p>
          </div>

          {!tokens.length ? (
            <EmptyState
              title="Queue is empty"
              description="No patients are currently in the queue. Check in an appointment to issue a token."
            />
          ) : (
            tokens.map((t) => {
              const appt = t.appointments as { id?: string; profiles?: { name: string } } | null;
              const targetApptId = t.appointment_id || appt?.id;
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
                      <p className="font-semibold text-text-primary">
                        {appt?.profiles?.name ?? "Patient"}
                      </p>
                      {t.is_emergency ? (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Emergency
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

                    {targetApptId ? (
                      <Link
                        href={`/doctor/visit/${targetApptId}`}
                        className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-teal-50 transition-colors"
                      >
                        Chart & Report
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
