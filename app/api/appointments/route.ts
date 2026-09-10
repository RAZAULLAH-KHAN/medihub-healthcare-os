import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { appointmentSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireApiRole([
    "doctor",
    "receptionist",
    "hospital_admin",
    "super_admin",
    "patient",
  ]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const hospitalId = searchParams.get("hospitalId") || auth.profile.hospital_id;
  const todayOnly = searchParams.get("today") === "true";

  const admin = createAdminClient();

  let query = admin
    .from("appointments")
    .select(
      "id, slot_time, status, is_emergency, notes, hospital_id, doctor_id, patient_id, created_at, profiles:patient_id(id, name, phone, email), doctors(id, specialty, profiles:user_id(name)), hospitals(name)",
    )
    .order("slot_time", { ascending: true });

  if (auth.profile.role === "patient") {
    query = query.eq("patient_id", auth.profile.id);
  } else if (hospitalId) {
    query = query.eq("hospital_id", hospitalId);
  }

  if (doctorId) {
    query = query.eq("doctor_id", doctorId);
  }

  if (todayOnly) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query = query.gte("slot_time", start.toISOString()).lt("slot_time", end.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ appointments: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["patient", "receptionist", "hospital_admin", "doctor"]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid slot" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const patientId =
    auth.profile.role === "patient"
      ? auth.profile.id
      : (body.patientId as string | undefined);
  if (!patientId) {
    return NextResponse.json({ error: "Patient required" }, { status: 400 });
  }

  // Fetch doctor info with profile name using admin client
  const { data: doctor, error: docErr } = await admin
    .from("doctors")
    .select("id, hospital_id, user_id, specialty, profiles:user_id(name)")
    .eq("id", parsed.data.doctorId)
    .maybeSingle();

  if (docErr || !doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  // Fetch patient profile
  const { data: patientProfile } = await admin
    .from("profiles")
    .select("name, email, phone")
    .eq("id", patientId)
    .maybeSingle();

  // Fetch hospital info
  const { data: hospital } = await admin
    .from("hospitals")
    .select("name")
    .eq("id", doctor.hospital_id)
    .maybeSingle();

  const { data: clash } = await admin
    .from("appointments")
    .select("id")
    .eq("doctor_id", parsed.data.doctorId)
    .eq("slot_time", parsed.data.slotTime)
    .not("status", "eq", "cancelled")
    .maybeSingle();
  if (clash) {
    return NextResponse.json({ error: "That slot is already booked" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("appointments")
    .insert({
      hospital_id: doctor.hospital_id,
      patient_id: patientId,
      doctor_id: parsed.data.doctorId,
      slot_time: parsed.data.slotTime,
      status: "booked",
    })
    .select("id, slot_time, status, hospital_id, doctor_id, patient_id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const patientName = patientProfile?.name || "Patient";
  const doctorName = (doctor.profiles as unknown as { name: string } | null)?.name || "Doctor";
  const hospitalName = hospital?.name || "Hospital";
  const formattedTime = new Date(parsed.data.slotTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  // Insert real-time notification for the assigned Doctor
  if (doctor.user_id) {
    await admin.from("notifications").insert({
      user_id: doctor.user_id,
      title: "New Patient Appointment",
      body: `${patientName} booked a consultation for ${formattedTime} (${doctor.specialty || "General"}).`,
    });
  }

  // Insert real-time notification for the Patient
  await admin.from("notifications").insert({
    user_id: patientId,
    title: "Appointment Confirmed",
    body: `Your consultation with ${doctorName} at ${hospitalName} is confirmed for ${formattedTime}.`,
  });

  // Broadcast real-time event across the hospital channel
  try {
    const channel = admin.channel(`hospital-${doctor.hospital_id}`);
    await channel.send({
      type: "broadcast",
      event: "appointment_booked",
      payload: {
        id: data.id,
        hospital_id: doctor.hospital_id,
        doctor_id: parsed.data.doctorId,
        doctor_name: doctorName,
        patient_id: patientId,
        patient_name: patientName,
        specialty: doctor.specialty || "General",
        slot_time: parsed.data.slotTime,
        status: "booked",
        created_at: data.created_at,
      },
    });
  } catch {
    // Non-blocking broadcast fallback
  }

  return NextResponse.json({
    id: data.id,
    appointment: {
      ...data,
      patient_name: patientName,
      doctor_name: doctorName,
      specialty: doctor.specialty,
      hospital_name: hospitalName,
    },
  });
}
