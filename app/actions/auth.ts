"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_HOME, type UserRole } from "@/lib/types";
import { tooManyAttempts } from "@/lib/rate-limit";
import { loginSchema, signupSchema } from "@/lib/validation";

export type ActionState = { error?: string; ok?: boolean };

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;

  if (tooManyAttempts(`login:${email}`)) {
    return { error: "Too many login attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { data: authRes, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authRes.user) {
    return {
      error: authError?.message || "Invalid email or password. Please verify your credentials.",
    };
  }

  const user = authRes.user;
  const admin = createAdminClient();

  // Query or auto-heal profile
  let { data: profile } = await admin
    .from("profiles")
    .select("id, role, name, hospital_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const role = (user.user_metadata?.role as UserRole) || "patient";
    const name =
      user.user_metadata?.name ||
      email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ") ||
      "Patient User";
    const phone = user.user_metadata?.phone || null;
    const hospital_id = user.user_metadata?.hospital_id || null;

    const { data: newProfile } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        email,
        name,
        role,
        phone,
        hospital_id,
      })
      .select("id, role, name, hospital_id")
      .single();

    profile = newProfile;

    if (role === "patient") {
      await admin.from("patients").upsert({ user_id: user.id });
    }
  }

  const targetRole = (profile?.role as UserRole) ?? "patient";
  const next = (formData.get("next") as string) || "";

  if (next && next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }

  redirect(ROLE_HOME[targetRole] || "/hospitals");
}

export async function fastSwitchPersona(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const destination = (formData.get("destination") as string) || "/hospitals";

  if (!email) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: "Password123!",
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(destination);
}


export async function signup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid signup details" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;
  const name = parsed.data.name.trim();
  const phone = parsed.data.phone ? parsed.data.phone.trim() : null;

  const admin = createAdminClient();

  let userId: string | null = null;

  // Try creating user with auto email confirmation
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      phone,
      role: "patient",
      created_by_admin: "true",
    },
  });

  if (created?.user) {
    userId = created.user.id;
  } else if (
    createError &&
    (createError.message.includes("already registered") ||
      createError.message.includes("already exists") ||
      createError.message.includes("duplicate"))
  ) {
    // User already in auth.users, update password and get their user ID
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { name, phone, role: "patient" },
      });
    } else {
      return { error: createError.message };
    }
  } else if (createError) {
    return { error: createError.message };
  }

  if (!userId) {
    return { error: "Failed to initialize patient account. Please try again." };
  }

  // Ensure profile and patient records are created
  await admin.from("profiles").upsert({
    id: userId,
    email,
    name,
    role: "patient",
    phone,
  });

  await admin.from("patients").upsert({
    user_id: userId,
  });

  // Auto sign-in the new patient
  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    redirect("/login?signed-up=true");
  }

  redirect("/hospitals");
}

export async function resetPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = loginSchema.shape.email.safeParse(email);
  if (!parsed.success) return { error: "Enter a valid email address" };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/profile`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
