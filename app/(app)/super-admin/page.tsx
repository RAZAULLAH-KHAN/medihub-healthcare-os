import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function SuperAdminPage() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();
  const { data: hospitals } = await supabase.from("hospitals").select("*").order("name");

  const cards = await Promise.all(
    (hospitals ?? []).map(async (h) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [{ count: patients }, { count: staff }, { count: appts }] = await Promise.all([
        supabase
          .from("appointments")
          .select("patient_id", { count: "exact", head: true })
          .eq("hospital_id", h.id),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("hospital_id", h.id)
          .is("deleted_at", null),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("hospital_id", h.id)
          .gte("slot_time", todayStart.toISOString()),
      ]);
      return { ...h, patients: patients ?? 0, staff: staff ?? 0, today: appts ?? 0 };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Hospital Network Portfolio
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Multi-tenant hospital onboarding, tier management & system-wide patient activity
          </p>
        </div>
        <Link
          href="/super-admin/onboard"
          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-all active:scale-[0.98]"
        >
          + Onboard New Hospital
        </Link>
      </div>
      {!cards.length ? (
        <EmptyState
          title="No hospitals onboarded"
          description="Create the first tenant hospital and its admin account."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((h) => (
            <Card key={h.id}>
              <h2 className="text-lg font-semibold">{h.name}</h2>
              <p className="text-text-secondary">{h.address}</p>
              <p className="mt-3 text-sm text-text-secondary">{h.subscription_plan} plan</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <dt className="text-xs text-text-secondary">Visit rows</dt>
                  <dd className="text-xl font-semibold">{h.patients}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-secondary">Staff</dt>
                  <dd className="text-xl font-semibold">{h.staff}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-secondary">Today</dt>
                  <dd className="text-xl font-semibold">{h.today}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
