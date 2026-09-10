import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { PatientQueueLive } from "@/components/queue/PatientQueueLive";

export default async function QueuePage() {
  const { profile } = await requireRole(["patient"]);
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: tokens } = await supabase
    .from("queue_tokens")
    .select(
      "id, token_number, status, is_emergency, hospital_id, department_id, service_date, appointment_id, appointments(patient_id, slot_time, hospitals(name))",
    )
    .eq("service_date", today)
    .order("created_at", { ascending: false });

  const mine = (tokens ?? []).filter((t) => {
    const appt = t.appointments as unknown as { patient_id: string } | null;
    return appt?.patient_id === profile.id;
  });

  if (!mine.length) {
    return (
      <EmptyState
        title="You are not in a queue"
        description="Check in from your appointment on the visit day to get a token."
      />
    );
  }

  const token = mine[0];
  return (
    <PatientQueueLive
      tokenId={token.id}
      hospitalId={token.hospital_id}
      departmentId={token.department_id}
      initialNumber={token.token_number}
      initialStatus={token.status}
      isEmergency={token.is_emergency}
      hospitalName={
        (token.appointments as unknown as { hospitals?: { name: string } } | null)
          ?.hospitals?.name ?? "Hospital"
      }
    />
  );
}
