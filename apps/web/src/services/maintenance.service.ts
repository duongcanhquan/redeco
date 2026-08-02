import 'server-only';
import {
  canCompleteMaintenanceOrder,
  canConvertWorkRequest,
  canTransitionMaintenanceOrder,
  computeOee,
  evaluateMeterThreshold,
  inclusiveCalendarDays,
  selectDueMaintenancePlans,
  type EquipmentCriticality,
  type EquipmentKind,
  type EquipmentStatus,
  type MaintenanceOrderKind,
  type MaintenanceOrderStatus,
  type MeterAlertLevel,
  type WorkRequestPriority,
  type WorkRequestStatus,
} from '@optimake/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { postInventoryTxn } from '@/services/inventory.service';
import {
  getTenantContext,
  managerDeniedMessage,
  type ActionResult,
} from '@/services/sales-context';

export type { ActionResult };

export interface EamEquipmentRow {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  kind: EquipmentKind;
  status: EquipmentStatus;
  criticality: EquipmentCriticality;
  location_text: string;
  installed_on: string | null;
  attributes?: Record<string, unknown>;
}

export interface EamWorkRequestRow {
  id: string;
  equipment_id: string;
  code: string;
  title: string;
  description: string;
  priority: WorkRequestPriority;
  status: WorkRequestStatus;
  reported_on: string;
  maintenance_order_id: string | null;
  eam_equipment?: { code: string; name: string } | null;
}

export interface EamMaintenanceOrderRow {
  id: string;
  equipment_id: string;
  work_request_id: string | null;
  plan_id: string | null;
  code: string;
  kind: MaintenanceOrderKind;
  status: MaintenanceOrderStatus;
  priority: WorkRequestPriority;
  title: string;
  scheduled_on: string | null;
  downtime_minutes: number;
  created_at: string;
  attributes?: Record<string, unknown>;
  eam_equipment?: { code: string; name: string } | null;
  eam_maintenance_tasks?: EamTaskRow[] | null;
  eam_maintenance_part_lines?: EamPartLineRow[] | null;
}

export interface EamTaskRow {
  id: string;
  order_id: string;
  sort_order: number;
  title: string;
  is_done: boolean;
  done_at: string | null;
  notes: string;
}

export interface EamPartLineRow {
  id: string;
  order_id: string;
  item_id: string;
  warehouse_id: string;
  qty_planned: number;
  qty_issued: number;
  status: 'planned' | 'issued' | 'cancelled';
  inventory_txn_id: string | null;
  inventory_items?: { sku: string; name: string; uom: string } | null;
  warehouses?: { code: string; name: string } | null;
}

export interface EamPlanRow {
  id: string;
  equipment_id: string;
  code: string;
  name: string;
  interval_days: number;
  next_due_on: string;
  last_generated_on: string | null;
  is_active: boolean;
  checklist: string[];
  eam_equipment?: { code: string; name: string } | null;
}

async function assertEamAccess(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', {
    p_key: 'thiet-bi',
  });
  if (error) return false;
  return data === true;
}

