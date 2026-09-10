"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CheckInButton } from "@/components/queue/CheckInButton";
import { CancelButton } from "@/components/appointments/CancelButton";
import { createClient } from "@/lib/supabase/client";

export type PatientAppointment = {
  id: string;
  slot_time: string;
  status: string;
  is_emergency: boolean;
  hospitals?: { name: string } | null;
  doctors?: {
    specialty: string;
    profiles?: { name: string } | null;
  } | null;
};

export function PatientAppointmentsLive({
  patientId,
  initialData,
  justBookedId,
}: {
  patientId: string;
  initialData: PatientAppointment[];
  justBookedId?: string;
}) {
  const [items, setItems] = useState<PatientAppointment[]>(initialData);

  const refreshAppointments = async () => {
    try {
      const res = await fetch("/api/appointments");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.appointments)) {
          setItems(json.appointments);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Listen to notifications for this patient (e.g. check in, appointment confirmation)
    const channel = supabase
      .channel(`patient-appts-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${patientId}`,
        },
        () => {
          refreshAppointments();
        },
      )
      .subscribe();

    // Poll fallback every 6 seconds
    const interval = setInterval(refreshAppointments, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [patientId]);

  if (!items.length) {
    return (
      <EmptyState
        title="No appointments yet"
        description="Book your first consultation to get a live token and automated notifications."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Your Consultations & Visits
        </h1>
        <Link
          href="/hospitals"
          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
        >
          Book Another Visit
        </Link>
      </div>

      {justBookedId ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 shadow-xs">
          <p className="font-semibold text-emerald-800">
            Consultation Booked Successfully!
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Your appointment has been communicated to the hospital. On the day of your visit, check in to join the live queue.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((a) => {
          const hospital = a.hospitals;
          const doctor = a.doctors;
          const when = new Date(a.slot_time);
          const isToday = when.toDateString() === new Date().toDateString();

          return (
            <Card
              key={a.id}
              className="border-border bg-surface p-5 shadow-xs transition-colors hover:border-primary/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-text-primary">
                      {hospital?.name ?? "Hospital"}
                    </p>
                    {a.is_emergency ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        Emergency
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-medium text-text-primary">
                    Dr. {doctor?.profiles?.name ?? "Specialist"} ·{" "}
                    <span className="text-text-secondary">{doctor?.specialty}</span>
                  </p>
                  <p className="text-xs text-text-secondary">
                    Scheduled Time:{" "}
                    <strong className="text-text-primary font-medium">
                      {when.toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </strong>
                  </p>
                </div>

                <StatusBadge
                  kind={
                    a.status === "cancelled" || a.status === "no_show"
                      ? "danger"
                      : a.status === "completed"
                        ? "success"
                        : a.status === "checked_in" || a.status === "in_progress"
                          ? "info"
                          : "waiting"
                  }
                  label={a.status.replace("_", " ")}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
                {a.status === "booked" && isToday ? (
                  <CheckInButton appointmentId={a.id} />
                ) : null}

                {a.status === "checked_in" || a.status === "in_progress" ? (
                  <Link
                    href="/queue"
                    className="rounded-lg bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-primary border border-teal-200 hover:bg-teal-100 transition-colors"
                  >
                    View Live Queue Position →
                  </Link>
                ) : null}

                {a.status === "completed" ? (
                  <Link
                    href="/reports"
                    className="rounded-lg bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    Read Medical Report & AI Summary →
                  </Link>
                ) : null}

                {a.status === "booked" ? (
                  <CancelButton appointmentId={a.id} />
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
