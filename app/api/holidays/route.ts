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
  } catch {}
  return { userId: null, companyId: null };
}

export async function GET(req: NextRequest) {
  const { userId, companyId } = await getContext();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");

  let query = supabase
    .from("holidays")
    .select("*")
    .eq("company_id", companyId)
    .order("date");

  if (year) {
    query = query
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId, companyId } = await getContext();
  if (!userId || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, name, type } = body;

  if (!date || !name || !type) {
    return NextResponse.json(
      { error: "date, name, and type are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  const { data, error } = await supabase
    .from("holidays")
    .insert({
      company_id: companyId,
      date,
      name,
      type,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId,
    userId,
    action: "create",
    entityType: "holiday",
    entityId: data.id,
    changes: null,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId, companyId } = await getContext();
  if (!userId || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const holidayId = searchParams.get("holidayId");

  if (!holidayId) {
    return NextResponse.json({ error: "Missing holidayId" }, { status: 400 });
  }

  const supabase = getSupabaseService();

  const { data: existing } = await supabase
    .from("holidays")
    .select("id, name, date")
    .eq("id", holidayId)
    .eq("company_id", companyId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", holidayId)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    companyId,
    userId,
    action: "delete",
    entityType: "holiday",
    entityId: holidayId,
    changes: { name: { old: existing.name, new: null }, date: { old: existing.date, new: null } },
  });

  return NextResponse.json({ success: true });
}
