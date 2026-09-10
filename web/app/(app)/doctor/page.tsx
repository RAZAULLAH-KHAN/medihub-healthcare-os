import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { DoctorLiveDashboard } from "@/components/doctor/DoctorLiveDashboard";

export default async function DoctorPage() {
  const { profile } = await requireRole(["doctor", "lab_staff"]);
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, hospital_id, department_id, specialty, profiles:user_id(name)")
    .eq("user_id", profile.id)
    .maybeSingle();

  const hospitalId = doctor?.hospital_id ?? profile.hospital_id;
  if (!hospitalId || !doctor) {
    return (
      <EmptyState
        title="Doctor Profile Inactive"
        description="Your account is not attached to an active medical staff profile. Please contact the hospital administrator."
      />
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // Fetch initial appointments for today
  const { data: initialAppointments } = await supabase
    .from("appointments")
    .select(
      "id, slot_time, status, is_emergency, notes, patient_id, profiles:patient_id(name, phone, email)",
    )
    .eq("doctor_id", doctor.id)
    .gte("slot_time", start.toISOString())
    .lt("slot_time", end.toISOString())
    .order("slot_time", { ascending: true });

  // Fetch initial queue tokens for today
  let q = supabase
    .from("queue_tokens")
    .select("*, appointments(id, patient_id, profiles:patient_id(name))")
    .eq("hospital_id", hospitalId)
    .eq("service_date", today)
    .order("is_emergency", { ascending: false })
    .order("token_number");
  if (doctor.department_id) q = q.eq("department_id", doctor.department_id);
  const { data: initialTokens } = await q;

  // Fetch departments
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("hospital_id", hospitalId);

  const doctorName =
    (doctor.profiles as unknown as { name: string } | null)?.name || profile.name || "Doctor";

  return (
    <DoctorLiveDashboard
      hospitalId={hospitalId}
      doctorId={doctor.id}
      doctorName={doctorName}
      specialty={doctor.specialty || "Specialist"}
      initialAppointments={(initialAppointments ?? []) as never[]}
      initialTokens={(initialTokens ?? []) as never[]}
      departments={departments ?? []}
    />
  );
}
