import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getEmployeeContext } from "@/lib/employee-context";

export async function GET() {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("employees")
    .select("*, department:departments(id, name)")
    .eq("id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

const EDITABLE_FIELDS = [
  "phone",
  "personal_email",
  "address_line1",
  "address_line2",
  "city",
  "province",
  "zip_code",
];

export async function PATCH(req: NextRequest) {
  const ctx = await getEmployeeContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = getSupabaseService();

  // Only allow updating specific fields
  const updates: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", ctx.employeeId)
    .eq("company_id", ctx.companyId)
    .select("*, department:departments(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
