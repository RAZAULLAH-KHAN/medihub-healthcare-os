import { NextResponse } from "next/server";
import { requireApiRole, createAdminClient } from "@/lib/api-auth";
import { runAi, SUMMARY_PROMPT } from "@/lib/ai";
import { reportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiRole(["doctor", "lab_staff"]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.profile.hospital_id) {
    return NextResponse.json({ error: "No hospital" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid report" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: appt } = await admin
    .from("appointments")
    .select("id, hospital_id, patient_id, doctor_id")
    .eq("id", parsed.data.appointmentId)
    .maybeSingle();
  if (!appt || appt.hospital_id !== auth.profile.hospital_id) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const { data: doctor } = await admin
    .from("doctors")
    .select("id")
    .eq("user_id", auth.profile.id)
    .maybeSingle();

  const doctorId = doctor?.id ?? appt.doctor_id;
  const summary = await runAi(SUMMARY_PROMPT, parsed.data.content);

  const { data: report, error } = await admin
    .from("medical_reports")
    .insert({
      hospital_id: appt.hospital_id,
      patient_id: appt.patient_id,
      doctor_id: doctorId,
      appointment_id: appt.id,
      content: parsed.data.content,
      prescription: parsed.data.prescription ?? null,
      ai_summary: summary,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("appointments").update({ status: "completed" }).eq("id", appt.id);
  await admin.from("notifications").insert({
    user_id: appt.patient_id,
    title: "Your report is ready",
    body: "A visit report and plain-language summary are available in your history.",
  });

  return NextResponse.json({ id: report.id, ai_summary: summary });
}
