import { getSupabaseService } from "./supabase-service";

type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "approve"
  | "reject"
  | "create_account";

type AuditParams = {
  companyId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  ipAddress?: string | null;
};

/**
 * Log an audit event. Uses service role client to bypass RLS.
 * Fire-and-forget — does not throw on failure.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = getSupabaseService();
    await supabase.from("audit_logs").insert({
      company_id: params.companyId,
      user_id: params.userId ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      changes: params.changes ?? null,
      ip_address: params.ipAddress ?? null,
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error("Audit log failed:", err);
  }
}
