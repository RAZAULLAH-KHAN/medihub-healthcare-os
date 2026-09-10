import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME, type UserRole } from "@/lib/types";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

const ALL_ROLES: UserRole[] = [
  "patient",
  "doctor",
  "receptionist",
  "hospital_admin",
  "super_admin",
  "lab_staff",
];

const ROLE_PREFIX: Record<string, UserRole[]> = {
  "/super-admin": ["super_admin"],
  "/hospital-admin": ["hospital_admin"],
  "/doctor": ["doctor", "lab_staff"],
  "/receptionist": ["receptionist"],
  "/hospitals": ALL_ROLES,
  "/book": ALL_ROLES,
  "/queue": ["patient", "receptionist", "doctor", "hospital_admin"],
  "/appointments": ["patient"],
  "/reports": ["patient", "doctor"],
  "/notifications": ALL_ROLES,
  "/profile": ALL_ROLES,
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          }),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = AUTH_ROUTES.some((r) => path.startsWith(r));
  const isPublicRoute =
    path === "/" ||
    path === "/hospitals" ||
    path.startsWith("/hospitals/") ||
    path.startsWith("/api/");

  if (!user && !isAuthRoute && !isPublicRoute) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const home = ROLE_HOME[(profile?.role as UserRole) ?? "patient"];
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (user) {
    const match = Object.entries(ROLE_PREFIX).find(([prefix]) =>
      path.startsWith(prefix),
    );
    if (match) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const role = (profile?.role as UserRole) ?? "patient";
      if (!match[1].includes(role)) {
        return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
      }
    }
  }

  return response;
}
