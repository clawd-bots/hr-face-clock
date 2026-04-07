import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("employee_emergency_contacts")
    .select("*")
    .eq("employee_id", id)
    .order("is_primary", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("employee_emergency_contacts")
    .insert({ ...body, employee_id: id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId");
  if (!contactId) return NextResponse.json({ error: "Missing contactId" }, { status: 400 });

  const supabase = getSupabaseService();
  const { error } = await supabase
    .from("employee_emergency_contacts")
    .delete()
    .eq("id", contactId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
