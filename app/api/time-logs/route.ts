import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * Time logs API — used by both the kiosk (unauthenticated) and admin dashboard.
 * Always uses service client for kiosk clock operations;
 * uses server client for authenticated admin queries.
 */
async function getClientAndContext() {
  try {
    const serverClient = await getSupabaseServer();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (user) {
      const { data: profile } = await serverClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      return {
        supabase: serverClient,
        isAuthenticated: true,
        companyId: profile?.company_id ?? null,
      };
    }
  } catch {
    // Not authenticated
  }

  return {
    supabase: getSupabaseService(),
    isAuthenticated: false,
    companyId: null,
  };
}

export async function GET(req: NextRequest) {
  const { supabase, companyId } = await getClientAndContext();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const employeeId = searchParams.get("employee_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("time_logs")
    .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title, department:departments(name))")
    .order("clock_in", { ascending: false });

  if (companyId) query = query.eq("company_id", companyId);
  if (date) query = query.eq("date", date);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  // Clock in/out always uses service client (kiosk has no auth)
  const supabase = getSupabaseService();
  const body = await req.json();
  const { employee_id, action } = body;

  if (action === "clock_in") {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("time_logs")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("date", today)
      .is("clock_out", null)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Already clocked in", log: existing },
        { status: 400 }
      );
    }

    // Get employee's company_id for the new log
    const { data: employee } = await supabase
      .from("employees")
      .select("company_id")
      .eq("id", employee_id)
      .single();

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("time_logs")
      .insert({
        employee_id,
        clock_in: now,
        date: today,
        company_id: employee?.company_id ?? null,
      })
      .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title, department:departments(name))")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "clock_in", log: data });
  }

  if (action === "clock_out") {
    const today = new Date().toISOString().split("T")[0];
    const { data: openLog } = await supabase
      .from("time_logs")
      .select("*")
      .eq("employee_id", employee_id)
      .eq("date", today)
      .is("clock_out", null)
      .single();

    if (!openLog) {
      return NextResponse.json({ error: "Not clocked in" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const hoursWorked =
      (new Date(now).getTime() - new Date(openLog.clock_in).getTime()) /
      (1000 * 60 * 60);

    const { data, error } = await supabase
      .from("time_logs")
      .update({
        clock_out: now,
        hours_worked: Math.round(hoursWorked * 100) / 100,
      })
      .eq("id", openLog.id)
      .select("*, employee:employees(id, employee_number, first_name, last_name, name, position_title, department:departments(name))")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "clock_out", log: data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
