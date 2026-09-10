import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WORKING_HOURS } from "@/lib/types";
import { staffSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiRole(["hospital_admin", "super_admin"]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const hospitalId =
    auth.profile.role === "super_admin"
      ? (body.hospitalId as string | undefined)
      : auth.profile.hospital_id;
  if (!hospitalId) {
    return NextResponse.json({ error: "Missing hospital" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: created, error: uErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      name: parsed.data.name,
      role: parsed.data.role,
      hospital_id: hospitalId,
      created_by_admin: "true",
    },
  });
  if (uErr || !created.user) {
    return NextResponse.json({ error: uErr?.message ?? "Failed" }, { status: 500 });
  }

  await admin
    .from("profiles")
    .update({
      role: parsed.data.role,
      hospital_id: hospitalId,
      name: parsed.data.name,
    })
    .eq("id", created.user.id);

  if (parsed.data.role === "doctor") {
    if (!parsed.data.departmentId) {
      return NextResponse.json({ error: "Department required" }, { status: 400 });
    }
    await admin.from("doctors").insert({
      user_id: created.user.id,
      hospital_id: hospitalId,
      department_id: parsed.data.departmentId,
      specialty: parsed.data.specialty ?? "General",
      working_hours: DEFAULT_WORKING_HOURS,
    });
  }

  return NextResponse.json({ userId: created.user.id });
}
