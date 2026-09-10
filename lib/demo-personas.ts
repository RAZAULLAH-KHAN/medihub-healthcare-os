import type { UserRole } from "@/lib/types";

export type DemoPersona = {
  key: string;
  role: UserRole;
  title: string;
  email: string;
  hospital: string;
  destination: string;
  badge: string;
  description: string;
};

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    key: "doctor",
    role: "doctor",
    title: "Dr. Sarah (Cardiology)",
    email: "dr.sarah@citycare.local",
    hospital: "City Care General, Rawalpindi",
    destination: "/doctor",
    badge: "Clinical",
    description: "Live booked schedule, real-time queue caller & clinical charting",
  },
  {
    key: "receptionist",
    role: "receptionist",
    title: "Reception Intake Desk",
    email: "reception@citycare.local",
    hospital: "City Care General, Rawalpindi",
    destination: "/receptionist",
    badge: "Front Desk",
    description: "Real-time arrivals board, token issuance & lobby queue dispatch",
  },
  {
    key: "patient",
    role: "patient",
    title: "Patient (Ali Hassan)",
    email: "patient.ali@example.com",
    hospital: "All Pakistani Facilities",
    destination: "/appointments",
    badge: "Patient Portal",
    description: "Doctor slot booking, live token queue position & AI medical records",
  },
  {
    key: "hospital_admin",
    role: "hospital_admin",
    title: "Hospital Operations Admin",
    email: "admin1@citycare.local",
    hospital: "City Care General, Rawalpindi",
    destination: "/hospital-admin",
    badge: "Operations",
    description: "Live operational throughput, doctor rosters, wait times & KPIs",
  },
  {
    key: "super_admin",
    role: "super_admin",
    title: "Platform Super Admin",
    email: "superadmin@medihub.local",
    hospital: "MediHub Platform SaaS",
    destination: "/super-admin",
    badge: "Platform HQ",
    description: "Multi-hospital onboarding, subscription tiers & network audit logs",
  },
];