async function nextCode(
  supabase: SupabaseClient,
  tenantId: string,
  table: string,
  prefix: string,
): Promise<string> {
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  const n = (count ?? 0) + 1;
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

function parseChecklist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

export async function listEquipment(
  supabase: SupabaseClient,
): Promise<EamEquipmentRow[]> {
  const { data, error } = await supabase
    .from('eam_equipment')
    .select(
      'id, parent_id, code, name, kind, status, criticality, location_text, installed_on, attributes',
    )
    .order('code');
  if (error) throw new Error(`Không tải thiết bị: ${error.message}`);
  return (data ?? []) as EamEquipmentRow[];
}

export async function listWorkRequests(
  supabase: SupabaseClient,
): Promise<EamWorkRequestRow[]> {
  const { data, error } = await supabase
    .from('eam_work_requests')
    .select(
      'id, equipment_id, code, title, description, priority, status, reported_on, maintenance_order_id, eam_equipment(code, name)',
    )
    .order('reported_on', { ascending: false });
  if (error) throw new Error(`Không tải yêu cầu BT: ${error.message}`);
  return (data ?? []) as unknown as EamWorkRequestRow[];
}

export async function listMaintenanceOrders(
  supabase: SupabaseClient,
): Promise<EamMaintenanceOrderRow[]> {
  const { data, error } = await supabase
    .from('eam_maintenance_orders')
    .select(
      'id, equipment_id, work_request_id, plan_id, code, kind, status, priority, title, scheduled_on, downtime_minutes, created_at, eam_equipment(code, name)',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải lệnh BT: ${error.message}`);
  return (data ?? []) as unknown as EamMaintenanceOrderRow[];
}

export async function getMaintenanceOrder(
  supabase: SupabaseClient,
  id: string,
): Promise<EamMaintenanceOrderRow | null> {
  const { data, error } = await supabase
    .from('eam_maintenance_orders')
    .select(
      'id, equipment_id, work_request_id, plan_id, code, kind, status, priority, title, scheduled_on, downtime_minutes, created_at, attributes, eam_equipment(code, name), eam_maintenance_tasks(id, order_id, sort_order, title, is_done, done_at, notes), eam_maintenance_part_lines(id, order_id, item_id, warehouse_id, qty_planned, qty_issued, status, inventory_txn_id, inventory_items(sku, name, uom), warehouses(code, name))',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Không tải lệnh BT: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as EamMaintenanceOrderRow & {
    attributes?: Record<string, unknown>;
  };
  if (row.eam_maintenance_tasks) {
    row.eam_maintenance_tasks = [...row.eam_maintenance_tasks].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
  }
  return row;
}

export async function listMaintenancePlans(
  supabase: SupabaseClient,
): Promise<EamPlanRow[]> {
  const { data, error } = await supabase
    .from('eam_maintenance_plans')
    .select(
      'id, equipment_id, code, name, interval_days, next_due_on, last_generated_on, is_active, checklist, eam_equipment(code, name)',
    )
    .order('next_due_on');
  if (error) throw new Error(`Không tải kế hoạch PM: ${error.message}`);
  return ((data ?? []) as unknown as Array<Omit<EamPlanRow, 'checklist'> & { checklist: unknown }>).map(
    (r) => ({
      ...r,
      checklist: parseChecklist(r.checklist),
    }),
  );
}

export async function createEquipment(input: {
  code: string;
  name: string;
  kind: EquipmentKind;
  status?: EquipmentStatus;
  criticality?: EquipmentCriticality;
  parentId?: string;
  locationText?: string;
  installedOn?: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) return { ok: false, error: 'Mã và tên bắt buộc.' };

  const { data, error } = await ctx.supabase
    .from('eam_equipment')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      name,
      kind: input.kind,
      status: input.status ?? 'active',
      criticality: input.criticality ?? 'medium',
      parent_id: input.parentId || null,
      location_text: input.locationText?.trim() ?? '',
      installed_on: input.installedOn || null,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Mã thiết bị đã tồn tại.' };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function createWorkRequest(input: {
  equipmentId: string;
  title: string;
  description?: string;
  priority?: WorkRequestPriority;
  reportedOn?: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const title = input.title.trim();
  if (!title || !input.equipmentId) {
    return { ok: false, error: 'Thiết bị và tiêu đề bắt buộc.' };
  }

  const code = await nextCode(ctx.supabase, ctx.tenantId, 'eam_work_requests', 'YC');
  const { data, error } = await ctx.supabase
    .from('eam_work_requests')
    .insert({
      tenant_id: ctx.tenantId,
      equipment_id: input.equipmentId,
      code,
      title,
      description: input.description?.trim() ?? '',
      priority: input.priority ?? 'medium',
      status: 'open',
      reported_on: input.reportedOn ?? new Date().toISOString().slice(0, 10),
      reported_by: ctx.userId,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function convertWorkRequestToOrder(
  workRequestId: string,
): Promise<ActionResult<{ orderId: string }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const { data: wr, error } = await ctx.supabase
    .from('eam_work_requests')
    .select('id, equipment_id, title, priority, status, description')
    .eq('id', workRequestId)
    .maybeSingle();
  if (error || !wr) return { ok: false, error: 'Không tìm thấy yêu cầu.' };
  const row = wr as {
    id: string;
    equipment_id: string;
    title: string;
    priority: WorkRequestPriority;
    status: WorkRequestStatus;
    description: string;
  };
  if (!canConvertWorkRequest(row.status)) {
    return { ok: false, error: 'Yêu cầu không thể chuyển thành lệnh.' };
  }

  const code = await nextCode(
    ctx.supabase,
    ctx.tenantId,
    'eam_maintenance_orders',
    'LBT',
  );
  const { data: mo, error: moErr } = await ctx.supabase
    .from('eam_maintenance_orders')
    .insert({
      tenant_id: ctx.tenantId,
      equipment_id: row.equipment_id,
      work_request_id: row.id,
      code,
      kind: 'corrective',
      status: 'released',
      priority: row.priority,
      title: row.title,
      created_by: ctx.userId,
    })
    .select('id')
    .single();
  if (moErr || !mo) return { ok: false, error: moErr?.message ?? 'Tạo lệnh thất bại.' };
  const orderId = (mo as { id: string }).id;

  const { error: taskErr } = await ctx.supabase.from('eam_maintenance_tasks').insert({
    tenant_id: ctx.tenantId,
    order_id: orderId,
    sort_order: 0,
    title: row.description?.trim() || row.title,
  });
  if (taskErr) {
    await ctx.supabase.from('eam_maintenance_orders').delete().eq('id', orderId);
    return { ok: false, error: taskErr.message };
  }

  const { error: upErr } = await ctx.supabase
    .from('eam_work_requests')
    .update({
      status: 'converted',
      maintenance_order_id: orderId,
    })
    .eq('id', row.id)
    .in('status', ['open', 'approved']);
  if (upErr) {
    await ctx.supabase.from('eam_maintenance_orders').delete().eq('id', orderId);
    return { ok: false, error: upErr.message };
  }
  // Nếu WR đã bị convert bởi request khác (0 row) — dọn lệnh orphan
  const { data: wrCheck } = await ctx.supabase
    .from('eam_work_requests')
    .select('status, maintenance_order_id')
    .eq('id', row.id)
    .maybeSingle();
  const wrAfter = wrCheck as { status: string; maintenance_order_id: string | null } | null;
  if (!wrAfter || wrAfter.status !== 'converted' || wrAfter.maintenance_order_id !== orderId) {
    await ctx.supabase.from('eam_maintenance_orders').delete().eq('id', orderId);
    return { ok: false, error: 'Yêu cầu đã được xử lý bởi thao tác khác.' };
  }
  return { ok: true, data: { orderId } };
}

export async function createMaintenanceOrder(input: {
  equipmentId: string;
  title: string;
  kind?: MaintenanceOrderKind;
  priority?: WorkRequestPriority;
  scheduledOn?: string;
  taskTitles?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  const title = input.title.trim();
  if (!title || !input.equipmentId) {
    return { ok: false, error: 'Thiết bị và tiêu đề bắt buộc.' };
  }

  const code = await nextCode(
    ctx.supabase,
    ctx.tenantId,
    'eam_maintenance_orders',
    'LBT',
  );
  const { data: mo, error } = await ctx.supabase
    .from('eam_maintenance_orders')
    .insert({
      tenant_id: ctx.tenantId,
      equipment_id: input.equipmentId,
      code,
      kind: input.kind ?? 'corrective',
      status: 'draft',
      priority: input.priority ?? 'medium',
      title,
      scheduled_on: input.scheduledOn || null,
      created_by: ctx.userId,
    })
    .select('id')
    .single();
  if (error || !mo) return { ok: false, error: error?.message ?? 'Tạo lệnh thất bại.' };
  const orderId = (mo as { id: string }).id;
  const titles = (input.taskTitles ?? []).map((t) => t.trim()).filter(Boolean);
  if (titles.length > 0) {
    await ctx.supabase.from('eam_maintenance_tasks').insert(
      titles.map((t, i) => ({
        tenant_id: ctx.tenantId,
        order_id: orderId,
        sort_order: i,
        title: t,
      })),
    );
  }
  return { ok: true, data: { id: orderId } };
}

export async function transitionMaintenanceOrder(input: {
  orderId: string;
  to: MaintenanceOrderStatus;
  downtimeMinutes?: number;
}): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const { data: rawOrder, error: loadErr } = await ctx.supabase
    .from('eam_maintenance_orders')
    .select(
      'id, equipment_id, status, attributes, eam_maintenance_tasks(id, is_done)',
    )
    .eq('id', input.orderId)
    .maybeSingle();
  if (loadErr || !rawOrder) return { ok: false, error: 'Không tìm thấy lệnh.' };
  const order = rawOrder as {
    id: string;
    equipment_id: string;
    status: MaintenanceOrderStatus;
    attributes: Record<string, unknown> | null;
    eam_maintenance_tasks: { id: string; is_done: boolean }[] | null;
  };

  if (!canTransitionMaintenanceOrder(order.status, input.to)) {
    return { ok: false, error: `Không chuyển ${order.status} → ${input.to}.` };
  }

  if (input.to === 'completed') {
    const tasks = order.eam_maintenance_tasks ?? [];
    const allDone = tasks.length === 0 || tasks.every((t) => t.is_done);
    if (!canCompleteMaintenanceOrder(allDone, false)) {
      return { ok: false, error: 'Hoàn thành checklist trước khi đóng lệnh.' };
    }
  }

  const attrs = { ...(order.attributes ?? {}) };
  const patch: Record<string, unknown> = { status: input.to };

  if (input.to === 'in_progress') {
    patch.started_at = new Date().toISOString();
    const { data: eq } = await ctx.supabase
      .from('eam_equipment')
      .select('status')
      .eq('id', order.equipment_id)
      .maybeSingle();
    const prev = (eq as { status?: EquipmentStatus } | null)?.status ?? 'active';
    if (!attrs['prev_equipment_status']) {
      attrs['prev_equipment_status'] = prev;
    }
    patch.attributes = attrs;
    await ctx.supabase
      .from('eam_equipment')
      .update({ status: 'down' })
      .eq('id', order.equipment_id);
  }

  if (input.to === 'completed' || input.to === 'cancelled') {
    if (input.to === 'completed') {
      patch.completed_at = new Date().toISOString();
      if (input.downtimeMinutes != null) {
        patch.downtime_minutes = Math.max(0, input.downtimeMinutes);
      }
    }
    // Chỉ restore khi lệnh này từng đánh dấu máy down
    if (Object.prototype.hasOwnProperty.call(attrs, 'prev_equipment_status')) {
      const { count: otherOpen } = await ctx.supabase
        .from('eam_maintenance_orders')
        .select('id', { count: 'exact', head: true })
        .eq('equipment_id', order.equipment_id)
        .eq('status', 'in_progress')
        .neq('id', order.id);
      if ((otherOpen ?? 0) === 0) {
        const prevStatus = attrs['prev_equipment_status'];
        const restore: EquipmentStatus =
          typeof prevStatus === 'string' &&
          ['draft', 'active', 'idle', 'down', 'retired'].includes(prevStatus)
            ? (prevStatus as EquipmentStatus)
            : 'active';
        await ctx.supabase
          .from('eam_equipment')
          .update({ status: restore === 'down' ? 'active' : restore })
          .eq('id', order.equipment_id);
      }
      delete attrs['prev_equipment_status'];
      patch.attributes = attrs;
    }
  }

  const { error } = await ctx.supabase
    .from('eam_maintenance_orders')
    .update(patch)
    .eq('id', input.orderId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function addMaintenancePartLine(input: {
  orderId: string;
  itemId: string;
  warehouseId: string;
  qtyPlanned: number;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(input.qtyPlanned > 0)) return { ok: false, error: 'Số lượng phải > 0.' };

  const order = await getMaintenanceOrder(ctx.supabase, input.orderId);
  if (!order) return { ok: false, error: 'Không tìm thấy lệnh.' };
  if (order.status === 'completed' || order.status === 'cancelled') {
    return { ok: false, error: 'Lệnh đã đóng — không thêm phụ tùng.' };
  }

  const { data, error } = await ctx.supabase
    .from('eam_maintenance_part_lines')
    .insert({
      tenant_id: ctx.tenantId,
      order_id: input.orderId,
      item_id: input.itemId,
      warehouse_id: input.warehouseId,
      qty_planned: input.qtyPlanned,
      qty_issued: 0,
      status: 'planned',
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function cancelMaintenancePartLine(
  partLineId: string,
): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const { data: line } = await ctx.supabase
    .from('eam_maintenance_part_lines')
    .select('id, status')
    .eq('id', partLineId)
    .maybeSingle();
  if (!line) return { ok: false, error: 'Không tìm thấy dòng phụ tùng.' };
  if ((line as { status: string }).status === 'issued') {
    return { ok: false, error: 'Đã xuất kho — không huỷ được.' };
  }
  const { error } = await ctx.supabase
    .from('eam_maintenance_part_lines')
    .update({ status: 'cancelled' })
    .eq('id', partLineId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

/** Xuất toàn bộ dòng phụ tùng planned còn lại (gom theo kho). */
export async function issueMaintenanceParts(
  orderId: string,
): Promise<ActionResult<{ txnCodes: string[] }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const order = await getMaintenanceOrder(ctx.supabase, orderId);
  if (!order) return { ok: false, error: 'Không tìm thấy lệnh.' };
  if (order.status !== 'released' && order.status !== 'in_progress') {
    return { ok: false, error: 'Chỉ xuất phụ tùng khi lệnh đã phát hành / đang làm.' };
  }

  const planned = (order.eam_maintenance_part_lines ?? []).filter(
    (l) => l.status === 'planned' && l.qty_issued < l.qty_planned,
  );
  if (planned.length === 0) {
    return { ok: false, error: 'Không có phụ tùng chờ xuất.' };
  }

  const byWh = new Map<string, typeof planned>();
  for (const line of planned) {
    const list = byWh.get(line.warehouse_id) ?? [];
    list.push(line);
    byWh.set(line.warehouse_id, list);
  }

  const txnCodes: string[] = [];
  for (const [warehouseId, lines] of byWh) {
    const posted = await postInventoryTxn({
      warehouseId,
      txnType: 'issue',
      notes: `Phụ tùng BT ${order.code}`,
      lines: lines.map((l) => ({
        itemId: l.item_id,
        qty: Number(l.qty_planned) - Number(l.qty_issued),
      })),
    });
    if (!posted.ok) return posted;
    txnCodes.push(posted.data.code);

    for (const l of lines) {
      const { error } = await ctx.supabase
        .from('eam_maintenance_part_lines')
        .update({
          qty_issued: l.qty_planned,
          status: 'issued',
          inventory_txn_id: posted.data.id,
        })
        .eq('id', l.id);
      if (error) return { ok: false, error: error.message };
    }
  }

  return { ok: true, data: { txnCodes } };
}

export async function setTaskDone(input: {
  taskId: string;
  isDone: boolean;
}): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  const { error } = await ctx.supabase
    .from('eam_maintenance_tasks')
    .update({
      is_done: input.isDone,
      done_at: input.isDone ? new Date().toISOString() : null,
    })
    .eq('id', input.taskId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function setWorkRequestStatus(input: {
  workRequestId: string;
  status: 'approved' | 'rejected' | 'cancelled';
}): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const { data: wr } = await ctx.supabase
    .from('eam_work_requests')
    .select('id, status')
    .eq('id', input.workRequestId)
    .maybeSingle();
  if (!wr) return { ok: false, error: 'Không tìm thấy yêu cầu.' };
  const cur = (wr as { status: WorkRequestStatus }).status;
  if (cur !== 'open' && cur !== 'approved') {
    return { ok: false, error: 'Chỉ duyệt/từ chối yêu cầu đang mở.' };
  }
  if (input.status === 'approved' && cur === 'approved') {
    return { ok: true, data: undefined };
  }
  const { error } = await ctx.supabase
    .from('eam_work_requests')
    .update({ status: input.status })
    .eq('id', input.workRequestId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

export async function createMaintenancePlan(input: {
  equipmentId: string;
  code: string;
  name: string;
  intervalDays: number;
  nextDueOn: string;
  checklist?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name || !input.equipmentId) {
    return { ok: false, error: 'Mã, tên và thiết bị bắt buộc.' };
  }
  if (input.intervalDays < 1) {
    return { ok: false, error: 'Chu kỳ (ngày) phải ≥ 1.' };
  }

  const { data, error } = await ctx.supabase
    .from('eam_maintenance_plans')
    .insert({
      tenant_id: ctx.tenantId,
      equipment_id: input.equipmentId,
      code,
      name,
      interval_days: input.intervalDays,
      next_due_on: input.nextDueOn,
      is_active: true,
      checklist: (input.checklist ?? []).map((t) => t.trim()).filter(Boolean),
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Mã kế hoạch đã tồn tại.' };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function setPlanActive(input: {
  planId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  const { error } = await ctx.supabase
    .from('eam_maintenance_plans')
    .update({ is_active: input.isActive })
    .eq('id', input.planId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

/**
 * Chạy engine PM: sinh lệnh preventive cho plan đến hạn.
 */
export async function runPreventiveMaintenance(
  asOf?: string,
): Promise<ActionResult<{ created: number; orderCodes: string[] }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const asOfDate = asOf ?? new Date().toISOString().slice(0, 10);
  const plans = await listMaintenancePlans(ctx.supabase);
  const candidates = selectDueMaintenancePlans(
    plans.map((p) => ({
      id: p.id,
      equipmentId: p.equipment_id,
      code: p.code,
      name: p.name,
      intervalDays: p.interval_days,
      nextDueOn: p.next_due_on,
      isActive: p.is_active,
      checklist: p.checklist,
    })),
    asOfDate,
  );

  if (candidates.length === 0) {
    return { ok: true, data: { created: 0, orderCodes: [] } };
  }

  const orderCodes: string[] = [];
  /** planId → last next_due after all catch-ups in this run */
  const planNextDue = new Map<string, string>();

  for (const c of candidates) {
    const code = await nextCode(
      ctx.supabase,
      ctx.tenantId,
      'eam_maintenance_orders',
      'LBT',
    );
    const { data: mo, error } = await ctx.supabase
      .from('eam_maintenance_orders')
      .insert({
        tenant_id: ctx.tenantId,
        equipment_id: c.equipmentId,
        plan_id: c.planId,
        code,
        kind: 'preventive',
        status: 'released',
        priority: 'medium',
        title: `PM ${c.planCode}: ${c.planName}`,
        scheduled_on: c.dueOn,
        created_by: ctx.userId,
        attributes: { due_on: c.dueOn, catch_up_index: c.catchUpIndex },
      })
      .select('id')
      .single();
    if (error || !mo) {
      return { ok: false, error: error?.message ?? 'Sinh lệnh PM thất bại.' };
    }
    const orderId = (mo as { id: string }).id;
    const titles =
      c.taskTitles.length > 0
        ? [...c.taskTitles]
        : [`Thực hiện bảo trì định kỳ ${c.planCode}`];
    await ctx.supabase.from('eam_maintenance_tasks').insert(
      titles.map((t, i) => ({
        tenant_id: ctx.tenantId,
        order_id: orderId,
        sort_order: i,
        title: t,
      })),
    );
    orderCodes.push(code);
    planNextDue.set(c.planId, c.nextDueAfterGenerate);
  }

  for (const [planId, nextDue] of planNextDue) {
    const { error } = await ctx.supabase
      .from('eam_maintenance_plans')
      .update({
        next_due_on: nextDue,
        last_generated_on: asOfDate,
      })
      .eq('id', planId);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true, data: { created: orderCodes.length, orderCodes } };
}

export interface EamMeterRow {
  id: string;
  equipment_id: string;
  code: string;
  name: string;
  unit: string;
  threshold_warn: number | null;
  threshold_critical: number | null;
  last_value: number | null;
  last_reading_at: string | null;
  is_active: boolean;
  alertLevel: MeterAlertLevel;
  eam_equipment?: { code: string; name: string } | null;
}

export interface EquipmentOeeRow {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  plannedMinutes: number;
  downtimeMinutes: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export async function listMeters(supabase: SupabaseClient): Promise<EamMeterRow[]> {
  const { data, error } = await supabase
    .from('eam_meters')
    .select(
      'id, equipment_id, code, name, unit, threshold_warn, threshold_critical, last_value, last_reading_at, is_active, eam_equipment(code, name)',
    )
    .order('code');
  if (error) throw new Error(`Không tải meter: ${error.message}`);
  return ((data ?? []) as unknown as Array<Omit<EamMeterRow, 'alertLevel'>>).map((m) => ({
    ...m,
    alertLevel:
      m.last_value == null
        ? 'ok'
        : evaluateMeterThreshold({
            value: m.last_value,
            thresholdWarn: m.threshold_warn,
            thresholdCritical: m.threshold_critical,
          }),
  }));
}

export async function createMeter(input: {
  equipmentId: string;
  code: string;
  name: string;
  unit?: string;
  thresholdWarn?: number | null;
  thresholdCritical?: number | null;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name || !input.equipmentId) {
    return { ok: false, error: 'Mã, tên và thiết bị bắt buộc.' };
  }

  const { data, error } = await ctx.supabase
    .from('eam_meters')
    .insert({
      tenant_id: ctx.tenantId,
      equipment_id: input.equipmentId,
      code,
      name,
      unit: input.unit?.trim() || 'h',
      threshold_warn: input.thresholdWarn ?? null,
      threshold_critical: input.thresholdCritical ?? null,
      is_active: true,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Mã meter đã tồn tại.' };
    return { ok: false, error: error.message };
  }
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function recordMeterReading(input: {
  meterId: string;
  value: number;
  source?: 'manual' | 'iot_stub';
}): Promise<
  ActionResult<{ alertLevel: MeterAlertLevel; workRequestId: string | null }>
> {
  const ctx = await getTenantContext();
  if (!(await assertEamAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa được cấp module Thiết bị.' };
  }
  if (!Number.isFinite(input.value)) {
    return { ok: false, error: 'Giá trị không hợp lệ.' };
  }

  const { data: meter, error: mErr } = await ctx.supabase
    .from('eam_meters')
    .select(
      'id, equipment_id, code, name, threshold_warn, threshold_critical, is_active, attributes',
    )
    .eq('id', input.meterId)
    .maybeSingle();
  if (mErr || !meter) return { ok: false, error: 'Không tìm thấy meter.' };
  const row = meter as {
    id: string;
    equipment_id: string;
    code: string;
    name: string;
    threshold_warn: number | null;
    threshold_critical: number | null;
    is_active: boolean;
    attributes: Record<string, unknown> | null;
  };
  if (!row.is_active) return { ok: false, error: 'Meter đã tắt.' };

  const alertLevel = evaluateMeterThreshold({
    value: input.value,
    thresholdWarn: row.threshold_warn,
    thresholdCritical: row.threshold_critical,
  });

  let workRequestId: string | null = null;
  if (alertLevel === 'critical') {
    const { data: existingWr } = await ctx.supabase
      .from('eam_work_requests')
      .select('id, attributes, status')
      .eq('equipment_id', row.equipment_id)
      .in('status', ['open', 'approved']);
    const dup = ((existingWr ?? []) as { id: string; attributes: Record<string, unknown> | null }[]).find(
      (w) => w.attributes?.['meter_id'] === row.id,
    );
    if (dup) {
      workRequestId = dup.id;
    } else {
      const wrCode = await nextCode(
        ctx.supabase,
        ctx.tenantId,
        'eam_work_requests',
        'YC',
      );
      const { data: wrIns, error: wrErr } = await ctx.supabase
        .from('eam_work_requests')
        .insert({
          tenant_id: ctx.tenantId,
          equipment_id: row.equipment_id,
          code: wrCode,
          title: `PdM critical: ${row.code} = ${input.value}`,
          description: `Meter ${row.name} vượt ngưỡng critical. Giá trị ${input.value}.`,
          priority: 'urgent',
          status: 'open',
          reported_by: ctx.userId,
          attributes: { meter_id: row.id, source: 'pdm' },
        })
        .select('id')
        .single();
      if (wrErr) {
        return {
          ok: false,
          error: `Đọc meter OK logic nhưng tạo YC thất bại: ${wrErr.message}`,
        };
      }
      workRequestId = (wrIns as { id: string }).id;
    }
  }

  const { data: reading, error: rErr } = await ctx.supabase
    .from('eam_meter_readings')
    .insert({
      tenant_id: ctx.tenantId,
      meter_id: row.id,
      value: input.value,
      source: input.source ?? 'manual',
      work_request_id: workRequestId,
    })
    .select('id')
    .single();
  if (rErr) return { ok: false, error: rErr.message };

  const mergedAttrs = {
    ...(row.attributes ?? {}),
    last_alert: alertLevel,
    last_reading_id: (reading as { id: string }).id,
  };
  const { error: upErr } = await ctx.supabase
    .from('eam_meters')
    .update({
      last_value: input.value,
      last_reading_at: new Date().toISOString(),
      attributes: mergedAttrs,
    })
    .eq('id', row.id);
  if (upErr) return { ok: false, error: upErr.message };

  return { ok: true, data: { alertLevel, workRequestId } };
}

export async function computeEquipmentOeeRows(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<EquipmentOeeRow[]> {
  const equipment = await listEquipment(supabase);
  const { data: orders } = await supabase
    .from('eam_maintenance_orders')
    .select('equipment_id, downtime_minutes, status, completed_at, started_at, created_at')
    .in('status', ['in_progress', 'completed']);

  const days = inclusiveCalendarDays(fromIso, toIso);
  const byEq = new Map<string, number>();
  for (const raw of orders ?? []) {
    const o = raw as {
      equipment_id: string;
      downtime_minutes: number;
      completed_at: string | null;
      started_at: string | null;
      created_at: string;
    };
    const stamp = (o.completed_at ?? o.started_at ?? o.created_at).slice(0, 10);
    if (stamp < fromIso || stamp > toIso) continue;
    byEq.set(
      o.equipment_id,
      (byEq.get(o.equipment_id) ?? 0) + Number(o.downtime_minutes ?? 0),
    );
  }

  return equipment
    .filter((e) => e.status !== 'retired' && e.status !== 'draft')
    .map((e) => {
      const rawHours = e.attributes?.['planned_hours_per_day'];
      const plannedHours =
        typeof rawHours === 'number' && rawHours > 0
          ? rawHours
          : typeof rawHours === 'string' && Number(rawHours) > 0
            ? Number(rawHours)
            : 8;
      const plannedMinutes = days * plannedHours * 60;
      const downtimeMinutes = byEq.get(e.id) ?? 0;
      const calc = computeOee({ plannedMinutes, downtimeMinutes });
      return {
        equipmentId: e.id,
        equipmentCode: e.code,
        equipmentName: e.name,
        plannedMinutes,
        downtimeMinutes,
        ...calc,
      };
    })
    .sort((a, b) => a.oee - b.oee);
}
