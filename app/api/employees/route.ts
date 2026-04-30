import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getKioskDevice } from "@/lib/kiosk-auth";
import { logAudit } from "@/lib/audit";

/**
 * Determine whether this request is from the kiosk (unauthenticated)
 * or from an authenticated admin. Kiosk requests use the service client
 * to bypass RLS; admin requests use the server client with auth.
 */
async function getClientAndContext(req: NextRequest) {
  // Try to get authenticated user first
  try {
    const serverClient = await getSupabaseServer();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (user) {
      // Get user's company_id from profile
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id, system_role")
        .eq("id", user.id)
        .single();

      return {
        supabase: serverClient,
        isAuthenticated: true,
        userId: user.id,
        companyId: profile?.company_id ?? null,
        role: profile?.system_role ?? null,
      };
    }
  } catch {
    // Not authenticated — fall through to service client
  }

  // Kiosk / unauthenticated: use service client
  return {
    supabase: getSupabaseService(),
    isAuthenticated: false,
    userId: null,
    companyId: null,
    role: null,
  };
}

export async function GET(req: NextRequest) {
  const ctx = await getClientAndContext(req);
  let companyId = ctx.companyId;

  // Unauthenticated request → must be a paired kiosk device
  if (!ctx.isAuthenticated) {
    const device = await getKioskDevice(req);
    if (!device) {
      return NextResponse.json({ error: "Kiosk not paired or revoked" }, { status: 401 });
    }
    companyId = device.company_id;
  }

  if (!companyId) {
    return NextResponse.json({ error: "No company context" }, { status: 401 });
  }

  const { data, error } = await ctx.supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .or("active.eq.true,active.is.null")
    .order("name");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  // No HTTP cache: the browser cache is keyed on URL, not user. If an admin
  // signs out and a different user signs in within the cache window, they'd
  // get the previous user's data back from the browser.
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getClientAndContext(req);

  if (!ctx.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, role, department, face_descriptors, photo_url } = body;

  const { data, error } = await ctx.supabase
    .from("employees")
    .insert({
      name,
      role,
      department,
      face_descriptors,
      photo_url,
      active: true,
      company_id: ctx.companyId,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  if (ctx.companyId) {
    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "create",
      entityType: "employee",
      entityId: data.id,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const ctx = await getClientAndContext(req);

  if (!ctx.isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await ctx.supabase
    .from("employees")
    .update({ active: false })
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  if (ctx.companyId) {
    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "delete",
      entityType: "employee",
      entityId: id,
    });
  }

  return NextResponse.json({ success: true });
}
