import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { onboardHospitalSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiRole(["super_admin"]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardHospitalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: hospital, error: hErr } = await admin
    .from("hospitals")
    .insert({
      name: parsed.data.hospitalName,
      address: parsed.data.address,
      subscription_plan: parsed.data.subscriptionPlan,
    })
    .select("id")
    .single();
  if (hErr || !hospital) {
    return NextResponse.json({ error: hErr?.message ?? "Failed" }, { status: 500 });
  }

  const { data: created, error: uErr } = await admin.auth.admin.createUser({
    email: parsed.data.adminEmail,
    password: parsed.data.adminPassword,
    email_confirm: true,
    user_metadata: {
      name: parsed.data.adminName,
      role: "hospital_admin",
      hospital_id: hospital.id,
      created_by_admin: "true",
    },
  });
  if (uErr || !created.user) {
    await admin.from("hospitals").delete().eq("id", hospital.id);
    return NextResponse.json({ error: uErr?.message ?? "User failed" }, { status: 500 });
  }

  await admin
    .from("profiles")
    .update({
      role: "hospital_admin",
      hospital_id: hospital.id,
      name: parsed.data.adminName,
    })
    .eq("id", created.user.id);

  await admin.from("audit_logs").insert({
    hospital_id: hospital.id,
    user_id: auth.profile.id,
    action: "onboard_hospital",
    table_name: "hospitals",
    record_id: hospital.id,
  });

  return NextResponse.json({ hospitalId: hospital.id });
}
