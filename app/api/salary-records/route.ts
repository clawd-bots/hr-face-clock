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

export async function GET(req: NextRequest) {
  const ctx = await getContext();
  const supabase = getSupabaseService();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee_id");

  let query = supabase
    .from("salary_records")
    .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title)")
    .order("effective_from", { ascending: false });

  if (ctx.companyId) {
    query = query.eq("company_id", ctx.companyId);
  }
  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { employee_id, basic_salary, effective_from, pay_basis, days_per_month } = body;

  if (!employee_id || !basic_salary || !effective_from) {
    return NextResponse.json(
      { error: "Missing employee_id, basic_salary, or effective_from" },
      { status: 400 }
    );
  }

  const dpm = days_per_month || 22;
  const dailyRate = Math.round((basic_salary / dpm) * 100) / 100;
  const hourlyRate = Math.round((dailyRate / 8) * 100) / 100;

  const supabase = getSupabaseService();

  // Close the previous current record
  await supabase
    .from("salary_records")
    .update({ effective_to: new Date(new Date(effective_from).getTime() - 86400000).toISOString().split("T")[0] })
    .eq("employee_id", employee_id)
    .eq("company_id", ctx.companyId)
    .is("effective_to", null);

  const { data, error } = await supabase
    .from("salary_records")
    .insert({
      company_id: ctx.companyId,
      employee_id,
      basic_salary,
      daily_rate: dailyRate,
      hourly_rate: hourlyRate,
      effective_from,
      pay_basis: pay_basis || "monthly",
      days_per_month: dpm,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: "create",
    entityType: "salary_record",
    entityId: data.id,
    changes: { basic_salary: { old: null, new: basic_salary } },
  });

  return NextResponse.json(data);
}
