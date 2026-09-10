import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/types";
import { SaaSNavbar } from "@/components/navigation/SaaSNavbar";

export default async function HomePage() {
  const session = await getSessionProfile();
  const href = session ? ROLE_HOME[session.profile.role] : "/signup";

  return (
    <div className="min-h-screen bg-bg text-text-primary antialiased selection:bg-teal-100 selection:text-primary">
      {/* Universal Enterprise SaaS Navbar */}
      <SaaSNavbar profile={session?.profile} />

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-teal-900">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-ping" />
            AI-Powered Multi-Hospital Network · Pakistan
          </div>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.12]">
            Modern Hospital Operating System & Live Patient Care Network
          </h1>

          <p className="mt-5 text-base sm:text-lg text-text-secondary leading-relaxed">
            MediHub connects top Pakistani hospitals—from Shifa International in Islamabad to Aga Khan in Karachi and Shaukat Khanum in Lahore—into a zero-latency digital healthcare network with live queues and Gemini 3.6 clinical AI.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={href}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-hover active:scale-[0.98] transition-all"
            >
              {session ? "Open Workspace →" : "Book a Consultation →"}
            </Link>
            <Link
              href="/hospitals"
              className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-bold text-text-primary shadow-xs hover:bg-slate-50 transition-all"
            >
              Browse Hospitals & Doctors
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-teal-200 bg-teal-50/60 px-5 py-3 text-sm font-bold text-primary hover:bg-teal-100 transition-all"
            >
              Staff Portal Sign In
            </Link>
          </div>
        </div>

        {/* Pakistani Flagship Hospitals Showcase */}
        <div className="mt-14 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Accredited Hospitals in Network
            </p>
            <Link href="/hospitals" className="text-xs font-bold text-primary hover:underline">
              View All 5 Hospitals →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Shifa International Hospital",
                city: "Islamabad",
                address: "Sector H-8/4, Islamabad",
                depts: "Cardiology · Pediatrics · Gynecology",
                plan: "JCI Accredited",
              },
              {
                name: "Aga Khan University Hospital",
                city: "Karachi",
                address: "Stadium Road, Karachi",
                depts: "Neurology & Spine · Internal Medicine",
                plan: "Flagship Academic Center",
              },
              {
                name: "Shaukat Khanum Memorial Hospital",
                city: "Lahore",
                address: "Johar Town, Lahore",
                depts: "Oncology · Dermatology · Palliative",
                plan: "Tertiary Specialized",
              },
              {
                name: "City Care General Hospital",
                city: "Rawalpindi",
                address: "Murree Road, Rawalpindi",
                depts: "Cardiology · General Medicine · Pediatrics",
                plan: "Multi-Specialty Center",
              },
              {
                name: "Metro Health Medical Complex",
                city: "Islamabad",
                address: "Blue Area, Jinnah Avenue, Islamabad",
                depts: "Orthopedic Surgery · Pulmonology",
                plan: "Surgical Center",
              },
            ].map((h) => (
              <div
                key={h.name}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-primary/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                      {h.city}
                    </span>
                    <span className="text-[10px] font-semibold text-text-secondary">
                      {h.plan}
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-bold text-text-primary">
                    {h.name}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    {h.address}
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-primary">
                    {h.depts}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/60">
                  <Link
                    href="/hospitals"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View Specialists & Book Slots →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              tag: "Real-Time Engine",
              title: "Zero-Latency Queue Token",
              body: "Instant digital token updates via Supabase WebSockets. Patients monitor their live number and wait estimate decrease from their phones without staying in crowded lobbies.",
            },
            {
              tag: "Clinical AI Engine",
              title: "Gemini 3.6 Flash Intelligence",
              body: "Instant plain-text symptom triage suggests the right department. Consultation notes and prescriptions automatically translate into plain-language patient summaries.",
            },
            {
              tag: "Enterprise Architecture",
              title: "5 Persona Multi-Tenant Isolation",
              body: "Strict PostgreSQL Row-Level Security ensures doctors, receptionists, hospital admins, super admins, and patients operate with surgical data privacy.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group relative rounded-2xl border border-border bg-surface p-6 shadow-2xs transition-all hover:border-teal-300 hover:shadow-md"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {item.tag}
              </span>
              <h2 className="mt-2 text-lg font-bold text-text-primary">{item.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">{item.body}</p>
            </div>
          ))}
        </div>

        {/* Platform Proof Metrics */}
        <div className="mt-12 rounded-2xl border border-border bg-surface p-6 shadow-xs">
          <div className="grid gap-4 sm:grid-cols-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="pt-2 sm:pt-0">
              <p className="text-3xl font-extrabold text-primary tabular-nums">5</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
                Flagship Hospitals
              </p>
            </div>
            <div className="pt-2 sm:pt-0">
              <p className="text-3xl font-extrabold text-text-primary tabular-nums">100%</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
                Row-Level Isolation
              </p>
            </div>
            <div className="pt-2 sm:pt-0">
              <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">&lt; 1s</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
                Real-Time Sync Latency
              </p>
            </div>
            <div className="pt-2 sm:pt-0">
              <p className="text-3xl font-extrabold text-text-primary">Gemini 3.6</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
                Clinical AI Engine
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
