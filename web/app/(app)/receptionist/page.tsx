import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReceptionistLiveBoard } from "@/components/receptionist/ReceptionistLiveBoard";

export default async function ReceptionistPage() {
  const { profile } = await requireRole(["receptionist", "hospital_admin"]);
  const supabase = await createClient();
  const hospitalId = profile.hospital_id;
  if (!hospitalId) {
    return (
      <EmptyState
        title="No hospital assigned"
        description="Your receptionist account is not attached to an active hospital."
      />
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [{ data: hospital }, { data: tokens }, { data: walkins }, { data: departments }] =
    await Promise.all([
      supabase.from("hospitals").select("name").eq("id", hospitalId).maybeSingle(),
      supabase
        .from("queue_tokens")
        .select("*, appointments(slot_time, patient_id, profiles:patient_id(name))")
        .eq("hospital_id", hospitalId)
        .eq("service_date", today)
        .order("is_emergency", { ascending: false })
        .order("token_number"),
      supabase
        .from("appointments")
        .select(
          "id, slot_time, status, is_emergency, profiles:patient_id(name), doctors(specialty, profiles:user_id(name))",
        )
        .eq("hospital_id", hospitalId)
        .gte("slot_time", start.toISOString())
        .lt("slot_time", end.toISOString())
        .in("status", ["booked"])
        .order("slot_time", { ascending: true }),
      supabase.from("departments").select("id, name").eq("hospital_id", hospitalId),
    ]);

  return (
    <ReceptionistLiveBoard
      hospitalId={hospitalId}
      hospitalName={hospital?.name ?? "Hospital"}
      initialArrivals={(walkins ?? []) as never[]}
      initialTokens={(tokens ?? []) as never[]}
      departments={departments ?? []}
    />
  );
}
