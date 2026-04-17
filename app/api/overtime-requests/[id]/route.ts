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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getContext();
  if (!ctx.userId || !ctx.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, rejection_reason } = body;

  if (!action || !["approve", "reject", "cancel"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Must be 'approve', 'reject', or 'cancel'." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseService();

  // Fetch the current overtime request
  const { data: request, error: reqErr } = await supabase
    .from("overtime_requests")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: "Overtime request not found" }, { status: 404 });
  }

  if (request.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot ${action} a request with status '${request.status}'` },
      { status: 400 }
    );
  }

  let updateData: Record<string, unknown> = {};

  switch (action) {
    case "approve": {
      updateData = {
        status: "approved",
        approved_by: ctx.userId,
        approved_at: new Date().toISOString(),
      };
      break;
    }
    case "reject": {
      updateData = {
        status: "rejected",
        rejection_reason: rejection_reason ?? null,
      };
      break;
    }
    case "cancel": {
      updateData = {
        status: "cancelled",
      };
      break;
    }
  }

  // Update the overtime request
  const { data: updated, error: updErr } = await supabase
    .from("overtime_requests")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: action === "approve" ? "approve" : action === "reject" ? "reject" : "delete",
    entityType: "overtime_request",
    entityId: id,
    changes: {
      status: { old: request.status, new: updateData.status },
      ...(rejection_reason ? { rejection_reason: { old: null, new: rejection_reason } } : {}),
    },
  });

  return NextResponse.json(updated);
}
