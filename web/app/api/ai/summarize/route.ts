import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-auth";
import { runAi, SUMMARY_PROMPT } from "@/lib/ai";

export async function POST(request: Request) {
  const auth = await requireApiRole(["doctor", "lab_staff"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = await request.json().catch(() => null);
  const content = String(body?.content ?? "").trim();
  if (content.length < 10) {
    return NextResponse.json({ error: "Report text required" }, { status: 400 });
  }
  const summary = await runAi(SUMMARY_PROMPT, content);
  return NextResponse.json({ summary });
}
