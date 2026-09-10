import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireRole(["patient"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("medical_reports")
    .select("*, hospitals(name)")
    .eq("id", id)
    .eq("patient_id", profile.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Visit report</h1>
      <p className="text-text-secondary">
        {(data.hospitals as unknown as { name: string } | null)?.name} ·{" "}
        {new Date(data.created_at).toLocaleString()}
      </p>
      {data.ai_summary ? (
        <Card className="border-primary/30 bg-teal-50/40">
          <p className="text-sm font-medium text-primary">Plain-language summary</p>
          <p className="mt-2 whitespace-pre-wrap">{data.ai_summary}</p>
          <p className="mt-3 text-sm text-text-secondary">
            AI-generated summary — consult your doctor for full details. This is
            not a diagnosis and does not replace medical advice.
          </p>
        </Card>
      ) : null}
      <Card>
        <h2 className="font-semibold">Full report</h2>
        <p className="mt-2 whitespace-pre-wrap">{data.content}</p>
        {data.prescription ? (
          <>
            <h2 className="mt-4 font-semibold">Prescription</h2>
            <p className="mt-2 whitespace-pre-wrap">{data.prescription}</p>
          </>
        ) : null}
      </Card>
    </div>
  );
}
