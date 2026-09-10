"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fastSwitchPersona, logout } from "@/app/actions/auth";
import { DEMO_PERSONAS } from "@/lib/demo-personas";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export type SaaSNavbarProps = {
  profile?: Profile | null;
  activeHospitalName?: string | null;
};

const PLATFORM_FEATURES = [
  {
    title: "AI Symptom Triage",
    href: "/hospitals",
    badge: "Gemini 3.6 Flash",
    description: "Matches natural language symptoms to clinical specialties across all 5 hospitals.",
  },
  {
    title: "Live Queue Engine",
    href: "/queue",
    badge: "Zero-Latency",
    description: "Real-time token tracking, wait time estimation & live consultation call notifications.",
  },
  {
    title: "Plain-Language Summaries",
    href: "/reports",
    badge: "Clinical AI",
    description: "Translates doctor prescriptions, diagnostic terms & lab results into clear patient summaries.",
  },
  {
    title: "Multi-Hospital Network",
    href: "/hospitals",
    badge: "5 Facilities",
    description: "Accredited facilities across Islamabad, Karachi, Lahore & Rawalpindi with unified booking.",
  },
];

function formatDisplayName(name?: string | null): string {
  if (!name) return "User";
  const parts = name.trim().split(/\s+/);
  if (parts[0].toLowerCase() === "dr." && parts.length > 1) {
    return `${parts[0]} ${parts[1]}`;
  }
  if (name.toLowerCase().includes("super admin")) {
    return "Super Admin";
  }
  return parts.slice(0, 2).join(" ");
}

