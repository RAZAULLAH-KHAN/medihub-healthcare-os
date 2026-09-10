"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field, inputClass } from "@/components/ui/Field";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { generateSlots } from "@/lib/slots";
import type { Department, Doctor, WorkingHours } from "@/lib/types";

type DoctorRow = Doctor & { profiles?: { name: string } | null };

export default function BookPage({
  params,
}: {
  params: Promise<{ hospitalId: string }>;
}) {
  const router = useRouter();
  const [hospitalId, setHospitalId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [booked, setBooked] = useState<string[]>([]);
  const [deptId, setDeptId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [symptoms, setSymptoms] = useState("");
  const [suggestion, setSuggestion] = useState<{ department: string; reason: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then((p) => setHospitalId(p.hospitalId));
  }, [params]);

  useEffect(() => {
    if (!hospitalId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/doctors?hospitalId=${hospitalId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load doctors");
        setHospitalName(data.hospitalName ?? "Hospital");
        setDepartments(data.departments ?? []);
        setDoctors((data.doctors as DoctorRow[]) ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not load doctors");
      } finally {
        setLoading(false);
      }
    })();
  }, [hospitalId]);

  useEffect(() => {
    if (!doctorId) return;
    const supabase = createClient();
    supabase
      .from("appointments")
      .select("slot_time")
      .eq("doctor_id", doctorId)
      .not("status", "eq", "cancelled")
      .then(({ data }) => setBooked((data ?? []).map((r) => r.slot_time)));
  }, [doctorId]);

  const filteredDoctors = useMemo(
    () => (deptId ? doctors.filter((d) => d.department_id === deptId) : doctors),
    [doctors, deptId],
  );
  const doctor = doctors.find((d) => d.id === doctorId);
  const slots = doctor
    ? generateSlots(
        new Date(date + "T12:00:00"),
        doctor.working_hours as WorkingHours,
        doctor.slot_duration_minutes,
        booked,
      )
    : [];

  async function suggest() {
    const res = await fetch("/api/ai/triage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symptoms }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Triage failed");
      return;
    }
    setSuggestion(data);
    const match = departments.find(
      (d) => d.name.toLowerCase() === String(data.department).toLowerCase(),
    );
    if (match) setDeptId(match.id);
  }

  async function book(iso: string) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ doctorId, slotTime: iso }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Booking failed");
      return;
    }
    router.push(`/appointments?booked=${data.id}`);
  }

  if (loading) return <ListSkeleton />;
  if (error && !departments.length) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Book at {hospitalName}</h1>
        <p className="text-text-secondary">Department → doctor → time slot</p>
      </div>

      <Card>
        <Field label="Symptoms (optional — suggests a department)">
          <textarea
            className={inputClass}
            rows={2}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. chest pain"
          />
        </Field>
        <Button type="button" className="mt-3" variant="secondary" onClick={suggest}>
          Suggest department
        </Button>
        {suggestion ? (
          <p className="mt-3 text-sm text-text-secondary">
            Suggested <strong>{suggestion.department}</strong> — {suggestion.reason}
          </p>
        ) : null}
      </Card>

      {!departments.length ? (
        <EmptyState
          title="No departments"
          description="This hospital has not set up departments yet."
        />
      ) : (
        <>
          <Field label="Department">
            <select
              className={inputClass}
              value={deptId}
              onChange={(e) => {
                setDeptId(e.target.value);
                setDoctorId("");
              }}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            {filteredDoctors.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDoctorId(d.id)}
                className={`rounded-xl border p-4 text-left ${
                  doctorId === d.id ? "border-primary bg-teal-50" : "border-border bg-surface"
                }`}
              >
                <p className="font-semibold">{d.profiles?.name ?? "Doctor"}</p>
                <p className="text-sm text-text-secondary">{d.specialty}</p>
              </button>
            ))}
          </div>

          {doctor ? (
            <Card>
              <Field label="Date">
                <input
                  className={inputClass}
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <div className="mt-4 flex flex-wrap gap-2">
                {slots.length ? (
                  slots.map((s) => (
                    <Button
                      key={s.iso}
                      type="button"
                      variant="secondary"
                      disabled={saving}
                      onClick={() => book(s.iso)}
                    >
                      {s.label}
                    </Button>
                  ))
                ) : (
                  <EmptyState
                    title="No slots this day"
                    description="Try another date, or this doctor may be fully booked."
                  />
                )}
              </div>
            </Card>
          ) : (
            <StatusBadge kind="info" label="Select a doctor to see slots" />
          )}
        </>
      )}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
