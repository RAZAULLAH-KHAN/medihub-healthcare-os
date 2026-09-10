import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { runAi, TRIAGE_PROMPT } from "@/lib/ai";
import { triageSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiRole(["patient"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = await request.json().catch(() => null);
  const parsed = triageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }
  const raw = await runAi(TRIAGE_PROMPT, parsed.data.symptoms);
  let department = "General Medicine";
  let reason = raw;
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const json = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      department = json.department ?? department;
      reason = json.reason ?? reason;
    }
  } catch {
    /* fallback text */
  }
  return NextResponse.json({ department, reason });
}
