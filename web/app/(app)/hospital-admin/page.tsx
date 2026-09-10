import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { HospitalAdminLiveDashboard } from "@/components/admin/HospitalAdminLiveDashboard";

export default async function HospitalAdminPage() {
  const { profile } = await requireRole(["hospital_admin"]);
  const supabase = await createClient();
  const hospitalId = profile.hospital_id;
  if (!hospitalId) {
    return (
      <EmptyState
        title="No hospital assigned"
        description="Ask a Super Admin to attach your account to a hospital tenant."
      />
    );
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [{ data: hospital }, { count: todayCount }, { data: appts }, { data: tokens }] =
    await Promise.all([
      supabase.from("hospitals").select("*").eq("id", hospitalId).single(),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("hospital_id", hospitalId)
        .gte("slot_time", start.toISOString())
        .lt("slot_time", end.toISOString()),
      supabase.from("appointments").select("status").eq("hospital_id", hospitalId),
      supabase
        .from("queue_tokens")
        .select("called_at, created_at, status")
        .eq("hospital_id", hospitalId),
    ]);

  const total = appts?.length ?? 0;
  const noShows = appts?.filter((a) => a.status === "no_show").length ?? 0;
  const waits = (tokens ?? [])
    .filter((t) => t.called_at)
    .map((t) => new Date(t.called_at!).getTime() - new Date(t.created_at).getTime());
  const avgWait = waits.length
    ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length / 60000)
    : 0;

  return (
    <HospitalAdminLiveDashboard
      hospitalId={hospitalId}
      hospitalName={hospital?.name ?? "Hospital"}
      initialTodayCount={todayCount ?? 0}
      initialAvgWait={avgWait}
      initialNoShowRate={total ? Math.round((noShows / total) * 100) : 0}
    />
  );
}
