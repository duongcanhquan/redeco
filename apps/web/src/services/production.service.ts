import 'server-only';
import { canReleaseWorkOrder, maxReceiptQty } from '@optimake/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTenantContext,
  requireManager,
  type ActionResult,
  type TenantContext,
} from '@/services/sales-context';
import { postInventoryTxn } from '@/services/inventory.service';
import { getProductionSettings } from '@/services/tenant-settings.service';

export type { ActionResult };

export interface BomRow {
  id: string;
  code: string;
  finished_item_id: string;
  version: number;
  status: string;
  created_at: string;
  inventory_items?: { sku: string; name: string; product_id: string | null } | null;
  bom_lines?: {
    id: string;
    component_item_id: string;
    qty_per: number;
    scrap_pct: number;
    uom: string;
    inventory_items?: { sku: string; name: string } | null;
  }[];
}

export interface WorkOrderRow {
  id: string;
  code: string;
  finished_item_id: string;
  bom_id: string | null;
  qty_planned: number;
  qty_completed: number;
  status: string;
  sales_order_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  warehouse_fg_id: string | null;
  warehouse_rm_id: string | null;
  created_at: string;
  inventory_items?: { sku: string; name: string; product_id: string | null } | null;
}

async function hasSxAccess(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', { p_key: 'san-xuat' });
  if (error) return false;
  return data === true;
}

async function warehouseIdByCode(
  ctx: TenantContext,
  code: string,
): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('warehouses')
    .select('id')
    .eq('code', code)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function listBoms(supabase: SupabaseClient): Promise<BomRow[]> {
  const { data, error } = await supabase
    .from('bills_of_materials')
    .select(
      'id, code, finished_item_id, version, status, created_at, inventory_items(sku, name, product_id), bom_lines(id, component_item_id, qty_per, scrap_pct, uom, inventory_items(sku, name))',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải được BOM: ${error.message}`);
  return (data ?? []) as unknown as BomRow[];
}

export async function listWorkOrders(supabase: SupabaseClient): Promise<WorkOrderRow[]> {
  const { data, error } = await supabase
    .from('work_orders')
    .select(
      'id, code, finished_item_id, bom_id, qty_planned, qty_completed, status, sales_order_id, planned_start, planned_end, warehouse_fg_id, warehouse_rm_id, created_at, inventory_items(sku, name, product_id)',
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(`Không tải được LSX: ${error.message}`);
  return (data ?? []) as unknown as WorkOrderRow[];
}

/** Open WO remaining qty + earliest planned_end theo product_id (CTP). */
export async function getOpenWoByProductIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, { qty: number; earliestEnd: string | null }>> {
  const map = new Map<string, { qty: number; earliestEnd: string | null }>();
  if (productIds.length === 0) return map;
  const unique = [...new Set(productIds)];
  for (const pid of unique) {
    const { data: qty } = await supabase.rpc('production_open_wo_qty', { p_product_id: pid });
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('product_id', pid);
    const itemIds = ((items ?? []) as { id: string }[]).map((i) => i.id);
    let earliest: string | null = null;
    if (itemIds.length > 0) {
      const { data: wos } = await supabase
        .from('work_orders')
        .select('planned_end')
        .in('finished_item_id', itemIds)
        .in('status', ['released', 'in_progress'])
        .not('planned_end', 'is', null)
        .order('planned_end', { ascending: true })
        .limit(1);
      earliest =
        ((wos ?? []) as { planned_end: string | null }[])[0]?.planned_end ?? null;
    }
    map.set(pid, { qty: Number(qty ?? 0), earliestEnd: earliest });
  }
  return map;
}

export interface CreateBomInput {
  code: string;
  finishedItemId: string;
  lines: { componentItemId: string; qtyPer: number; scrapPct?: number; uom?: string }[];
}

export async function createBom(input: CreateBomInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!(await hasSxAccess(ctx.supabase))) {
    return { ok: false, error: 'Công ty chưa được cấp module Sản xuất.' };
  }
  requireManager(ctx);
  if (!input.code.trim()) return { ok: false, error: 'Mã BOM bắt buộc.' };
  if (!input.finishedItemId) return { ok: false, error: 'Chọn thành phẩm.' };
  if (input.lines.length === 0) return { ok: false, error: 'Thêm ít nhất một dòng NVL.' };

  const { data: bom, error } = await ctx.supabase
    .from('bills_of_materials')
    .insert({
      tenant_id: ctx.tenantId,
      code: input.code.trim().toUpperCase(),
      finished_item_id: input.finishedItemId,
      status: 'draft',
      version: 1,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Tạo BOM thất bại: ${error.message}` };
  const bomId = (bom as { id: string }).id;

  const { error: linesError } = await ctx.supabase.from('bom_lines').insert(
    input.lines.map((l, i) => ({
      tenant_id: ctx.tenantId,
      bom_id: bomId,
      component_item_id: l.componentItemId,
      qty_per: l.qtyPer,
      scrap_pct: l.scrapPct ?? 0,
      uom: l.uom ?? 'cái',
      sort_order: i,
    })),
  );
  if (linesError) {
    await ctx.supabase.from('bills_of_materials').delete().eq('id', bomId);
    return { ok: false, error: `Lưu dòng BOM thất bại: ${linesError.message}` };
  }
  return { ok: true, data: { id: bomId } };
}

