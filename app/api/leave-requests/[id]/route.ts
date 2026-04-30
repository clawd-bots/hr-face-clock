import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { canApproveForEmployee } from "@/lib/approval-auth";

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

  // Fetch the current leave request
  const { data: request, error: reqErr } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
  }

  // Authorization: HR+ always; department_manager only for their own department's employees;
  // employees can cancel their own requests.
  if (action === "cancel" && request.employee_id && request.filed_by === ctx.userId) {
    // Self-cancel allowed
  } else {
    const allowed = await canApproveForEmployee(ctx.userId, ctx.role, request.employee_id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fetch the corresponding balance
  const year = new Date(request.start_date).getFullYear();
  const { data: balance, error: balErr } = await supabase
    .from("leave_balances")
    .select("*")
    .eq("employee_id", request.employee_id)
    .eq("leave_type_id", request.leave_type_id)
    .eq("year", year)
    .eq("company_id", ctx.companyId)
    .single();

  if (balErr || !balance) {
    return NextResponse.json(
      { error: "Leave balance not found for this request" },
      { status: 400 }
    );
  }

  const totalDays = request.total_days;
  let updateData: Record<string, unknown> = {};
  let balanceUpdate: Record<string, number> = {};

  switch (action) {
    case "approve": {
      if (request.status !== "pending") {
        return NextResponse.json(
          { error: `Cannot approve a request with status '${request.status}'` },
          { status: 400 }
        );
      }
      updateData = {
        status: "approved",
        approved_by: ctx.userId,
        approved_at: new Date().toISOString(),
      };
      // Move pending_days to used_days
      balanceUpdate = {
        pending_days: balance.pending_days - totalDays,
        used_days: balance.used_days + totalDays,
      };
      break;
    }
    case "reject": {
      if (request.status !== "pending") {
        return NextResponse.json(
          { error: `Cannot reject a request with status '${request.status}'` },
          { status: 400 }
        );
      }
      updateData = {
        status: "rejected",
        rejection_reason: rejection_reason ?? null,
      };
      // Release pending_days
      balanceUpdate = {
        pending_days: balance.pending_days - totalDays,
      };
      break;
    }
    case "cancel": {
      if (request.status !== "pending") {
        return NextResponse.json(
          { error: "Can only cancel requests with status 'pending'" },
          { status: 400 }
        );
      }
      updateData = {
        status: "cancelled",
      };
      // Release pending_days
      balanceUpdate = {
        pending_days: balance.pending_days - totalDays,
      };
      break;
    }
  }

  // Update the leave request
  const { data: updated, error: updErr } = await supabase
    .from("leave_requests")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Update the balance
  const { error: balUpdErr } = await supabase
    .from("leave_balances")
    .update(balanceUpdate)
    .eq("id", balance.id);

  if (balUpdErr) {
    console.error("Failed to update leave balance:", balUpdErr);
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: action === "approve" ? "approve" : action === "reject" ? "reject" : "delete",
    entityType: "leave_request",
    entityId: id,
    changes: {
      status: { old: request.status, new: updateData.status },
      ...(rejection_reason ? { rejection_reason: { old: null, new: rejection_reason } } : {}),
    },
  });

  return NextResponse.json(updated);
}
