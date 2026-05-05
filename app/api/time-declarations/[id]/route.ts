import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase-service";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { canApproveForEmployee } from "@/lib/approval-auth";
import { recomputeDTR } from "@/lib/dtr-recompute";

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

  // Fetch the current time declaration
  const { data: declaration, error: declErr } = await supabase
    .from("time_declarations")
    .select("*")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .single();

  if (declErr || !declaration) {
    return NextResponse.json({ error: "Time declaration not found" }, { status: 404 });
  }

  // Authorization: HR+ always; department_manager only for their own department;
  // self-cancel allowed.
  if (action === "cancel" && declaration.filed_by === ctx.userId) {
    // Self-cancel allowed
  } else {
    const allowed = await canApproveForEmployee(ctx.userId, ctx.role, declaration.employee_id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (declaration.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot ${action} a declaration with status '${declaration.status}'` },
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

      // Create a time_log entry for the approved declaration
      const clockInDate = new Date(`${declaration.date}T${declaration.clock_in}`);
      const clockOutDate = new Date(`${declaration.date}T${declaration.clock_out}`);

      await supabase.from("time_logs").insert({
        employee_id: declaration.employee_id,
        clock_in: clockInDate.toISOString(),
        clock_out: clockOutDate.toISOString(),
        hours_worked: declaration.hours_worked,
        date: declaration.date,
        company_id: ctx.companyId,
      });

      // Reflect the new log in DTR right away so attendance/payroll views match.
      void recomputeDTR(
        supabase,
        ctx.companyId,
        declaration.employee_id,
        declaration.date,
      );

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

  // Update the time declaration
  const { data: updated, error: updErr } = await supabase
    .from("time_declarations")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.userId,
    action: action === "approve" ? "approve" : action === "reject" ? "reject" : "delete",
    entityType: "time_declaration",
    entityId: id,
    changes: {
      status: { old: declaration.status, new: updateData.status },
      ...(rejection_reason ? { rejection_reason: { old: null, new: rejection_reason } } : {}),
    },
  });

  return NextResponse.json(updated);
}
