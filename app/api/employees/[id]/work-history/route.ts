import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("employee_work_history")
    .select("*")
    .eq("employee_id", id)
    .order("start_date", { ascending: false });

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
    .from("employee_work_history")
    .insert({ ...body, employee_id: id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const historyId = searchParams.get("historyId");
  if (!historyId) return NextResponse.json({ error: "Missing historyId" }, { status: 400 });

  const supabase = getSupabaseService();
  const { error } = await supabase
    .from("employee_work_history")
    .delete()
    .eq("id", historyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
