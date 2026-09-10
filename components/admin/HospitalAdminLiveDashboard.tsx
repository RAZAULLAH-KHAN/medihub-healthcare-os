"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

export function HospitalAdminLiveDashboard({
  hospitalId,
  hospitalName,
  initialTodayCount,
  initialAvgWait,
  initialNoShowRate,
}: {
  hospitalId: string;
  hospitalName: string;
  initialTodayCount: number;
  initialAvgWait: number;
  initialNoShowRate: number;
}) {
  const [todayCount, setTodayCount] = useState(initialTodayCount);
  const [avgWait, setAvgWait] = useState(initialAvgWait);
  const [noShowRate, setNoShowRate] = useState(initialNoShowRate);

  const refreshMetrics = async () => {
    try {
      const supabase = createClient();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [{ count }, { data: appts }, { data: tokens }] = await Promise.all([
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("hospital_id", hospitalId)
          .gte("slot_time", start.toISOString())
          .lt("slot_time", end.toISOString()),
        supabase.from("appointments").select("status").eq("hospital_id", hospitalId),
        supabase
          .from("queue_tokens")
          .select("called_at, created_at, status")
          .eq("hospital_id", hospitalId),
      ]);

      if (count !== null) setTodayCount(count);

      const total = appts?.length ?? 0;
      const noShows = appts?.filter((a) => a.status === "no_show").length ?? 0;
      setNoShowRate(total ? Math.round((noShows / total) * 100) : 0);

      const waits = (tokens ?? [])
        .filter((t) => t.called_at)
        .map((t) => new Date(t.called_at!).getTime() - new Date(t.created_at).getTime());
      setAvgWait(
        waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length / 60000) : 0,
      );
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`hospital-admin-${hospitalId}`)
      .on("broadcast", { event: "appointment_booked" }, () => refreshMetrics())
      .on("broadcast", { event: "queue_updated" }, () => refreshMetrics())
      .subscribe();

    const interval = setInterval(refreshMetrics, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [hospitalId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {hospitalName}
          </h1>
          <p className="text-sm text-text-secondary">
            Live Hospital Operations & Throughput Analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshMetrics}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-slate-50 transition-colors shadow-xs"
          >
            Refresh Metrics
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Appointments Today
          </p>
          <p className="mt-2 text-3xl font-extrabold text-primary tabular-nums">
            {todayCount}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Updates in real-time as patients book
          </p>
        </Card>

        <Card className="border-border p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Avg Wait Time
          </p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600 tabular-nums">
            {avgWait} <span className="text-base font-normal text-text-secondary">min</span>
          </p>
          <p className="text-xs text-text-secondary mt-1">
            From check-in to consultation call
          </p>
        </Card>

        <Card className="border-border p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            No-Show Rate
          </p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600 tabular-nums">
            {noShowRate}%
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Historical attendance completion
          </p>
        </Card>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              Hospital Clinical Staff & Departments
            </h2>
            <p className="text-xs text-text-secondary">
              Configure specialty departments, assign doctors, and set consultation slot schedules.
            </p>
          </div>
          <Link
            href="/hospital-admin/team"
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
          >
            Manage Staff & Departments →
          </Link>
        </div>
      </div>
    </div>
  );
}
