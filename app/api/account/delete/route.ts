import { NextResponse } from "next/server";
import { requireApiRole, createAdminClient } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireApiRole([
    "patient",
    "doctor",
    "receptionist",
    "hospital_admin",
    "lab_staff",
    "super_admin",
  ]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const id = auth.user.id;

  await admin.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  await admin.from("appointments").update({ status: "cancelled" }).eq("patient_id", id).eq("status", "booked");
  await admin.from("notifications").delete().eq("user_id", id);
  await admin.from("reminders").delete().eq("user_id", id);
  await admin.auth.admin.deleteUser(id);

  return NextResponse.json({ ok: true });
}
