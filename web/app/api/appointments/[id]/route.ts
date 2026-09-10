import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiRole(["patient", "receptionist", "hospital_admin"]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const supabase = await createClient();

  if (body.action === "cancel") {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reschedule") {
    const slotTime = body.slotTime as string;
    if (!slotTime) {
      return NextResponse.json({ error: "slotTime required" }, { status: 400 });
    }
    const { error } = await supabase
      .from("appointments")
      .update({ slot_time: slotTime, status: "booked" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
