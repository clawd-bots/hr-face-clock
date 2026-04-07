import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseService();

  // Guard: only allow setup if no companies exist
  const { count } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return NextResponse.json(
      { error: "System already set up. Use the login page." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { company_name, user_id, email, display_name } = body;

  if (!company_name || !user_id || !email || !display_name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Create slug from company name
  const slug = company_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: company_name,
      slug,
      settings: {
        timezone: "Asia/Manila",
        payroll_cycle: "semi_monthly",
      },
    })
    .select()
    .single();

  if (companyError) {
    return NextResponse.json(
      { error: companyError.message },
      { status: 500 }
    );
  }

  // Create user profile as super_admin
  const { error: profileError } = await supabase
    .from("user_profiles")
    .insert({
      id: user_id,
      company_id: company.id,
      system_role: "super_admin",
      email,
      display_name,
    });

  if (profileError) {
    // Clean up company if profile creation fails
    await supabase.from("companies").delete().eq("id", company.id);
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  // Backfill: assign company_id to any existing employees and time_logs
  await supabase
    .from("employees")
    .update({ company_id: company.id })
    .is("company_id", null);

  await supabase
    .from("time_logs")
    .update({ company_id: company.id })
    .is("company_id", null);

  return NextResponse.json({
    company,
    message: "Setup complete",
  });
}
