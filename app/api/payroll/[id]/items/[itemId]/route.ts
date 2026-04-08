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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const body = await req.json();
  const supabase = getSupabaseService();

  // Get current item
  const { data: item } = await supabase
    .from("payroll_items")
    .select("*")
    .eq("id", itemId)
    .eq("company_id", ctx.companyId)
    .single();

  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if (body.other_deductions != null) {
    updates.other_deductions = body.other_deductions;
  }
  if (body.adjustments != null) {
    updates.adjustments = { ...(item.adjustments ?? {}), ...body.adjustments };
  }

  // Recalculate totals
  const otherDed = (updates.other_deductions as number) ?? item.other_deductions ?? 0;
  const totalDeductions =
    Math.round(
      ((item.sss_employee ?? 0) +
        (item.philhealth_employee ?? 0) +
        (item.pagibig_employee ?? 0) +
        (item.withholding_tax ?? 0) +
        (item.loan_deductions ?? 0) +
        otherDed) *
        100
    ) / 100;

  updates.total_deductions = totalDeductions;
  updates.net_pay = Math.round(((item.gross_pay ?? 0) - totalDeductions) * 100) / 100;

  const { data, error } = await supabase
    .from("payroll_items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "update",
    entityType: "payroll_item",
    entityId: itemId,
    changes: { other_deductions: { old: item.other_deductions, new: otherDed } },
  });

  return NextResponse.json(data);
}
