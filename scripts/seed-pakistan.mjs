// Comprehensive Pakistani Healthcare Seed Script for MediHub
// Flagship Pakistani hospitals in Islamabad, Lahore, Karachi, Rawalpindi
// Real Pakistani doctors, departments, clinical history, and queues

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let cachedUsers = null;

async function getOrCreateUser(email, password, name, role, hospitalId = null, phone = null) {
  if (!cachedUsers) {
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    cachedUsers = list?.users || [];
  }

  const existing = cachedUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (existing) {
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { name, role, hospital_id: hospitalId, phone, created_by_admin: "true" },
    });
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, hospital_id: hospitalId, phone, created_by_admin: "true" },
    });
    if (error) throw error;
    userId = created.user.id;
    cachedUsers.push(created.user);
  }

  await supabase.from("profiles").upsert({
    id: userId,
    email,
    name,
    role,
    hospital_id: hospitalId,
    phone,
  });

  if (role === "patient") {
    await supabase.from("patients").upsert({ user_id: userId });
  }

  return userId;
}

async function getOrCreateHospital(name, address, subscription_plan = "enterprise") {
  const { data: list } = await supabase
    .from("hospitals")
    .select("id")
    .eq("name", name)
    .limit(1);

  if (list && list.length > 0) {
    return list[0].id;
  }

  const { data: created, error } = await supabase
    .from("hospitals")
    .insert({ name, address, subscription_plan })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function getOrCreateDepartment(hospitalId, name) {
  const { data: list } = await supabase
    .from("departments")
    .select("id")
    .eq("hospital_id", hospitalId)
    .eq("name", name)
    .limit(1);

  if (list && list.length > 0) {
    return list[0].id;
  }

  const { data: created, error } = await supabase
    .from("departments")
    .insert({ hospital_id: hospitalId, name })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function getOrCreateDoctor(userId, hospitalId, departmentId, specialty) {
  const { data: list } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (list && list.length > 0) {
    return list[0].id;
  }

  const { data: created, error } = await supabase
    .from("doctors")
    .insert({
      user_id: userId,
      hospital_id: hospitalId,
      department_id: departmentId,
      specialty,
      slot_duration_minutes: 15,
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function seedPakistan() {
  console.log("=================================================");
  console.log("  SEEDING MEDIHUB PAKISTAN HEALTHCARE NETWORK    ");
  console.log("=================================================");

  // 1. Super Admin
  await getOrCreateUser(
    "superadmin@medihub.local",
    "Password123!",
    "Super Admin (Platform Owner)",
    "super_admin"
  );
  console.log("✓ Super Admin initialized: superadmin@medihub.local");

  // 2. Pakistani Hospitals
  console.log("\nSeeding Pakistani Flagship Hospitals...");
  const hCityCare = await getOrCreateHospital(
    "City Care General Hospital",
    "Murree Road, Saddar, Rawalpindi",
    "enterprise"
  );
  console.log("✓ City Care General Hospital (Rawalpindi)");

  const hShifa = await getOrCreateHospital(
    "Shifa International Hospital",
    "Pitras Bukhari Road, Sector H-8/4, Islamabad",
    "enterprise"
  );
  console.log("✓ Shifa International Hospital (Islamabad)");

  const hAgaKhan = await getOrCreateHospital(
    "Aga Khan University Hospital (AKUH)",
    "Stadium Road, Bahadurabad, Karachi",
    "enterprise"
  );
  console.log("✓ Aga Khan University Hospital (Karachi)");

  const hShaukatKhanum = await getOrCreateHospital(
    "Shaukat Khanum Memorial Hospital",
    "7A Block R-3, Johar Town, Lahore",
    "enterprise"
  );
  console.log("✓ Shaukat Khanum Memorial Hospital (Lahore)");

  const hMetroHealth = await getOrCreateHospital(
    "Metro Health Medical Complex",
    "Jinnah Avenue, Blue Area, Islamabad",
    "growth"
  );
  console.log("✓ Metro Health Medical Complex (Islamabad)");

  // 3. Departments
  console.log("\nSeeding Departments...");
  const dCardioCC = await getOrCreateDepartment(hCityCare, "Cardiology");
  const dGenMedCC = await getOrCreateDepartment(hCityCare, "General Medicine");
  const dPedCC = await getOrCreateDepartment(hCityCare, "Pediatrics");
  console.log("✓ City Care Departments");

  const dCardioShifa = await getOrCreateDepartment(hShifa, "Cardiology");
  const dPedShifa = await getOrCreateDepartment(hShifa, "Pediatrics & Child Health");
  console.log("✓ Shifa International Departments");

  const dNeuroAK = await getOrCreateDepartment(hAgaKhan, "Neurology & Spine");
  console.log("✓ Aga Khan Departments");

  const dDermSK = await getOrCreateDepartment(hShaukatKhanum, "Dermatology");
  console.log("✓ Shaukat Khanum Departments");

  const dOrthoMH = await getOrCreateDepartment(hMetroHealth, "Orthopedic Surgery");
  console.log("✓ Metro Health Departments");

  // 4. Pakistani Doctors
  console.log("\nSeeding Pakistani Doctors & Specialists...");
  const uSarah = await getOrCreateUser(
    "dr.sarah@citycare.local",
    "Password123!",
    "Dr. Sarah Khan",
    "doctor",
    hCityCare,
    "+92 300 8521479"
  );
  const docSarahId = await getOrCreateDoctor(uSarah, hCityCare, dCardioCC, "Consultant Cardiologist (FCPS)");
  console.log("✓ Dr. Sarah Khan (Cardiology, City Care Rawalpindi)");

  const uAhmed = await getOrCreateUser(
    "dr.ahmed@citycare.local",
    "Password123!",
    "Dr. Ahmed Raza",
    "doctor",
    hCityCare,
    "+92 321 7412589"
  );
  await getOrCreateDoctor(uAhmed, hCityCare, dGenMedCC, "Consultant General Physician (MRCP)");
  console.log("✓ Dr. Ahmed Raza (General Medicine, City Care Rawalpindi)");

  const uAyesha = await getOrCreateUser(
    "dr.ayesha@shifa.local",
    "Password123!",
    "Dr. Ayesha Malik",
    "doctor",
    hShifa,
    "+92 333 9632587"
  );
  await getOrCreateDoctor(uAyesha, hShifa, dPedShifa, "Consultant Pediatrician (FCPS Pediatrics)");
  console.log("✓ Dr. Ayesha Malik (Pediatrics, Shifa Islamabad)");

  const uUsman = await getOrCreateUser(
    "dr.usman@agakhan.local",
    "Password123!",
    "Dr. Usman Tariq",
    "doctor",
    hAgaKhan,
    "+92 301 2589631"
  );
  await getOrCreateDoctor(uUsman, hAgaKhan, dNeuroAK, "Consultant Neurologist (MRCP UK)");
  console.log("✓ Dr. Usman Tariq (Neurology, Aga Khan Karachi)");

  const uFatima = await getOrCreateUser(
    "dr.fatima@shaukatkhanum.local",
    "Password123!",
    "Dr. Fatima Noor",
    "doctor",
    hShaukatKhanum,
    "+92 345 3698521"
  );
  await getOrCreateDoctor(uFatima, hShaukatKhanum, dDermSK, "Consultant Dermatologist (MCPS)");
  console.log("✓ Dr. Fatima Noor (Dermatology, Shaukat Khanum Lahore)");

  const uBilal = await getOrCreateUser(
    "dr.bilal@metrohealth.local",
    "Password123!",
    "Dr. Bilal Siddiqui",
    "doctor",
    hMetroHealth,
    "+92 312 1478523"
  );
  await getOrCreateDoctor(uBilal, hMetroHealth, dOrthoMH, "Consultant Orthopedic Surgeon (FRCS)");
  console.log("✓ Dr. Bilal Siddiqui (Orthopedics, Metro Health Islamabad)");

  // 5. Staff & Receptionists
  console.log("\nSeeding Receptionists & Hospital Admins...");
  await getOrCreateUser("admin1@citycare.local", "Password123!", "Tariq Mehmood (Admin)", "hospital_admin", hCityCare);
  await getOrCreateUser("reception@citycare.local", "Password123!", "Sana Javed (Front Desk)", "receptionist", hCityCare);

  await getOrCreateUser("admin2@metrohealth.local", "Password123!", "Zahid Iqbal (Admin)", "hospital_admin", hMetroHealth);
  await getOrCreateUser("reception@metrohealth.local", "Password123!", "Hina Babar (Front Desk)", "receptionist", hMetroHealth);

  await getOrCreateUser("admin3@shifa.local", "Password123!", "Brig. (R) Dr. Saleem (Admin)", "hospital_admin", hShifa);
  await getOrCreateUser("reception@shifa.local", "Password123!", "Marium Khan (Reception Desk)", "receptionist", hShifa);
  console.log("✓ Hospital Admins & Reception desks seeded.");

  // 6. Pakistani Patients
  console.log("\nSeeding Patients...");
  const pAli = await getOrCreateUser(
    "patient.ali@example.com",
    "Password123!",
    "Ali Hassan",
    "patient",
    null,
    "+92 300 1234567"
  );
  console.log("✓ Ali Hassan (patient.ali@example.com, Lahore)");

  const pZainab = await getOrCreateUser(
    "patient.zainab@example.com",
    "Password123!",
    "Zainab Bibi",
    "patient",
    null,
    "+92 321 9876543"
  );
  console.log("✓ Zainab Bibi (patient.zainab@example.com, Islamabad)");

  // Personal user test accounts
  await getOrCreateUser("bscs23f28@namal.edu.pk", "Password123!", "Namal Student", "patient", null, "+92 300 0000001");
  await getOrCreateUser("razau00212@gmail.com", "Password123!", "Raza Usman", "patient", null, "+92 300 0000002");

  // 7. Seed Sample Appointments for Ali Hassan
  console.log("\nSeeding Patient Consultations & History...");
  const pastSlot = new Date(Date.now() - 3 * 86400000);
  const { data: pastAppt } = await supabase
    .from("appointments")
    .upsert({
      hospital_id: hCityCare,
      patient_id: pAli,
      doctor_id: docSarahId,
      slot_time: pastSlot.toISOString(),
      status: "completed",
    })
    .select("id")
    .single();

  if (pastAppt) {
    await supabase.from("medical_reports").upsert({
      hospital_id: hCityCare,
      patient_id: pAli,
      doctor_id: docSarahId,
      appointment_id: pastAppt.id,
      content:
        "Patient presented with exertional chest heaviness. Resting ECG normal. Resting BP 130/85 mmHg. Lipid profile reviewed showing mild hypercholesterolemia. Recommended aerobic exercise, reduced salt intake, and 2-week follow-up.",
      prescription: "Tab. Concor 2.5mg once daily at morning. Tab. Lipitor 10mg once at night.",
      ai_summary:
        "The doctor examined your heart and blood pressure. Your heart rhythm is normal, and blood pressure is slightly elevated. You have been prescribed a mild heart protector (Concor) and cholesterol medication (Lipitor). Please walk 30 minutes daily and limit oily foods.",
    });
  }

  // Today appointment for Ali with Dr. Sarah
  const todaySlot = new Date();
  todaySlot.setHours(11, 30, 0, 0);
  await supabase.from("appointments").upsert({
    hospital_id: hCityCare,
    patient_id: pAli,
    doctor_id: docSarahId,
    slot_time: todaySlot.toISOString(),
    status: "booked",
  });

  console.log("✓ Sample appointments and medical history seeded.");
  console.log("\n=================================================");
  console.log("  PAKISTAN HEALTHCARE NETWORK SEEDING COMPLETE!   ");
  console.log("=================================================\n");
}

seedPakistan().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
