import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function HospitalsPage() {
  const session = await getSessionProfile();
  let hospitals: { id: string; name: string; address: string | null; subscription_plan: string }[] = [];

  if (session) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("hospitals")
      .select("id, name, address, subscription_plan")
      .order("name");
    hospitals = data ?? [];
  } else {
    const admin = createAdminClient();
    const { data } = await admin
      .from("hospitals")
      .select("id, name, address, subscription_plan")
      .order("name");
    hospitals = data ?? [];
  }

  if (!hospitals?.length) {
    return (
      <EmptyState
        title="No accredited hospitals available"
        description="A platform administrator will onboard hospitals shortly."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Find Care & Book Consultation
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Browse accredited hospitals across Pakistan · Select a facility to pick your specialist & slot
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-primary border border-teal-200">
            {hospitals.length} Network Hospitals
          </span>
        </div>
      </div>

      {/* AI Triage Banner */}
      <div className="rounded-2xl border border-teal-300/80 bg-gradient-to-r from-teal-50/90 to-emerald-50/70 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Clinical AI
              </span>
              <p className="font-bold text-sm text-text-primary">
                Unsure which department or specialist you need?
              </p>
            </div>
            <p className="text-xs text-text-secondary">
              Select any hospital below and type your symptoms in natural language. Gemini 3.6 Flash will automatically match you with the right specialist.
            </p>
          </div>
          <Link
            href={`/book/${hospitals[0]?.id}`}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            Try AI Triage & Book →
          </Link>
        </div>
      </div>

      {/* Hospitals Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {hospitals.map((h) => {
          const isIslamabad = h.address?.toLowerCase().includes("islamabad");
          const isKarachi = h.address?.toLowerCase().includes("karachi");
          const isLahore = h.address?.toLowerCase().includes("lahore");
          const isRawalpindi = h.address?.toLowerCase().includes("rawalpindi");

          const city = isIslamabad
            ? "Islamabad"
            : isKarachi
              ? "Karachi"
              : isLahore
                ? "Lahore"
                : isRawalpindi
                  ? "Rawalpindi"
                  : "Pakistan";

          return (
            <Link key={h.id} href={`/book/${h.id}`} className="group block">
              <Card className="h-full border-border bg-surface p-5 shadow-xs transition-all hover:border-primary hover:shadow-md">
                <div className="flex flex-col justify-between h-full gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                        {city}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                        {h.subscription_plan || "Enterprise"}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                      {h.name}
                    </h2>

                    <p className="text-xs text-text-secondary">
                      {h.address ?? "Pakistan"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <span className="text-xs font-semibold text-primary group-hover:underline">
                      View Departments & Doctors →
                    </span>
                    <span className="text-[11px] font-medium text-text-secondary">
                      Live Queue Active
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
