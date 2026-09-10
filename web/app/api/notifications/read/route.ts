import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireApiRole([
    "patient",
    "doctor",
    "receptionist",
    "hospital_admin",
    "lab_staff",
    "super_admin",
  ]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();
  if (body.id) {
    await supabase.from("notifications").update({ read: true }).eq("id", body.id);
  } else {
    await supabase.from("notifications").update({ read: true }).eq("user_id", auth.profile.id);
  }
  return NextResponse.json({ ok: true });
}
