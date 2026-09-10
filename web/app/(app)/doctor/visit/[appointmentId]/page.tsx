import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { ReportForm } from "@/components/reports/ReportForm";

export default async function VisitPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { profile } = await requireRole(["doctor", "lab_staff"]);
  const { appointmentId } = await params;
  const supabase = await createClient();

  let apptId = appointmentId;
  const { data: asToken } = await supabase
    .from("queue_tokens")
    .select("appointment_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (asToken?.appointment_id) apptId = asToken.appointment_id;

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, slot_time, patient_id, hospital_id, profiles:patient_id(name)")
    .eq("id", apptId)
    .maybeSingle();
  if (!appt || (profile.hospital_id && appt.hospital_id !== profile.hospital_id)) {
    notFound();
  }

  const { data: history } = await supabase
    .from("medical_reports")
    .select("id, created_at, content, ai_summary")
    .eq("patient_id", appt.patient_id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {(appt.profiles as unknown as { name: string } | null)?.name}
        </h1>
        <p className="text-text-secondary">{new Date(appt.slot_time).toLocaleString()}</p>
      </div>
      <Card>
        <h2 className="font-semibold">Previous notes</h2>
        {!history?.length ? (
          <p className="mt-2 text-text-secondary">No prior reports in this hospital.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {history.map((h) => (
              <li key={h.id} className="border-t border-border pt-3 text-sm">
                <p className="text-text-secondary">{new Date(h.created_at).toLocaleDateString()}</p>
                <p className="mt-1 line-clamp-3">{h.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <ReportForm appointmentId={appt.id} />
    </div>
  );
}
