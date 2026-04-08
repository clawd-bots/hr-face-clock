import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";

async function getContext() {
  try {
    const serverClient = await getSupabaseServer();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      return { userId: user.id, companyId: profile?.company_id ?? null };
    }
  } catch { /* not authenticated */ }
  return { userId: null, companyId: null };
}

// GET — payroll run detail with items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  const { id } = await params;
  const supabase = getSupabaseService();

  const { data: run, error: runErr } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId ?? "")
    .single();

  if (runErr || !run) {
    return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
  }

  const { data: items, error: itemsErr } = await supabase
    .from("payroll_items")
    .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title)")
    .eq("payroll_run_id", id)
    .order("created_at");

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  return NextResponse.json({ ...run, items: items ?? [] });
}

// PATCH — approve payroll run
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const supabase = getSupabaseService();

  // Verify run exists and is in correct state
  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "approve") {
    if (run.status !== "computed") {
      return NextResponse.json(
        { error: "Can only approve computed payroll runs" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payroll_runs")
      .update({
        status: "approved",
        approved_by: ctx.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "approve",
      entityType: "payroll_run",
      entityId: id,
      changes: { status: { old: "computed", new: "approved" } },
    });

    return NextResponse.json(data);
  }

  if (body.action === "mark_paid") {
    if (run.status !== "approved") {
      return NextResponse.json(
        { error: "Can only mark approved payroll runs as paid" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payroll_runs")
      .update({ status: "paid" })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "update",
      entityType: "payroll_run",
      entityId: id,
      changes: { status: { old: "approved", new: "paid" } },
    });

    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
