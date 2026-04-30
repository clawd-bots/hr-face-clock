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
        .select("company_id, system_role")
        .eq("id", user.id)
        .single();
      return {
        userId: user.id,
        companyId: profile?.company_id ?? null,
        role: profile?.system_role ?? null,
      };
    }
  } catch { /* not authenticated */ }
  return { userId: null, companyId: null, role: null };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins/HR can create accounts
  const allowedRoles = ["super_admin", "company_admin", "hr_manager"];
  if (!ctx.role || !allowedRoles.includes(ctx.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { id: employeeId } = await params;
  const body = await req.json();
  const { email, password, role, managed_department_ids } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const supabase = getSupabaseService();

  // Verify the employee exists and belongs to this company
  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("id, first_name, last_name, name, company_id")
    .eq("id", employeeId)
    .eq("company_id", ctx.companyId)
    .single();

  if (empError || !employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Check if employee already has an account
  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("employee_id", employeeId)
    .single();

  if (existingProfile) {
    return NextResponse.json(
      { error: `This employee already has an account (${existingProfile.email})` },
      { status: 409 }
    );
  }

  // Create auth user via admin API (auto-confirmed)
  const displayName = employee.first_name
    ? `${employee.first_name} ${employee.last_name ?? ""}`.trim()
    : employee.name ?? "Employee";

  const accountRole = role || "employee";
  const validRoles = ["employee", "hr_manager", "payroll_officer", "department_manager", "company_admin"];
  if (!validRoles.includes(accountRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (authError) {
    return NextResponse.json(
      { error: "Failed to create account: " + authError.message },
      { status: 500 }
    );
  }

  // Create user profile linking to employee
  const { error: profileError } = await supabase.from("user_profiles").insert({
    id: authData.user.id,
    company_id: ctx.companyId,
    employee_id: employeeId,
    system_role: accountRole,
    email,
    display_name: displayName,
  });

  if (profileError) {
    // Clean up auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "Failed to create profile: " + profileError.message },
      { status: 500 }
    );
  }

  // For department_manager role: write managed-department links
  if (
    accountRole === "department_manager" &&
    Array.isArray(managed_department_ids) &&
    managed_department_ids.length > 0
  ) {
    const rows = managed_department_ids
      .filter((id: unknown): id is string => typeof id === "string" && !!id)
      .map((department_id: string) => ({
        user_id: authData.user.id,
        department_id,
        company_id: ctx.companyId,
      }));
    if (rows.length > 0) {
      await supabase.from("user_managed_departments").insert(rows);
    }
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId!,
    action: "create_account",
    entityType: "employee",
    entityId: employeeId,
    changes: { email, role: accountRole },
  });

  return NextResponse.json({
    message: "Account created successfully",
    email,
    role: accountRole,
  });
}
