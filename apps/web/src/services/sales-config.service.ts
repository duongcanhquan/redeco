import 'server-only';
import type { AssigneeRole, CustomerKind, DiscountRuleConditions } from '@optimake/domain';
import {
  getTenantContext,
  requireManager,
  type ActionResult,
  type TenantContext,
} from '@/services/sales-context';

// ------------------------------------------------------------
// Discount rules
// ------------------------------------------------------------

export interface DiscountRuleRow {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  discount_pct: number;
  conditions: DiscountRuleConditions;
  created_at: string;
}

export async function listDiscountRules(): Promise<DiscountRuleRow[]> {
  const ctx = await getTenantContext();
  const { data, error } = await ctx.supabase
    .from('discount_rules')
    .select(
      'id, name, priority, is_active, valid_from, valid_until, discount_pct, conditions, created_at',
    )
    .order('priority')
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as DiscountRuleRow[];
}

export interface DiscountRuleInput {
  name: string;
  priority: number;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  discountPct: number;
  conditions: DiscountRuleConditions;
}

export async function upsertDiscountRule(
  input: DiscountRuleInput & { id?: string },
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Tên quy tắc không được để trống.' };
  if (input.discountPct < 0 || input.discountPct > 100) {
    return { ok: false, error: 'Chiết khấu phải trong khoảng 0–100%.' };
  }

  const row = {
    tenant_id: ctx.tenantId,
    name,
    priority: input.priority,
    is_active: input.isActive,
    valid_from: input.validFrom,
    valid_until: input.validUntil,
    discount_pct: input.discountPct,
    conditions: input.conditions ?? {},
  };

  if (input.id) {
    const { error } = await ctx.supabase.from('discount_rules').update(row).eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { id: input.id } };
  }
  const { data, error } = await ctx.supabase.from('discount_rules').insert(row).select('id').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function deleteDiscountRule(id: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const { error } = await ctx.supabase.from('discount_rules').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------
// Approval workflows (N cấp)
// ------------------------------------------------------------

export interface ApprovalStepRow {
  id: string;
  step_order: number;
  name: string;
  min_amount: number;
  assignee_role: AssigneeRole | null;
  assignee_user_id: string | null;
}

export interface ApprovalWorkflowRow {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  approval_workflow_steps: ApprovalStepRow[];
}

export async function listApprovalWorkflows(): Promise<ApprovalWorkflowRow[]> {
  const ctx = await getTenantContext();
  await ensureDefaultQuotationWorkflow(ctx);
  const { data, error } = await ctx.supabase
    .from('approval_workflows')
    .select(
      'id, name, is_default, is_active, approval_workflow_steps(id, step_order, name, min_amount, assignee_role, assignee_user_id)',
    )
    .eq('entity_type', 'quotation')
    .order('created_at');
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ApprovalWorkflowRow[];
  for (const w of rows) {
    w.approval_workflow_steps = [...(w.approval_workflow_steps ?? [])].sort(
      (a, b) => a.step_order - b.step_order,
    );
  }
  return rows;
}

export interface ApprovalStepInput {
  name: string;
  minAmount: number;
  assigneeRole: AssigneeRole | null;
  assigneeUserId: string | null;
}

export interface SaveWorkflowInput {
  id?: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  steps: ApprovalStepInput[];
}

/** Lưu workflow + thay toàn bộ steps (đơn giản, rõ ràng). */
export async function saveApprovalWorkflow(
  input: SaveWorkflowInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Tên quy trình không được để trống.' };
  if (input.steps.length === 0) return { ok: false, error: 'Cần ít nhất 1 bước duyệt.' };
  for (const s of input.steps) {
    if (!s.name.trim()) return { ok: false, error: 'Tên bước không được để trống.' };
    if (!s.assigneeRole && !s.assigneeUserId) {
      return { ok: false, error: `Bước "${s.name}" cần gán role hoặc user.` };
    }
    if (s.minAmount < 0) return { ok: false, error: 'Ngưỡng tiền không được âm.' };
  }

  if (input.isDefault) {
    await ctx.supabase
      .from('approval_workflows')
      .update({ is_default: false })
      .eq('tenant_id', ctx.tenantId)
      .eq('entity_type', 'quotation');
  }

  let workflowId = input.id;
  if (workflowId) {
    const { error } = await ctx.supabase
      .from('approval_workflows')
      .update({
        name,
        is_default: input.isDefault,
        is_active: input.isActive,
      })
      .eq('id', workflowId);
    if (error) return { ok: false, error: error.message };
    await ctx.supabase.from('approval_workflow_steps').delete().eq('workflow_id', workflowId);
  } else {
    const { data, error } = await ctx.supabase
      .from('approval_workflows')
      .insert({
        tenant_id: ctx.tenantId,
        name,
        entity_type: 'quotation',
        is_default: input.isDefault,
        is_active: input.isActive,
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    workflowId = (data as { id: string }).id;
  }

  const { error: stepError } = await ctx.supabase.from('approval_workflow_steps').insert(
    input.steps.map((s, i) => ({
      tenant_id: ctx.tenantId,
      workflow_id: workflowId,
      step_order: i + 1,
      name: s.name.trim(),
      min_amount: s.minAmount,
      assignee_role: s.assigneeUserId ? null : s.assigneeRole,
      assignee_user_id: s.assigneeUserId,
    })),
  );
  if (stepError) return { ok: false, error: stepError.message };
  return { ok: true, data: { id: workflowId } };
}

/**
 * Đảm bảo mỗi tenant có 1 workflow mặc định:
 * 1) Admin (mọi giá trị) 2) Owner (từ 50 triệu).
 */
export async function ensureDefaultQuotationWorkflow(ctx: TenantContext): Promise<string> {
  const { data: existing } = await ctx.supabase
    .from('approval_workflows')
    .select('id')
    .eq('entity_type', 'quotation')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: anyWf } = await ctx.supabase
    .from('approval_workflows')
    .select('id')
    .eq('entity_type', 'quotation')
    .limit(1)
    .maybeSingle();
  if (anyWf) {
    const id = (anyWf as { id: string }).id;
    await ctx.supabase.from('approval_workflows').update({ is_default: true }).eq('id', id);
    return id;
  }

  const { data, error } = await ctx.supabase
    .from('approval_workflows')
    .insert({
      tenant_id: ctx.tenantId,
      name: 'Duyệt báo giá mặc định',
      entity_type: 'quotation',
      is_default: true,
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Tạo quy trình duyệt mặc định thất bại: ${error.message}`);
  const id = (data as { id: string }).id;
  await ctx.supabase.from('approval_workflow_steps').insert([
    {
      tenant_id: ctx.tenantId,
      workflow_id: id,
      step_order: 1,
      name: 'Quản trị duyệt',
      min_amount: 0,
      assignee_role: 'admin',
    },
    {
      tenant_id: ctx.tenantId,
      workflow_id: id,
      step_order: 2,
      name: 'Chủ công ty duyệt',
      min_amount: 50_000_000,
      assignee_role: 'owner',
    },
  ]);
  return id;
}

/** Helper type re-export for UI filters. */
export type { CustomerKind };
