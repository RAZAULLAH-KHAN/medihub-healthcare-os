export type UserRole =
  | "super_admin"
  | "hospital_admin"
  | "doctor"
  | "receptionist"
  | "lab_staff"
  | "patient";

export type AppointmentStatus =
  | "booked"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type QueueStatus =
  | "waiting"
  | "called"
  | "in_progress"
  | "done"
  | "skipped"
  | "no_show";

export type Profile = {
  id: string;
  email: string;
  role: UserRole;
  hospital_id: string | null;
  name: string;
  phone: string | null;
  deleted_at: string | null;
};

export type Hospital = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  subscription_plan: string;
};

export type Department = {
  id: string;
  hospital_id: string;
  name: string;
};

export type DayHours = { start: string; end: string } | null;

export type WorkingHours = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
};

export type Doctor = {
  id: string;
  user_id: string;
  hospital_id: string;
  department_id: string;
  specialty: string | null;
  slot_duration_minutes: number;
  working_hours: WorkingHours;
};

export type Appointment = {
  id: string;
  hospital_id: string;
  patient_id: string;
  doctor_id: string;
  slot_time: string;
  status: AppointmentStatus;
  is_emergency: boolean;
  notes: string | null;
};

export type QueueToken = {
  id: string;
  hospital_id: string;
  department_id: string | null;
  appointment_id: string | null;
  token_number: number;
  status: QueueStatus;
  is_emergency: boolean;
  called_at: string | null;
  service_date: string;
};

export type MedicalReport = {
  id: string;
  hospital_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  content: string;
  prescription: string | null;
  ai_summary: string | null;
  attachments: string[];
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: { start: "09:00", end: "17:00" },
  tue: { start: "09:00", end: "17:00" },
  wed: { start: "09:00", end: "17:00" },
  thu: { start: "09:00", end: "17:00" },
  fri: { start: "09:00", end: "17:00" },
  sat: { start: "09:00", end: "13:00" },
  sun: null,
};

export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin",
  hospital_admin: "/hospital-admin",
  doctor: "/doctor",
  receptionist: "/receptionist",
  lab_staff: "/doctor",
  patient: "/hospitals",
};
