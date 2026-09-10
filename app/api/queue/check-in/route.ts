import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireApiRole([
    "patient",
    "receptionist",
    "hospital_admin",
    "doctor",
  ]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const appointmentId = body?.appointmentId as string | undefined;
  const emergency = Boolean(body?.emergency);
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data, error } = await supabase.rpc("check_in_appointment", {
    p_appointment_id: appointmentId,
    p_emergency: emergency,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fetch appointment info to notify patient and broadcast
  const { data: appt } = await admin
    .from("appointments")
    .select("id, hospital_id, patient_id, doctor_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (appt) {
    const tokenNumber = typeof data === "object" && data !== null && "token_number" in data
      ? (data as { token_number: number }).token_number
      : data;

    // Notify patient of check-in and token number
    await admin.from("notifications").insert({
      user_id: appt.patient_id,
      title: "Checked In — Token Issued",
      body: `You are checked in! Your live queue token is #${tokenNumber}${emergency ? " (Emergency Priority)" : ""}. Track your position in Live Queue.`,
    });

    // Broadcast across hospital channel
    try {
      const channel = admin.channel(`hospital-${appt.hospital_id}`);
      await channel.send({
        type: "broadcast",
        event: "queue_updated",
        payload: {
          appointmentId,
          hospitalId: appt.hospital_id,
          doctorId: appt.doctor_id,
          tokenNumber,
          emergency,
          action: "check_in",
        },
      });
    } catch {
      // Non-blocking broadcast
    }
  }

  return NextResponse.json({ token: data });
}
