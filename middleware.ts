import { NextRequest, NextResponse } from "next/server";

const ALLOWED_IPS = (process.env.KIOSK_ALLOWED_IPS || "").split(",").map((ip) => ip.trim()).filter(Boolean);

export function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
