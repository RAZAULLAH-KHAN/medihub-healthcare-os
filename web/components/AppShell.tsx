"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { SaaSNavbar } from "@/components/navigation/SaaSNavbar";
import type { Profile } from "@/lib/types";

const STAFF_NAV: Record<string, { href: string; label: string }[]> = {
  super_admin: [
    { href: "/super-admin", label: "Hospitals Overview" },
    { href: "/super-admin/onboard", label: "Onboard Hospital" },
    { href: "/notifications", label: "Notifications" },
  ],
  hospital_admin: [
    { href: "/hospital-admin", label: "Hospital Dashboard" },
    { href: "/hospital-admin/team", label: "Departments & Doctors" },
    { href: "/notifications", label: "Notifications" },
  ],
  doctor: [
    { href: "/doctor", label: "Clinical Desk & Queue" },
    { href: "/notifications", label: "Notifications" },
  ],
  receptionist: [
    { href: "/receptionist", label: "Token & Arrivals Desk" },
    { href: "/notifications", label: "Notifications" },
  ],
  lab_staff: [
    { href: "/doctor", label: "Lab Queue" },
    { href: "/notifications", label: "Notifications" },
  ],
};

export function AppShell({
  profile,
  children,
}: {
  profile?: Profile | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPatient = !profile || profile.role === "patient";
  const nav = profile ? (STAFF_NAV[profile.role] ?? []) : [];

  return (
    <div className="min-h-screen bg-bg antialiased text-text-primary">
      {/* Universal Enterprise SaaS Navbar */}
      <SaaSNavbar profile={profile} />

      <div className="flex">
        {/* Staff Sidebar for Desktop */}
        {!isPatient && profile ? (
          <aside className="hidden w-64 flex-col border-r border-border bg-surface md:flex min-h-[calc(100vh-57px)] shrink-0 shadow-xs">
            <div className="px-5 py-4 border-b border-border/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Staff Workspace
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Active
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-text-primary truncate">
                {profile.name}
              </p>
              <p className="text-xs text-text-secondary capitalize">
                {profile.role.replace("_", " ")}
              </p>
            </div>

            <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Staff navigation">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                Actions
              </p>
              {nav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-10 items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-teal-50 text-primary border border-teal-200 shadow-xs"
                        : "text-text-secondary hover:bg-slate-50 hover:text-text-primary"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-primary" : "bg-transparent"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-border/70">
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-center text-xs font-semibold text-text-secondary hover:bg-red-50 hover:text-danger hover:border-red-200 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        ) : null}

        {/* Content Area */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
