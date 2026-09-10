import { NextResponse } from "next/server";
import { requireApiRole, createAdminClient } from "@/lib/api-auth";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireApiRole(["doctor", "lab_staff"]);
  if (auth.error || !auth.profile) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const form = await request.formData();
  const file = form.get("file");
  const reportId = String(form.get("reportId") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, JPG, and PNG files are allowed" },
      { status: 400 },
    );
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "File must be 10MB or smaller" }, { status: 400 });
  }

  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const path = `${auth.profile.hospital_id}/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("medical-files").upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (reportId) {
    const { data: report } = await admin
      .from("medical_reports")
      .select("attachments")
      .eq("id", reportId)
      .maybeSingle();
    const attachments = [...(report?.attachments ?? []), path];
    await admin.from("medical_reports").update({ attachments }).eq("id", reportId);
  }

  return NextResponse.json({ path });
}
