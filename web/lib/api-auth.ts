import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function requireApiRole(roles: UserRole[]) {
  let user = null;
  const admin = createAdminClient();

  try {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: tokenRes } = await admin.auth.getUser(token);
      if (tokenRes?.user) {
        user = tokenRes.user;
      }
    }
  } catch {
    // Non-blocking header read
  }

  if (!user) {
    const supabase = await createClient();
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser();
    user = cookieUser;
  }

  if (!user) {
    return { error: "Unauthorized", status: 401 as const, user: null, profile: null };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role, hospital_id, name, phone, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.deleted_at) {
    return { error: "Unauthorized", status: 401 as const, user: null, profile: null };
  }
  if (!roles.includes(profile.role as UserRole)) {
    return { error: "Forbidden", status: 403 as const, user: null, profile: null };
  }
  return { error: null, status: 200 as const, user, profile };
}

export { createAdminClient };
