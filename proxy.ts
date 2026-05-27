import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Create Supabase client (handles cookies + session refresh)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // This line does EVERYTHING:
  // - checks login
  // - refreshes session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Define routes properly (clean separation)
  // Public routes — login nahi chahiye
  const isAdminRoute =
    pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminLogin = pathname === "/admin/login";
  const publicRoutes = ["/", "/login", "/register", "/verify-email", "/auth/callback"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // ── Admin routes ──────────────────────────────────────────────
  if (isAdminLogin) {
    // Admin already logged in → redirect to admin dashboard
    if (user && user.app_metadata?.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    return res;
  }

  if (isAdminRoute) {
    // Not logged in → admin login
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    // Logged in but not admin → student login (wrong portal)
    if (user.app_metadata?.role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return res;
  }

  // ── Student routes ────────────────────────────────────────────
  // Protect private routes
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Prevent logged-in users from auth pages
  // Logged in + public route → calendar dashboard

  if (user && isPublicRoute && pathname !== "/") {
    // Admin trying to access student portal → redirect to admin
    if (user.app_metadata?.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/calendar-dashboard", req.url));
  }

  // Logged in + protected route → check profile
  if (user && !isPublicRoute && pathname !== "/onboarding") {
    // Admin trying to access student profile → redirect to admin
    if (user.app_metadata?.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    const { data: profile } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return res;
}

// middleware only run on this routes
// export const config = {
//   matcher: ["/dashboard/:path*", "/login", "/register"],
// };

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
