import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ALLOWED_IPS = (process.env.KIOSK_ALLOWED_IPS || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Kiosk IP whitelist (root route only) ---
  if (pathname === "/") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "";

    if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(ip)) {
      const html = `<!DOCTYPE html>
<html><head><title>Access Denied</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fafaf2;font-family:system-ui,sans-serif">
<div style="text-align:center;max-width:400px;padding:48px">
<h1 style="font-size:28px;font-weight:500;letter-spacing:-1.75px;color:rgba(0,0,0,0.88);margin:0 0 8px">Access Denied</h1>
<p style="font-size:16px;color:rgba(0,0,0,0.65);margin:0 0 24px">The kiosk is only available on the office network.</p>
<a href="/admin" style="font-size:14px;font-weight:500;color:#9a6d2a;text-decoration:none">Go to Admin Dashboard</a>
</div></body></html>`;
      return new NextResponse(html, {
        status: 403,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Kiosk route — no auth required
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