export async function activateBom(bomId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!(await hasSxAccess(ctx.supabase))) {
    return { ok: false, error: 'Không có quyền Sản xuất.' };
  }
  requireManager(ctx);

  const { data: bom } = await ctx.supabase
    .from('bills_of_materials')
    .select('id, finished_item_id, status, bom_lines(id)')
    .eq('id', bomId)
    .maybeSingle();
  if (!bom) return { ok: false, error: 'Không tìm thấy BOM.' };
  const row = bom as {
    finished_item_id: string;
    status: string;
    bom_lines: { id: string }[] | null;
  };
  if ((row.bom_lines ?? []).length === 0) {
    return { ok: false, error: 'BOM chưa có dòng NVL.' };
  }

  // Obsolete BOM active khác cùng FG
  await ctx.supabase
    .from('bills_of_materials')
    .update({ status: 'obsolete' })
    .eq('finished_item_id', row.finished_item_id)
    .eq('status', 'active')
    .neq('id', bomId);

  const { error } = await ctx.supabase
    .from('bills_of_materials')
    .update({ status: 'active' })
    .eq('id', bomId);
  if (error) return { ok: false, error: `Kích hoạt BOM thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

export interface CreateWorkOrderInput {
  finishedItemId: string;
  qtyPlanned: number;
  salesOrderId?: string | null;
  plannedEnd?: string | null;
}

export async function createWorkOrder(
  input: CreateWorkOrderInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const ctx = await getTenantContext();
  if (!(await hasSxAccess(ctx.supabase))) {
    return { ok: false, error: 'Công ty chưa được cấp module Sản xuất.' };
  }
  if (!(input.qtyPlanned > 0)) return { ok: false, error: 'Số lượng kế hoạch phải > 0.' };

  const settings = await getProductionSettings();
  const [fgWh, rmWh] = await Promise.all([
    warehouseIdByCode(ctx, settings.defaultFgWarehouseCode),
    warehouseIdByCode(ctx, settings.defaultRmWarehouseCode),
  ]);
  if (settings.defaultFgWarehouseCode.trim() && !fgWh) {
    return {
      ok: false,
      error: `Chưa có kho ${settings.defaultFgWarehouseCode} trong hệ thống. Vào Kho tạo kho trước.`,
    };
  }
  if (settings.defaultRmWarehouseCode.trim() && !rmWh) {
    return {
      ok: false,
      error: `Chưa có kho ${settings.defaultRmWarehouseCode} trong hệ thống. Vào Kho tạo kho trước.`,
    };
  }

  const { data: activeBom } = await ctx.supabase
    .from('bills_of_materials')
    .select('id')
    .eq('finished_item_id', input.finishedItemId)
    .eq('status', 'active')
    .maybeSingle();

  const { count } = await ctx.supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true });
  const code = `LSX-${String((count ?? 0) + 1).padStart(4, '0')}`;

  const asOf = new Date().toISOString().slice(0, 10);
  const plannedEnd =
    input.plannedEnd ??
    (() => {
      const d = new Date(`${asOf}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + settings.defaultLeadTimeDays);
      return d.toISOString().slice(0, 10);
    })();

  const { data: wo, error } = await ctx.supabase
    .from('work_orders')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      finished_item_id: input.finishedItemId,
      bom_id: (activeBom as { id: string } | null)?.id ?? null,
      qty_planned: input.qtyPlanned,
      status: 'draft',
      sales_order_id: input.salesOrderId ?? null,
      planned_start: asOf,
      planned_end: plannedEnd,
      warehouse_fg_id: fgWh,
      warehouse_rm_id: rmWh,
      created_by: ctx.userId,
    })
    .select('id, code')
    .single();
  if (error) return { ok: false, error: `Tạo LSX thất bại: ${error.message}` };
  return { ok: true, data: wo as { id: string; code: string } };
}

