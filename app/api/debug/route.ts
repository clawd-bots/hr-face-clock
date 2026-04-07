import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // Check env vars are set (not their values)
  checks.hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  checks.hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  checks.hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "(not set)";

  try {
    const supabase = getSupabaseService();

    // Check companies table
    const { count: companyCount, error: companyError } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true });

    checks.companiesCount = companyCount;
    checks.companiesError = companyError?.message || null;

    // Check user_profiles table
    const { count: profileCount, error: profileError } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true });

    checks.profilesCount = profileCount;
    checks.profilesError = profileError?.message || null;

    // Check auth users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    checks.authUsersCount = authUsers?.users?.length ?? 0;
    checks.authUsersEmails = authUsers?.users?.map((u) => u.email) ?? [];
    checks.authUsersConfirmed = authUsers?.users?.map((u) => ({
      email: u.email,
      confirmed: !!u.email_confirmed_at,
    })) ?? [];
    checks.authError = authError?.message || null;

    // Check if tables exist
    const { error: empError } = await supabase
      .from("employees")
      .select("id", { count: "exact", head: true });
    checks.employeesTableExists = !empError;
    checks.employeesError = empError?.message || null;

    const { error: deptError } = await supabase
      .from("departments")
      .select("id", { count: "exact", head: true });
    checks.departmentsTableExists = !deptError;
    checks.departmentsError = deptError?.message || null;
  } catch (err) {
    checks.serviceClientError =
      err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(checks, {
    headers: { "Cache-Control": "no-store" },
  });
}
