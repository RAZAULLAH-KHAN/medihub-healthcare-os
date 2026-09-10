import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireApiRole(["receptionist", "doctor", "hospital_admin"]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const tokenId = body?.tokenId as string | undefined;
  const action = body?.action as string | undefined;
  if (!tokenId || !action) {
    return NextResponse.json({ error: "tokenId and action required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const statusMap: Record<string, string> = {
    call_next: "called",
    start: "in_progress",
    complete: "done",
    skip: "skipped",
    no_show: "no_show",
  };
  const status = statusMap[action];
  if (!status) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const { data: token, error: tErr } = await admin
    .from("queue_tokens")
    .update({
      status,
      called_at: action === "call_next" ? now : undefined,
    })
    .eq("id", tokenId)
    .select("id, token_number, appointment_id, hospital_id")
    .single();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });

  if (token?.appointment_id) {
    const apptStatus =
      action === "complete"
        ? "completed"
        : action === "no_show"
          ? "no_show"
          : action === "start"
            ? "in_progress"
            : "checked_in";

    await admin
      .from("appointments")
      .update({ status: apptStatus })
      .eq("id", token.appointment_id);

    // Fetch patient info to notify
    const { data: appt } = await admin
      .from("appointments")
      .select("patient_id, hospital_id, doctors(profiles:user_id(name))")
      .eq("id", token.appointment_id)
      .maybeSingle();

    if (appt?.patient_id) {
      if (action === "call_next") {
        await admin.from("notifications").insert({
          user_id: appt.patient_id,
          title: `Token #${token.token_number} Called!`,
          body: `Doctor is ready for you. Please proceed into the consultation room.`,
        });
      } else if (action === "start") {
        await admin.from("notifications").insert({
          user_id: appt.patient_id,
          title: `Consultation in Progress`,
          body: `Your visit has commenced.`,
        });
      }
    }
  }

  // Broadcast across hospital channel
  try {
    const hospitalId = token.hospital_id || auth.profile.hospital_id;
    if (hospitalId) {
      const channel = admin.channel(`hospital-${hospitalId}`);
      await channel.send({
        type: "broadcast",
        event: "queue_status_changed",
        payload: {
          tokenId: token.id,
          tokenNumber: token.token_number,
          status,
          action,
        },
      });
    }
  } catch {
    // Non-blocking broadcast
  }

  return NextResponse.json({ ok: true });
}
