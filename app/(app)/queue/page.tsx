import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState } from "@/components/ui/EmptyState";
import { PatientQueueLive } from "@/components/queue/PatientQueueLive";
import { CheckInButton } from "@/components/queue/CheckInButton";

export default async function QueuePage() {
  const { profile } = await requireRole(["patient"]);
  const supabase = await createClient();
  const admin = createAdminClient();

  // 1. Fetch this patient's appointments
  const { data: myAppointments } = await supabase
    .from("appointments")
    .select(
      "id, slot_time, status, is_emergency, hospital_id, hospitals(name), doctors(specialty, profiles(name))",
    )
    .eq("patient_id", profile.id)
    .order("slot_time", { ascending: false });

  const apptIds = (myAppointments ?? []).map((a) => a.id);

  // 2. Fetch all queue tokens associated with this patient's appointments
  let tokens: Array<{
    id: string;
    token_number: number;
    status: string;
    is_emergency: boolean;
    hospital_id: string;
    department_id: string | null;
    service_date: string;
    appointment_id: string;
  }> = [];

  if (apptIds.length > 0) {
    const { data } = await admin
      .from("queue_tokens")
      .select(
        "id, token_number, status, is_emergency, hospital_id, department_id, service_date, appointment_id",
      )
      .in("appointment_id", apptIds)
      .order("created_at", { ascending: false });
    tokens = data ?? [];
  }

  // 3. Find active token first (waiting, called, in_progress), or fallback to most recent token
  const activeToken =
    tokens.find((t) => ["waiting", "called", "in_progress"].includes(t.status)) ??
    tokens[0];

  if (activeToken) {
    const matchingAppt = myAppointments?.find(
      (a) => a.id === activeToken.appointment_id,
    );
    const hospitalName =
      (matchingAppt?.hospitals as unknown as { name?: string } | null)?.name ??
      "Hospital Care Network";

    return (
      <div className="space-y-6">
        <PatientQueueLive
          tokenId={activeToken.id}
          hospitalId={activeToken.hospital_id}
          departmentId={activeToken.department_id}
          initialNumber={activeToken.token_number}
          initialStatus={activeToken.status}
          isEmergency={activeToken.is_emergency}
          hospitalName={hospitalName}
          serviceDate={activeToken.service_date}
        />
      </div>
    );
  }

  // 4. If no token yet, check if patient has a booked or checked_in appointment
  const checkinableAppt = myAppointments?.find(
    (a) => a.status === "booked" || a.status === "checked_in",
  );

  if (checkinableAppt) {
    const doctorName =
      (checkinableAppt.doctors as unknown as { profiles?: { name?: string } } | null)
        ?.profiles?.name ?? "Specialist";
    const specialty =
      (checkinableAppt.doctors as unknown as { specialty?: string } | null)
        ?.specialty ?? "General Medicine";
    const hospitalName =
      (checkinableAppt.hospitals as unknown as { name?: string } | null)?.name ??
      "Hospital";

    return (
      <div className="max-w-md mx-auto space-y-4 pt-4">
        <div className="rounded-3xl border border-primary/20 bg-surface p-7 text-center shadow-md space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Ready to Join the Live Queue?
            </h2>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              Upcoming consultation with <strong>Dr. {doctorName}</strong> ({specialty}) at <strong>{hospitalName}</strong>.
            </p>
          </div>
          <div className="pt-1">
            <CheckInButton appointmentId={checkinableAppt.id} />
          </div>
        </div>
      </div>
    );
  }

  // 5. If no appointment found at all, show booking prompt
  return (
    <div className="max-w-md mx-auto space-y-4 pt-4">
      <EmptyState
        title="You are not in a queue"
        description="Book a consultation at any partner hospital to receive your live digital queue token."
      />
      <div className="text-center">
        <Link
          href="/hospitals"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
        >
          Find Care & Book an Appointment
        </Link>
      </div>
    </div>
  );
}
