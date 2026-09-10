"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";

type Dept = { id: string; name: string };
type Doc = {
  id: string;
  specialty: string | null;
  department_id: string;
  profiles: { name: string; email: string } | null;
};

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: userRes } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", userRes.user?.id)
      .single();
    if (!profile?.hospital_id) {
      setLoading(false);
      return;
    }
    const [{ data: d }, { data: doctors }] = await Promise.all([
      supabase.from("departments").select("id, name").eq("hospital_id", profile.hospital_id),
      supabase
        .from("doctors")
        .select("id, specialty, department_id, profiles(name, email)")
        .eq("hospital_id", profile.hospital_id),
    ]);
    setDepts(d ?? []);
    setDocs((doctors as unknown as Doc[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addDept(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    const supabase = createClient();
    const { data: userRes } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("id", userRes.user?.id)
      .single();
    const { error: err } = await supabase.from("departments").insert({
      name,
      hospital_id: profile?.hospital_id,
    });
    if (err) setError(err.message);
    e.currentTarget.reset();
    load();
  }

  async function addStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
        departmentId: fd.get("departmentId") || undefined,
        specialty: fd.get("specialty") || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setError(null);
      e.currentTarget.reset();
      load();
    }
  }

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Departments & staff</h1>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Card>
        <h2 className="font-semibold">Add department</h2>
        <form onSubmit={addDept} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input className={inputClass} name="name" placeholder="Cardiology" required />
          <Button type="submit">Add</Button>
        </form>
        <ul className="mt-4 flex flex-wrap gap-2">
          {depts.map((d) => (
            <li key={d.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
              {d.name}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold">Invite staff</h2>
        <form onSubmit={addStaff} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputClass} name="name" required />
          </Field>
          <Field label="Email">
            <input className={inputClass} name="email" type="email" required />
          </Field>
          <Field label="Temp password">
            <input className={inputClass} name="password" type="password" required minLength={8} />
          </Field>
          <Field label="Role">
            <select className={inputClass} name="role" defaultValue="doctor">
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="lab_staff">Lab staff</option>
              <option value="hospital_admin">Hospital admin</option>
            </select>
          </Field>
          <Field label="Department (doctors)">
            <select className={inputClass} name="departmentId">
              <option value="">Select</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Specialty">
            <input className={inputClass} name="specialty" placeholder="Cardiology" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit">Create staff account</Button>
          </div>
        </form>
      </Card>

      {!docs.length ? (
        <EmptyState title="No doctors yet" description="Add a department, then invite a doctor." />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <p className="font-semibold">{d.profiles?.name}</p>
              <p className="text-sm text-text-secondary">
                {d.specialty} · {d.profiles?.email}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
