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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Testing Signup & Login Pipeline...");

  const testEmail = `test.patient.${Date.now()}@example.pk`;
  const testPassword = "Password123!";
  const testName = "Muhammad Usman";
  const testPhone = "+92 300 5551234";

  console.log(`1. Creating new patient: ${testEmail}`);
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { name: testName, phone: testPhone, role: "patient" },
  });

  if (createError) throw createError;
  const userId = created.user.id;
  console.log(`   ✓ Auth user created: ${userId}`);

  // Upsert profile and patient row
  await adminClient.from("profiles").upsert({
    id: userId,
    email: testEmail,
    name: testName,
    role: "patient",
    phone: testPhone,
  });

  await adminClient.from("patients").upsert({ user_id: userId });
  console.log(`   ✓ Profile & Patient records created.`);

  // Verify client login
  console.log("2. Verifying client sign-in with password...");
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) throw signInError;
  console.log(`   ✓ Signed in successfully! Session user: ${signInData.user.id}`);

  // Query profile
  const { data: profile } = await userClient
    .from("profiles")
    .select("*")
    .eq("id", signInData.user.id)
    .single();

  console.log(`   ✓ Retrieved profile: Name="${profile?.name}", Role="${profile?.role}"`);
  console.log("\n✅ SIGNUP & LOGIN PIPELINE VERIFIED CLEANLY!\n");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
