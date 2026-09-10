import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PatientAppointmentsLive } from "@/components/appointments/PatientAppointmentsLive";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const { profile } = await requireRole(["patient"]);
  const sp = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, slot_time, status, is_emergency, hospitals(name), doctors(specialty, profiles:user_id(name))",
    )
    .eq("patient_id", profile.id)
    .order("slot_time", { ascending: false });

  return (
    <PatientAppointmentsLive
      patientId={profile.id}
      initialData={(data ?? []) as never[]}
      justBookedId={sp.booked}
    />
  );
}
