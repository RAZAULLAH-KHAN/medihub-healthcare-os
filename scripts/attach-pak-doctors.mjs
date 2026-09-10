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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function addDoctor(email, name, specialty, hospitalId, departmentId, phone = "+92 300 1234567") {
  const { data: list } = await supabase.auth.admin.listUsers();
  let user = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (!user) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { name, role: "doctor", hospital_id: hospitalId, phone },
    });
    if (error) throw error;
    userId = created.user.id;
  } else {
    userId = user.id;
    await supabase.auth.admin.updateUserById(userId, {
      password: "Password123!",
      email_confirm: true,
      user_metadata: { name, role: "doctor", hospital_id: hospitalId, phone },
    });
  }

  await supabase.from("profiles").upsert({
    id: userId,
    email,
    name,
    role: "doctor",
    hospital_id: hospitalId,
    phone,
  });

  const { data: existingDoc } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingDoc) {
    await supabase.from("doctors").insert({
      user_id: userId,
      hospital_id: hospitalId,
      department_id: departmentId,
      specialty,
      slot_duration_minutes: 15,
    });
  }

  console.log(`✓ Doctor added: ${name} (${email}) - ${specialty}`);
}

async function run() {
  console.log("Attaching doctors to Pakistani hospitals...");

  // Shifa International Hospital Islamabad
  const shifaId = "b94f8ed8-ceac-4a77-94bc-05c9571e7f5e";
  const shifaPedId = "fde9f7bf-814e-48f9-9fb3-ea3a9ed9ac11";
  const shifaCardioId = "83b7f1e2-c6dc-4653-b6dc-f3b24aac2213";

  await addDoctor(
    "dr.ayesha@shifa.local",
    "Dr. Ayesha Malik",
    "Consultant Pediatrician (FCPS)",
    shifaId,
    shifaPedId,
    "+92 333 5551234"
  );

  await addDoctor(
    "dr.tariq@shifa.local",
    "Dr. Tariq Niazi",
    "Consultant Cardiologist (MRCP UK)",
    shifaId,
    shifaCardioId,
    "+92 333 5552345"
  );

  // Aga Khan University Hospital Karachi
  const agakhanId = "23bfdac3-a84e-438a-9980-ac56364f414d";
  const agakhanNeuroId = "3f1f50f2-f685-4e86-b089-46a46966f0d2";
  const agakhanMedId = "912aded1-5860-4d4f-a2d2-b18762088889";

  await addDoctor(
    "dr.usman@agakhan.local",
    "Dr. Usman Tariq",
    "Consultant Neurologist (FRCP)",
    agakhanId,
    agakhanNeuroId,
    "+92 301 8881234"
  );

  await addDoctor(
    "dr.zainab@agakhan.local",
    "Dr. Zainab Raza",
    "Internal Medicine Specialist",
    agakhanId,
    agakhanMedId,
    "+92 301 8882345"
  );

  // Shaukat Khanum Memorial Hospital Lahore
  const skId = "669369b9-4a7e-4ad7-9fad-103d2e2c3c15";
  const skOncoId = "974012ad-a7dc-49e3-a0b1-c606a1d54b70";

  await addDoctor(
    "dr.fatima@shaukatkhanum.local",
    "Dr. Fatima Noor",
    "Consultant Oncologist (FCPS)",
    skId,
    skOncoId,
    "+92 345 7771234"
  );

  console.log("\n✅ ALL PAKISTANI SPECIALISTS ATTACHED SUCCESSFULLY!\n");
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
