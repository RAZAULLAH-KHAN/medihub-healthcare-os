import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_HOME, type Profile, type UserRole } from "@/lib/types";

export async function getSessionProfile(): Promise<{
  userId: string;
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  let { data: profile } = await admin
    .from("profiles")
    .select("id, email, role, hospital_id, name, phone, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  // Auto-heal missing profile row for any authenticated user
  if (!profile && user.email) {
    const role = (user.user_metadata?.role as UserRole) || "patient";
    const name =
      user.user_metadata?.name ||
      user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ") ||
      "Patient User";
    const phone = user.user_metadata?.phone || null;
    const hospital_id = user.user_metadata?.hospital_id || null;

    const { data: healed } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        name,
        role,
        phone,
        hospital_id,
      })
      .select("id, email, role, hospital_id, name, phone, deleted_at")
      .single();

    profile = healed;

    if (role === "patient") {
      await admin.from("patients").upsert({ user_id: user.id });
    }
  }

  if (!profile || profile.deleted_at) return null;
  return { userId: user.id, profile: profile as Profile };
}

export async function requireRole(roles: UserRole[]) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!roles.includes(session.profile.role)) {
    redirect(ROLE_HOME[session.profile.role]);
  }
  return session;
}

export async function requireUser() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return session;
}