export function SaaSNavbar({ profile, activeHospitalName }: SaaSNavbarProps) {
  const pathname = usePathname();
  const [workspacesOpen, setWorkspacesOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const workspacesRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (workspacesRef.current && !workspacesRef.current.contains(event.target as Node)) {
        setWorkspacesOpen(false);
      }
      if (featuresRef.current && !featuresRef.current.contains(event.target as Node)) {
        setFeaturesOpen(false);
      }
      if (demoRef.current && !demoRef.current.contains(event.target as Node)) {
        setDemoOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setWorkspacesOpen(false);
    setFeaturesOpen(false);
    setDemoOpen(false);
    setProfileOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Real-time unread notifications for logged-in user
  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();

    async function fetchUnread() {
      try {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile!.id)
          .eq("read", false);
        setUnreadCount(count ?? 0);
      } catch {
        // Non-blocking
      }
    }

    fetchUnread();

    const channel = supabase
      .channel(`navbar-notifs-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => fetchUnread(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const isPatient = profile?.role === "patient";
  const isStaff = profile && profile.role !== "patient";

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "G";

  const currentRoleTitle = profile
    ? profile.role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "Guest";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Identity & Station Tag */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white font-black text-xs shadow-xs group-hover:bg-teal-800 transition-colors">
              M
            </span>
            <span className="text-base font-black tracking-tight text-slate-900">
              MediHub
            </span>
          </Link>

          {/* Dynamic Badge: Network Badge for Guests/Patients, Facility Station for Staff */}
          {isStaff ? (
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <span className="text-slate-300 font-light">/</span>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                {activeHospitalName ?? (profile.role === "super_admin" ? "Platform HQ" : "City Care General · Rawalpindi")}
              </span>
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-black uppercase text-teal-800 border border-teal-200">
                {profile.role.replace("_", " ")}
              </span>
            </div>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-900 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse" />
              <span>Pakistan Network</span>
            </div>
          )}
        </div>

        {/* Center: Context-Tailored Clean Navigation (No Text Wrapping!) */}
        <nav className="hidden md:flex items-center gap-1 shrink-0" aria-label="Main Navigation">
          {isPatient ? (
            <>
              <Link
                href="/hospitals"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  pathname.startsWith("/hospitals") || pathname.startsWith("/book")
                    ? "bg-teal-50 text-teal-900 border border-teal-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Find Care & Book
              </Link>
              <Link
                href="/queue"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  pathname === "/queue"
                    ? "bg-teal-50 text-teal-900 border border-teal-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Live Queue
              </Link>
              <Link
                href="/appointments"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  pathname.startsWith("/appointments")
                    ? "bg-teal-50 text-teal-900 border border-teal-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                My Visits
              </Link>
              <Link
                href="/reports"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  pathname.startsWith("/reports")
                    ? "bg-teal-50 text-teal-900 border border-teal-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Medical Records
              </Link>
            </>
          ) : isStaff ? (
            <>
              <Link
                href="/hospitals"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  pathname.startsWith("/hospitals")
                    ? "bg-teal-50 text-teal-900 border border-teal-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Network Hospitals
              </Link>
              <Link
                href="/queue"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  pathname === "/queue"
                    ? "bg-teal-50 text-teal-900 border border-teal-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Live Queue Monitor
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/hospitals"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  pathname.startsWith("/hospitals") || pathname.startsWith("/book")
                    ? "bg-teal-50 text-teal-900 border border-teal-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Find Care & Hospitals
              </Link>
            </>
          )}

          {/* Role Workspaces Mega-Menu Dropdown */}
          <div className="relative" ref={workspacesRef}>
            <button
              type="button"
              onClick={() => {
                setWorkspacesOpen(!workspacesOpen);
                setFeaturesOpen(false);
                setDemoOpen(false);
              }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                workspacesOpen
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>Workspaces</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {workspacesOpen ? (
              <div className="absolute top-full left-0 mt-2 w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in duration-150">
                <div className="px-2 py-1.5 border-b border-slate-100 mb-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Clinical & Administrative Desks
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    1-click authentication to launch any role workspace:
                  </p>
                </div>

                <div className="space-y-1.5">
                  {DEMO_PERSONAS.map((p) => {
                    const isCurrent = profile?.role === p.role;
                    return (
                      <div
                        key={p.key}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 transition-all hover:bg-teal-50/70 hover:border-teal-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              {p.title}
                            </span>
                            <span className="rounded-md bg-slate-200/80 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-slate-700">
                              {p.badge}
                            </span>
                          </div>
                          {isCurrent ? (
                            <span className="rounded-full bg-teal-100 px-2 py-0.2 text-[9px] font-black uppercase text-teal-900 border border-teal-300">
                              Active
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-0.5 text-[11px] text-slate-600 leading-snug">
                          {p.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                          <span className="text-[11px] font-mono text-slate-500 truncate max-w-[190px]">
                            {p.email}
                          </span>
                          {isCurrent ? (
                            <Link
                              href={p.destination}
                              className="rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-teal-800 transition-colors"
                            >
                              Open Desk →
                            </Link>
                          ) : (
                            <form action={fastSwitchPersona}>
                              <input type="hidden" name="email" value={p.email} />
                              <input type="hidden" name="destination" value={p.destination} />
                              <button
                                type="submit"
                                className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-teal-700 transition-colors"
                              >
                                Launch →
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Capabilities Mega-Menu Dropdown */}
          <div className="relative" ref={featuresRef}>
            <button
              type="button"
              onClick={() => {
                setFeaturesOpen(!featuresOpen);
                setWorkspacesOpen(false);
                setDemoOpen(false);
              }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                featuresOpen
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>Platform AI</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {featuresOpen ? (
              <div className="absolute top-full left-0 mt-2 w-88 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in duration-150">
                <div className="px-2 py-1.5 border-b border-slate-100 mb-1.5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Clinical AI & Platform Infrastructure
                  </p>
                </div>

                <div className="space-y-1">
                  {PLATFORM_FEATURES.map((f) => (
                    <Link
                      key={f.title}
                      href={f.href}
                      className="block rounded-xl border border-transparent p-2 transition-all hover:bg-teal-50 hover:border-teal-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">
                          {f.title}
                        </span>
                        <span className="rounded-md bg-teal-50 px-1.5 py-0.2 text-[9px] font-black uppercase text-teal-900 border border-teal-200">
                          {f.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-600 leading-snug">
                        {f.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </nav>

        {/* Right Controls: Unified 32px-34px Height & Perfect Alignment */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Sync Status Badge */}
          <div className="hidden xl:inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-800 shrink-0 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Live Sync</span>
          </div>

          {/* Quick Demo Persona Switcher */}
          <div className="relative" ref={demoRef}>
            <button
              type="button"
              onClick={() => {
                setDemoOpen(!demoOpen);
                setWorkspacesOpen(false);
                setFeaturesOpen(false);
              }}
              className="h-8 flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100 transition-colors shadow-xs shrink-0 whitespace-nowrap"
            >
              <span>Demo Switcher</span>
              <span className="text-[10px] text-teal-700 font-black">▾</span>
            </button>

            {demoOpen ? (
              <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in duration-150">
                <div className="px-2 py-1 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-900">
                    1-Click Persona Switcher
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click any persona to immediately authenticate and switch workspaces:
                  </p>
                </div>

                <div className="mt-2 space-y-1">
                  {DEMO_PERSONAS.map((p) => {
                    const isCurrent = profile?.role === p.role;
                    return (
                      <form key={p.key} action={fastSwitchPersona}>
                        <input type="hidden" name="email" value={p.email} />
                        <input type="hidden" name="destination" value={p.destination} />
                        <button
                          type="submit"
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all border ${
                            isCurrent
                              ? "bg-teal-50 border-teal-200 text-teal-900"
                              : "bg-slate-50 border-slate-100 text-slate-800 hover:bg-teal-50 hover:border-teal-200"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold leading-tight">
                              {p.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {p.hospital.split(",")[0]}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-teal-800">
                            {isCurrent ? "Active" : "Switch →"}
                          </span>
                        </button>
                      </form>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Notifications Alerts (Sleek Square Icon Button) */}
          {profile ? (
            <Link
              href="/notifications"
              className={`relative flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition-all shrink-0 ${
                pathname === "/notifications"
                  ? "border-teal-300 bg-teal-50 text-teal-900 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
              }`}
              title="Notifications"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white shadow-xs">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          {/* Account Profile Menu with Properly Formatted Name */}
          {profile ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="h-8 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 hover:bg-slate-50 transition-colors shrink-0 shadow-xs"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-700 text-white font-extrabold text-[10px]">
                  {initials}
                </span>
                <span className="hidden sm:inline text-xs font-bold text-slate-800 max-w-[130px] truncate">
                  {formatDisplayName(profile.name)}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">▾</span>
              </button>

              {profileOpen ? (
                <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in duration-150">
                  <div className="px-2 py-1.5 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-900 truncate">
                      {profile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {profile.email}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="rounded-md bg-teal-50 px-1.5 py-0.2 text-[9px] font-black uppercase text-teal-800 border border-teal-200">
                        {currentRoleTitle}
                      </span>
                    </div>
                  </div>

                  <div className="py-1.5 space-y-0.5">
                    <Link
                      href="/profile"
                      className="block rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    >
                      Account Settings
                    </Link>
                    <Link
                      href="/notifications"
                      className="block rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    >
                      Alert Notifications
                    </Link>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100">
                    <form action={logout}>
                      <button
                        type="submit"
                        className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href="/login"
                className="h-8 flex items-center rounded-lg px-3 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors shrink-0 whitespace-nowrap"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="h-8 flex items-center rounded-lg bg-teal-700 px-3 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-colors shrink-0 whitespace-nowrap"
              >
                Book Care
              </Link>
            </div>
          )}

          {/* Mobile Navigation Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0"
            aria-label="Toggle navigation"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen ? (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Quick Navigation
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/hospitals"
              className="rounded-lg border border-slate-200 p-2 text-center text-xs font-bold text-slate-800 hover:bg-teal-50 hover:border-teal-200"
            >
              Find Care
            </Link>
            <Link
              href="/queue"
              className="rounded-lg border border-slate-200 p-2 text-center text-xs font-bold text-slate-800 hover:bg-teal-50 hover:border-teal-200"
            >
              Live Queue
            </Link>
            <Link
              href="/appointments"
              className="rounded-lg border border-slate-200 p-2 text-center text-xs font-bold text-slate-800 hover:bg-teal-50 hover:border-teal-200"
            >
              My Visits
            </Link>
            <Link
              href="/reports"
              className="rounded-lg border border-slate-200 p-2 text-center text-xs font-bold text-slate-800 hover:bg-teal-50 hover:border-teal-200"
            >
              Medical Records
            </Link>
          </div>

          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 pt-2 border-t border-slate-100">
            1-Click Role Switcher
          </p>
          <div className="space-y-1">
            {DEMO_PERSONAS.map((p) => (
              <form key={p.key} action={fastSwitchPersona}>
                <input type="hidden" name="email" value={p.email} />
                <input type="hidden" name="destination" value={p.destination} />
                <button
                  type="submit"
                  className="w-full flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-800 hover:bg-teal-50"
                >
                  <span>{p.title}</span>
                  <span className="text-[10px] text-teal-700">Launch →</span>
                </button>
              </form>
            ))}
          </div>

          {profile ? (
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-600">
                {formatDisplayName(profile.name)}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
