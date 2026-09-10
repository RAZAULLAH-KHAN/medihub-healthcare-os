import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hospitalId = searchParams.get("hospitalId");
  if (!hospitalId) {
    return NextResponse.json({ error: "hospitalId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const [{ data: hospital }, { data: departments }, { data: doctors }] = await Promise.all([
    admin.from("hospitals").select("name").eq("id", hospitalId).single(),
    admin.from("departments").select("*").eq("hospital_id", hospitalId).order("name"),
    admin
      .from("doctors")
      .select("*, profiles(name)")
      .eq("hospital_id", hospitalId),
  ]);

  return NextResponse.json({
    hospitalName: hospital?.name ?? "Hospital",
    departments: departments ?? [],
    doctors: doctors ?? [],
  });
}
