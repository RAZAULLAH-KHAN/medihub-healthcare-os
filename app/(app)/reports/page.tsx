import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ReportsPage() {
  const { profile } = await requireRole(["patient"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("medical_reports")
    .select("id, created_at, ai_summary, hospitals(name)")
    .eq("patient_id", profile.id)
    .order("created_at", { ascending: false });

  if (!data?.length) {
    return (
      <EmptyState
        title="No reports yet"
        description="After a visit, your doctor’s notes and an AI summary will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Medical history</h1>
      {data.map((r) => (
        <Link key={r.id} href={`/reports/${r.id}`}>
          <Card className="hover:border-primary">
            <p className="font-semibold">
              {(r.hospitals as unknown as { name: string } | null)?.name}
            </p>
            <p className="text-sm text-text-secondary">
              {new Date(r.created_at).toLocaleString()}
            </p>
            <p className="mt-2 line-clamp-2 text-text-secondary">
              {r.ai_summary ?? "Open to read the full report"}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
