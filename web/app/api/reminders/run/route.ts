import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const header = request.headers.get("authorization");
  const ok =
    Boolean(secret) &&
    (header === `Bearer ${secret}` || searchParams.get("secret") === secret);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const in25h = new Date(now + 25 * 3600 * 1000).toISOString();
  const in23h = new Date(now + 23 * 3600 * 1000).toISOString();
  const in90m = new Date(now + 90 * 60 * 1000).toISOString();
  const in50m = new Date(now + 50 * 60 * 1000).toISOString();

  const { data: upcoming } = await admin
    .from("appointments")
    .select("id, patient_id, slot_time, hospital_id")
    .eq("status", "booked")
    .gte("slot_time", new Date(now).toISOString())
    .lte("slot_time", in25h);

  let created = 0;
  for (const appt of upcoming ?? []) {
    const t = new Date(appt.slot_time).getTime();
    const windows: { type: string; match: boolean }[] = [
      { type: "appointment_24h", match: t >= new Date(in23h).getTime() && t <= new Date(in25h).getTime() },
      { type: "appointment_1h", match: t >= new Date(in50m).getTime() && t <= new Date(in90m).getTime() },
    ];
    for (const w of windows) {
      if (!w.match) continue;
      const { data: existing } = await admin
        .from("reminders")
        .select("id")
        .eq("appointment_id", appt.id)
        .eq("type", w.type)
        .maybeSingle();
      if (existing) continue;

      await admin.from("reminders").insert({
        user_id: appt.patient_id,
        type: w.type,
        target_time: appt.slot_time,
        sent_at: new Date().toISOString(),
        channel: "in_app",
        appointment_id: appt.id,
      });
      await admin.from("notifications").insert({
        user_id: appt.patient_id,
        title: w.type === "appointment_24h" ? "Appointment tomorrow" : "Appointment in about 1 hour",
        body: "Please arrive a few minutes early. You can track your queue in MediHub.",
      });
      created += 1;
    }
  }

  return NextResponse.json({ created });
}

export async function GET(request: Request) {
  return POST(request);
}
