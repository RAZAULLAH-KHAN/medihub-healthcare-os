import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateUser(email, password, name, role, hospitalId = null, phone = null) {
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

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
    if (error) {
      throw new Error(`Failed to create user ${email}: ${error.message}`);
    }
    userId = created.user.id;
  }

  // Ensure profile row matches
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

async function seed() {
  console.log("Seeding MediHub multi-tenant demo data...");

  // 1. Super Admin
  const superAdminId = await getOrCreateUser(
    "superadmin@medihub.local",
    "Password123!",
    "Super Admin (Platform Owner)",
    "super_admin"
  );
  console.log("Super Admin seeded:", "superadmin@medihub.local");

  // 2. Hospital 1: City Care General Hospital
  let { data: h1 } = await supabase
    .from("hospitals")
    .select("id")
    .eq("name", "City Care General Hospital")
    .maybeSingle();

  if (!h1) {
    const { data: createdH1, error } = await supabase
      .from("hospitals")
      .insert({
        name: "City Care General Hospital",
        address: "Plot 14, Block 4, Clifton, Karachi",
        subscription_plan: "enterprise",
      })
      .select("id")
      .single();
    if (error) throw error;
    h1 = createdH1;
  }
  const h1Id = h1.id;
  console.log("Hospital 1 seeded:", "City Care General Hospital", h1Id);

  // 3. Hospital 2: Metro Health Medical Center
  let { data: h2 } = await supabase
    .from("hospitals")
    .select("id")
    .eq("name", "Metro Health Medical Center")
    .maybeSingle();

  if (!h2) {
    const { data: createdH2, error } = await supabase
      .from("hospitals")
      .insert({
        name: "Metro Health Medical Center",
        address: "Sector F-8/3, Islamabad",
        subscription_plan: "growth",
      })
      .select("id")
      .single();
    if (error) throw error;
    h2 = createdH2;
  }
  const h2Id = h2.id;
  console.log("Hospital 2 seeded:", "Metro Health Medical Center", h2Id);

  // 4. Hospital 1 Admin & Staff
  await getOrCreateUser(
    "admin1@citycare.local",
    "Password123!",
    "Dr. Tariq Mahmood (Admin)",
    "hospital_admin",
    h1Id
  );

  const reception1Id = await getOrCreateUser(
    "reception@citycare.local",
    "Password123!",
    "Fatima Noor (Front Desk)",
    "receptionist",
    h1Id
  );

  // Departments for Hospital 1
  const deptNames1 = ["Cardiology", "General Medicine", "Pediatrics"];
  const depts1 = {};
  for (const name of deptNames1) {
    let { data: d } = await supabase
      .from("departments")
      .select("id")
      .eq("hospital_id", h1Id)
      .eq("name", name)
      .maybeSingle();
    if (!d) {
      const { data: created } = await supabase
        .from("departments")
        .insert({ hospital_id: h1Id, name })
        .select("id")
        .single();
      d = created;
    }
    depts1[name] = d.id;
  }

  // Doctors for Hospital 1
  const drSarahUser = await getOrCreateUser(
    "dr.sarah@citycare.local",
    "Password123!",
    "Dr. Sarah Khan",
    "doctor",
    h1Id
  );
  let { data: drSarahDoc } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", drSarahUser)
    .maybeSingle();
  if (!drSarahDoc) {
    const { data: created } = await supabase
      .from("doctors")
      .insert({
        user_id: drSarahUser,
        hospital_id: h1Id,
        department_id: depts1["Cardiology"],
        specialty: "Consultant Cardiologist",
        slot_duration_minutes: 15,
      })
      .select("id")
      .single();
    drSarahDoc = created;
  }

  const drAhmedUser = await getOrCreateUser(
    "dr.ahmed@citycare.local",
    "Password123!",
    "Dr. Ahmed Raza",
    "doctor",
    h1Id
  );
  let { data: drAhmedDoc } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", drAhmedUser)
    .maybeSingle();
  if (!drAhmedDoc) {
    const { data: created } = await supabase
      .from("doctors")
      .insert({
        user_id: drAhmedUser,
        hospital_id: h1Id,
        department_id: depts1["General Medicine"],
        specialty: "General Physician",
        slot_duration_minutes: 15,
      })
      .select("id")
      .single();
    drAhmedDoc = created;
  }

  // 5. Hospital 2 Admin & Staff
  await getOrCreateUser(
    "admin2@metrohealth.local",
    "Password123!",
    "Zahid Iqbal (Admin)",
    "hospital_admin",
    h2Id
  );

  await getOrCreateUser(
    "reception@metrohealth.local",
    "Password123!",
    "Ayesha Khan (Front Desk)",
    "receptionist",
    h2Id
  );

  const deptNames2 = ["Orthopedics", "Dermatology"];
  const depts2 = {};
  for (const name of deptNames2) {
    let { data: d } = await supabase
      .from("departments")
      .select("id")
      .eq("hospital_id", h2Id)
      .eq("name", name)
      .maybeSingle();
    if (!d) {
      const { data: created } = await supabase
        .from("departments")
        .insert({ hospital_id: h2Id, name })
        .select("id")
        .single();
      d = created;
    }
    depts2[name] = d.id;
  }

  const drBilalUser = await getOrCreateUser(
    "dr.bilal@metrohealth.local",
    "Password123!",
    "Dr. Bilal Siddiqui",
    "doctor",
    h2Id
  );
  let { data: drBilalDoc } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", drBilalUser)
    .maybeSingle();
  if (!drBilalDoc) {
    const { data: created } = await supabase
      .from("doctors")
      .insert({
        user_id: drBilalUser,
        hospital_id: h2Id,
        department_id: depts2["Orthopedics"],
        specialty: "Orthopedic Surgeon",
        slot_duration_minutes: 20,
      })
      .select("id")
      .single();
    drBilalDoc = created;
  }

  // 6. Patients
  const patientAliId = await getOrCreateUser(
    "patient.ali@example.com",
    "Password123!",
    "Ali Hassan",
    "patient",
    null,
    "+923001234567"
  );

  const patientZainabId = await getOrCreateUser(
    "patient.zainab@example.com",
    "Password123!",
    "Zainab Bibi",
    "patient",
    null,
    "+923007654321"
  );
  console.log("Patients seeded: Ali Hassan & Zainab Bibi");

  // 7. Today's Appointments & Queue Tokens
  const today = new Date();
  const todayDateStr = today.toISOString().slice(0, 10);
  const slot1 = new Date(today);
  slot1.setHours(10, 0, 0, 0);
  const slot2 = new Date(today);
  slot2.setHours(10, 30, 0, 0);

  // Ali's appointment at City Care with Dr. Sarah
  let { data: appt1 } = await supabase
    .from("appointments")
    .select("id")
    .eq("patient_id", patientAliId)
    .eq("doctor_id", drSarahDoc.id)
    .gte("slot_time", todayDateStr)
    .maybeSingle();

  if (!appt1) {
    const { data: created } = await supabase
      .from("appointments")
      .insert({
        hospital_id: h1Id,
        patient_id: patientAliId,
        doctor_id: drSarahDoc.id,
        slot_time: slot1.toISOString(),
        status: "checked_in",
        is_emergency: false,
      })
      .select("id")
      .single();
    appt1 = created;
  }

  // Zainab's appointment at City Care with Dr. Ahmed
  let { data: appt2 } = await supabase
    .from("appointments")
    .select("id")
    .eq("patient_id", patientZainabId)
    .eq("doctor_id", drAhmedDoc.id)
    .gte("slot_time", todayDateStr)
    .maybeSingle();

  if (!appt2) {
    const { data: created } = await supabase
      .from("appointments")
      .insert({
        hospital_id: h1Id,
        patient_id: patientZainabId,
        doctor_id: drAhmedDoc.id,
        slot_time: slot2.toISOString(),
        status: "checked_in",
        is_emergency: false,
      })
      .select("id")
      .single();
    appt2 = created;
  }

  // Queue Tokens for Today
  let { data: token1 } = await supabase
    .from("queue_tokens")
    .select("id")
    .eq("appointment_id", appt1.id)
    .maybeSingle();

  if (!token1) {
    await supabase.from("queue_tokens").insert({
      hospital_id: h1Id,
      department_id: depts1["Cardiology"],
      appointment_id: appt1.id,
      token_number: 1,
      status: "waiting",
      is_emergency: false,
      service_date: todayDateStr,
    });
  }

  let { data: token2 } = await supabase
    .from("queue_tokens")
    .select("id")
    .eq("appointment_id", appt2.id)
    .maybeSingle();

  if (!token2) {
    await supabase.from("queue_tokens").insert({
      hospital_id: h1Id,
      department_id: depts1["General Medicine"],
      appointment_id: appt2.id,
      token_number: 2,
      status: "waiting",
      is_emergency: false,
      service_date: todayDateStr,
    });
  }

  // 8. Historical Visit & AI Report for Ali
  const pastDate = new Date(Date.now() - 7 * 86400000);
  let { data: pastAppt } = await supabase
    .from("appointments")
    .select("id")
    .eq("patient_id", patientAliId)
    .eq("status", "completed")
    .maybeSingle();

  if (!pastAppt) {
    const { data: createdAppt } = await supabase
      .from("appointments")
      .insert({
        hospital_id: h1Id,
        patient_id: patientAliId,
        doctor_id: drSarahDoc.id,
        slot_time: pastDate.toISOString(),
        status: "completed",
      })
      .select("id")
      .single();
    pastAppt = createdAppt;

    await supabase.from("medical_reports").insert({
      hospital_id: h1Id,
      patient_id: patientAliId,
      doctor_id: drSarahDoc.id,
      appointment_id: pastAppt.id,
      content:
        "Patient presented with mild exertional dyspnea and occasional palpitations. Resting ECG demonstrates normal sinus rhythm. Echocardiogram reveals preserved left ventricular systolic function (EF 60%). Blood pressure measured at 135/85 mmHg. Initiated low-dose beta-blocker therapy and scheduled 4-week follow-up.",
      prescription: "Tab Bisoprolol 2.5mg once daily in morning. Low sodium dietary modification.",
      ai_summary:
        "Your heart checkup showed normal rhythm and good pumping strength (60%). Your blood pressure was slightly elevated. The doctor prescribed a daily morning blood pressure tablet (Bisoprolol 2.5mg) and recommended reducing salt in your diet. A follow-up visit is scheduled in 4 weeks.",
      created_at: pastDate.toISOString(),
    });
  }

  // 9. Notifications
  await supabase.from("notifications").upsert([
    {
      user_id: patientAliId,
      title: "Today's Visit at City Care",
      body: "You are checked in with Token #1 in Cardiology. Track your queue live on your phone.",
      read: false,
    },
    {
      user_id: patientAliId,
      title: "Previous Report Summary Available",
      body: "Your consultation summary from Dr. Sarah Khan is available in your history.",
      read: true,
    },
  ]);

  console.log("MediHub Demo Dataset seeded successfully!");
  console.log("-----------------------------------------");
  console.log("Demo Accounts (all passwords: Password123!):");
  console.log("Super Admin:    superadmin@medihub.local");
  console.log("City Care Admin:admin1@citycare.local");
  console.log("City Care Doc:  dr.sarah@citycare.local");
  console.log("City Care Front:reception@citycare.local");
  console.log("Metro Admin:    admin2@metrohealth.local");
  console.log("Patient:        patient.ali@example.com");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