/** Tổng qty_planned LSX (không hủy/đóng) theo product_id cho một đơn bán. */
export async function getSalesOrderWoQtyByProduct(
  supabase: SupabaseClient,
  orderId: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data } = await supabase
    .from('work_orders')
    .select('qty_planned, inventory_items(product_id)')
    .eq('sales_order_id', orderId)
    .not('status', 'in', '(cancelled,closed)');
  for (const wo of data ?? []) {
    const nested = (wo as { inventory_items?: { product_id: string | null } | { product_id: string | null }[] | null })
      .inventory_items;
    const item = Array.isArray(nested) ? (nested[0] ?? null) : (nested ?? null);
    const productId = item?.product_id;
    if (!productId) continue;
    map.set(
      productId,
      (map.get(productId) ?? 0) + Number((wo as { qty_planned: number }).qty_planned),
    );
  }
  return map;
}

/**
 * Tạo lệnh SX nháp cho từng dòng đơn còn thiếu hàng (gắn Sales ↔ SX).
 */
export async function createWorkOrdersFromSalesOrder(
  orderId: string,
): Promise<ActionResult<{ created: { code: string; productName: string; qty: number }[] }>> {
  const ctx = await getTenantContext();
  if (!(await hasSxAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa mở module Sản xuất.' };
  }

  const { data: order } = await ctx.supabase
    .from('sales_orders')
    .select(
      'id, code, status, sales_order_items(id, product_id, product_name, qty, atp_qty)',
    )
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: 'Không tìm thấy đơn hàng.' };

  const orderRow = order as {
    status: string;
    sales_order_items: {
      product_id: string;
      product_name: string;
      qty: number;
      atp_qty: number | null;
    }[];
  };
  if (orderRow.status !== 'confirmed' && orderRow.status !== 'delivering') {
    return {
      ok: false,
      error: 'Chỉ tạo lệnh SX từ đơn đã xác nhận hoặc đang giao.',
    };
  }

  const items = orderRow.sales_order_items ?? [];

  const { data: existingWos } = await ctx.supabase
    .from('work_orders')
    .select('qty_planned, inventory_items(product_id)')
    .eq('sales_order_id', orderId)
    .not('status', 'in', '(cancelled,closed)');
  const existingWoQtyByProduct = new Map<string, number>();
  for (const wo of existingWos ?? []) {
    const nested = wo.inventory_items as
      | { product_id: string | null }
      | { product_id: string | null }[]
      | null;
    const item = Array.isArray(nested) ? (nested[0] ?? null) : nested;
    const productId = item?.product_id;
    if (!productId) continue;
    existingWoQtyByProduct.set(
      productId,
      (existingWoQtyByProduct.get(productId) ?? 0) + Number(wo.qty_planned),
    );
  }

  const shortfalls = items
    .map((it) => {
      const atp = it.atp_qty == null ? 0 : Number(it.atp_qty);
      const existingWoQty = existingWoQtyByProduct.get(it.product_id) ?? 0;
      const need = Math.max(0, Number(it.qty) - atp - existingWoQty);
      return { ...it, need };
    })
    .filter((it) => it.need > 0);

  if (shortfalls.length === 0) {
    return { ok: false, error: 'Đơn không còn dòng thiếu hàng để tạo lệnh SX.' };
  }

  const productIds = shortfalls.map((l) => l.product_id);
  const { data: inventoryRows } = await ctx.supabase
    .from('inventory_items')
    .select('id, product_id')
    .in('product_id', productIds);
  const itemIdByProduct = new Map<string, string>();
  for (const row of (inventoryRows ?? []) as { id: string; product_id: string }[]) {
    itemIdByProduct.set(row.product_id, row.id);
  }
  const missingNames = shortfalls
    .filter((l) => !itemIdByProduct.has(l.product_id))
    .map((l) => l.product_name);
  if (missingNames.length > 0) {
    return {
      ok: false,
      error: `Chưa có mã kho cho: ${missingNames.join(', ')}. Vào Kho đồng bộ sản phẩm trước.`,
    };
  }

  const created: { code: string; productName: string; qty: number }[] = [];
  const createdWoIds: string[] = [];
  for (const line of shortfalls) {
    const finishedItemId = itemIdByProduct.get(line.product_id)!;
    const wo = await createWorkOrder({
      finishedItemId,
      qtyPlanned: line.need,
      salesOrderId: orderId,
    });
    if (!wo.ok) {
      if (createdWoIds.length > 0) {
        await ctx.supabase.from('work_orders').delete().in('id', createdWoIds);
      }
      return { ok: false, error: wo.error };
    }
    createdWoIds.push(wo.data.id);
    created.push({
      code: wo.data.code,
      productName: line.product_name,
      qty: line.need,
    });
  }

  return { ok: true, data: { created } };
}

