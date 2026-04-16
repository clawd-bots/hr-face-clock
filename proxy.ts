import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Kiosk route — no auth required, open access ---
  if (pathname === "/") {
    return NextResponse.next();
  }

  // --- Auth check for /admin/* and /employee/* routes ---
  if (pathname.startsWith("/admin") || pathname.startsWith("/employee")) {
    // Create a Supabase client that can read/write cookies in the proxy
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Update request cookies (for downstream server components)
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            // Update response cookies (for the browser)
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // All other routes (login, setup, API, static) — pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/employee/:path*",
  ],
};
