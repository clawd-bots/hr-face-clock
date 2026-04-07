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
  const { company_name, email, password, display_name, user_id } = body;

  if (!company_name || !email || !display_name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  let authUserId = user_id;

  // If no user_id provided, create the auth user server-side using admin API
  // This auto-confirms the email (no confirmation email needed)
  if (!authUserId) {
    if (!password) {
      return NextResponse.json(
        { error: "Password is required for new account" },
        { status: 400 }
      );
    }

    // Check if user already exists (from a previous failed setup attempt)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email
    );

    if (existingUser) {
      // User exists from a previous attempt — reuse and ensure confirmed
      authUserId = existingUser.id;
      // Update the password in case it changed, and confirm email
      await supabase.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
      });
    } else {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm the email
          user_metadata: { display_name },
        });

      if (authError) {
        return NextResponse.json(
          { error: "Failed to create auth user: " + authError.message },
          { status: 500 }
        );
      }

      authUserId = authData.user.id;
    }
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
      id: authUserId,
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