export async function releaseWorkOrder(workOrderId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!(await hasSxAccess(ctx.supabase))) {
    return { ok: false, error: 'Không có quyền Sản xuất.' };
  }
  requireManager(ctx);
  const settings = await getProductionSettings();

  const { data: wo } = await ctx.supabase
    .from('work_orders')
    .select(
      'id, status, qty_planned, bom_id, warehouse_rm_id, bills_of_materials(status, bom_lines(component_item_id, qty_per, scrap_pct))',
    )
    .eq('id', workOrderId)
    .maybeSingle();
  if (!wo) return { ok: false, error: 'Không tìm thấy LSX.' };
  const raw = wo as unknown as {
    status: string;
    qty_planned: number;
    warehouse_rm_id: string | null;
    bills_of_materials:
      | {
          status: string;
          bom_lines: { component_item_id: string; qty_per: number; scrap_pct: number }[] | null;
        }
      | {
          status: string;
          bom_lines: { component_item_id: string; qty_per: number; scrap_pct: number }[] | null;
        }[]
      | null;
  };
  if (raw.status !== 'draft') return { ok: false, error: 'Chỉ release LSX ở trạng thái nháp.' };

  const bom = Array.isArray(raw.bills_of_materials)
    ? (raw.bills_of_materials[0] ?? null)
    : raw.bills_of_materials;
  const lines = bom?.bom_lines ?? [];
  const row = raw;
  let rmCovered = true;
  if (row.warehouse_rm_id && lines.length > 0) {
    for (const line of lines) {
      const need =
        Number(row.qty_planned) *
        Number(line.qty_per) *
        (1 + Number(line.scrap_pct) / 100);
      const { data: bal } = await ctx.supabase
        .from('stock_balances')
        .select('qty_on_hand, qty_reserved')
        .eq('warehouse_id', row.warehouse_rm_id)
        .eq('item_id', line.component_item_id)
        .maybeSingle();
      const onHand = Number((bal as { qty_on_hand?: number } | null)?.qty_on_hand ?? 0);
      const reserved = Number((bal as { qty_reserved?: number } | null)?.qty_reserved ?? 0);
      if (onHand - reserved + 1e-9 < need) {
        rmCovered = false;
        break;
      }
    }
  } else if (lines.length === 0) {
    rmCovered = false;
  }

  const gate = canReleaseWorkOrder({
    bomStatus: (bom?.status as 'draft' | 'active' | 'obsolete') ?? null,
    lineCount: lines.length,
    rmCovered,
    allowReleaseWithoutRm: settings.allowReleaseWithoutRm,
  });
  if (!gate.ok) return { ok: false, error: gate.reason };

  const { error } = await ctx.supabase
    .from('work_orders')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', workOrderId);
  if (error) return { ok: false, error: `Release thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

/** Xuất NVL theo BOM × qty_planned (một lần) rồi chuyển in_progress. */
export async function issueMaterialsForWorkOrder(
  workOrderId: string,
): Promise<ActionResult<{ code: string } | undefined>> {
  const ctx = await getTenantContext();
  if (!(await hasSxAccess(ctx.supabase))) {
    return { ok: false, error: 'Không có quyền Sản xuất.' };
  }

  const { data: wo } = await ctx.supabase
    .from('work_orders')
    .select(
      'id, code, status, qty_planned, warehouse_rm_id, bills_of_materials(bom_lines(component_item_id, qty_per, scrap_pct))',
    )
    .eq('id', workOrderId)
    .maybeSingle();
  if (!wo) return { ok: false, error: 'Không tìm thấy LSX.' };
  const row = wo as unknown as {
    code: string;
    status: string;
    qty_planned: number;
    warehouse_rm_id: string | null;
    bills_of_materials:
      | {
          bom_lines: { component_item_id: string; qty_per: number; scrap_pct: number }[] | null;
        }
      | {
          bom_lines: { component_item_id: string; qty_per: number; scrap_pct: number }[] | null;
        }[]
      | null;
  };
  if (row.status !== 'released' && row.status !== 'in_progress') {
    return { ok: false, error: 'LSX phải đã release mới xuất NVL.' };
  }
  if (!row.warehouse_rm_id) return { ok: false, error: 'Chưa gán kho NVL cho LSX.' };
  const bomNested = Array.isArray(row.bills_of_materials)
    ? (row.bills_of_materials[0] ?? null)
    : row.bills_of_materials;
  const lines = (bomNested?.bom_lines ?? []).map((l) => ({
    itemId: l.component_item_id,
    qty:
      Number(row.qty_planned) *
      Number(l.qty_per) *
      (1 + Number(l.scrap_pct) / 100),
  }));
  if (lines.length === 0) return { ok: false, error: 'BOM không có dòng NVL.' };

  const posted = await postInventoryTxn({
    warehouseId: row.warehouse_rm_id,
    txnType: 'issue',
    notes: `Xuất NVL cho ${row.code}`,
    lines,
  });
  if (!posted.ok) return posted;

  await ctx.supabase
    .from('work_orders')
    .update({ status: 'in_progress' })
    .eq('id', workOrderId);

  return { ok: true, data: { code: posted.data.code } };
}

export async function receiveFinishedGoods(
  workOrderId: string,
  qty: number,
): Promise<ActionResult<{ code: string } | undefined>> {
  const ctx = await getTenantContext();
  if (!(await hasSxAccess(ctx.supabase))) {
    return { ok: false, error: 'Không có quyền Sản xuất.' };
  }
  const settings = await getProductionSettings();

  const { data: wo } = await ctx.supabase
    .from('work_orders')
    .select(
      'id, code, status, qty_planned, qty_completed, finished_item_id, warehouse_fg_id',
    )
    .eq('id', workOrderId)
    .maybeSingle();
  if (!wo) return { ok: false, error: 'Không tìm thấy LSX.' };
  const row = wo as {
    code: string;
    status: string;
    qty_planned: number;
    qty_completed: number;
    finished_item_id: string;
    warehouse_fg_id: string | null;
  };
  if (row.status !== 'released' && row.status !== 'in_progress') {
    return { ok: false, error: 'LSX phải đang chạy mới nhập TP.' };
  }
  if (!row.warehouse_fg_id) return { ok: false, error: 'Chưa gán kho TP cho LSX.' };
  const maxQty = maxReceiptQty(
    Number(row.qty_planned),
    Number(row.qty_completed),
    settings.overReceiptPct,
  );
  if (!(qty > 0) || qty > maxQty + 1e-9) {
    return { ok: false, error: `Số lượng nhập phải trong 0–${maxQty}.` };
  }

  const posted = await postInventoryTxn({
    warehouseId: row.warehouse_fg_id,
    txnType: 'receipt',
    notes: `Nhập TP từ ${row.code}`,
    lines: [{ itemId: row.finished_item_id, qty }],
  });
  if (!posted.ok) return posted;

  const nextCompleted = Number(row.qty_completed) + qty;
  const done = nextCompleted + 1e-9 >= Number(row.qty_planned);
  await ctx.supabase
    .from('work_orders')
    .update({
      qty_completed: nextCompleted,
      status: done ? 'completed' : 'in_progress',
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', workOrderId);

  return { ok: true, data: { code: posted.data.code } };
}
