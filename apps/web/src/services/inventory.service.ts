import 'server-only';
import { canIssue, computeAtp, type InventoryTxnType, type WarehouseKind } from '@optimake/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTenantContext,
  requireManager,
  type ActionResult,
  type TenantContext,
} from '@/services/sales-context';

export type { ActionResult };

export interface WarehouseRow {
  id: string;
  code: string;
  name: string;
  kind: WarehouseKind;
  is_active: boolean;
}

export interface InventoryItemRow {
  id: string;
  product_id: string | null;
  sku: string;
  name: string;
  uom: string;
  item_type: string;
  base_price: number;
  is_active: boolean;
}

export interface StockBalanceRow {
  id: string;
  warehouse_id: string;
  item_id: string;
  qty_on_hand: number;
  qty_reserved: number;
  warehouses?: { code: string; name: string; kind: string } | null;
  inventory_items?: { sku: string; name: string; product_id: string | null; uom: string } | null;
}

export interface InventoryTxnRow {
  id: string;
  code: string;
  txn_type: InventoryTxnType;
  status: string;
  warehouse_id: string;
  notes: string | null;
  posted_at: string | null;
  created_at: string;
  warehouses?: { code: string; name: string } | null;
  inventory_transaction_lines?: {
    id: string;
    item_id: string;
    qty: number;
    inventory_items?: { sku: string; name: string } | null;
  }[];
}

async function hasKhoAccess(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', { p_key: 'kho' });
  if (error) return false;
  return data === true;
}

/** Kho hoặc Sản xuất được post phiếu (xuất NVL / nhập TP từ LSX). */
async function canPostStock(supabase: SupabaseClient): Promise<boolean> {
  if (await hasKhoAccess(supabase)) return true;
  const { data, error } = await supabase.rpc('has_module_access', { p_key: 'san-xuat' });
  if (error) return false;
  return data === true;
}

/** Tạo kho mặc định + sync items từ products (idempotent). */
export async function ensureInventoryDefaults(): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!(await hasKhoAccess(ctx.supabase))) {
    return { ok: false, error: 'Công ty chưa được cấp module Kho.' };
  }
  const { error } = await ctx.supabase.rpc('inventory_ensure_defaults');
  if (error) return { ok: false, error: `Khởi tạo kho thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

export async function listWarehouses(supabase: SupabaseClient): Promise<WarehouseRow[]> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('id, code, name, kind, is_active')
    .order('code');
  if (error) throw new Error(`Không tải được kho: ${error.message}`);
  return (data ?? []) as WarehouseRow[];
}

export async function listInventoryItems(supabase: SupabaseClient): Promise<InventoryItemRow[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, product_id, sku, name, uom, item_type, base_price, is_active')
    .order('sku');
  if (error) throw new Error(`Không tải được danh mục kho: ${error.message}`);
  return (data ?? []) as InventoryItemRow[];
}

export async function listStockBalances(supabase: SupabaseClient): Promise<StockBalanceRow[]> {
  const { data, error } = await supabase
    .from('stock_balances')
    .select(
      'id, warehouse_id, item_id, qty_on_hand, qty_reserved, warehouses(code, name, kind), inventory_items(sku, name, product_id, uom)',
    )
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Không tải được tồn kho: ${error.message}`);
  return (data ?? []) as unknown as StockBalanceRow[];
}

export async function listInventoryTransactions(
  supabase: SupabaseClient,
): Promise<InventoryTxnRow[]> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select(
      'id, code, txn_type, status, warehouse_id, notes, posted_at, created_at, warehouses(code, name), inventory_transaction_lines(id, item_id, qty, inventory_items(sku, name))',
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(`Không tải được phiếu kho: ${error.message}`);
  return (data ?? []) as unknown as InventoryTxnRow[];
}

/** ATP theo product_id — dùng Sales confirm. Fallback product_stock nếu chưa sync item kho. */
export async function getAtpByProductIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;

  const unique = [...new Set(productIds)];
  const { data: items } = await supabase
    .from('inventory_items')
    .select('product_id')
    .in('product_id', unique);
  const linked = new Set(
    ((items ?? []) as { product_id: string | null }[])
      .map((i) => i.product_id)
      .filter((x): x is string => Boolean(x)),
  );

  for (const id of unique) {
    if (linked.has(id)) {
      const { data } = await supabase.rpc('inventory_get_atp', { p_product_id: id });
      map.set(id, Number(data ?? 0));
    }
  }

  const needFallback = unique.filter((id) => !linked.has(id));
  if (needFallback.length > 0) {
    const { data: stocks } = await supabase
      .from('product_stock')
      .select('product_id, qty_on_hand')
      .in('product_id', needFallback);
    for (const s of (stocks ?? []) as { product_id: string; qty_on_hand: number }[]) {
      map.set(s.product_id, Number(s.qty_on_hand));
    }
  }
  for (const id of unique) {
    if (!map.has(id)) map.set(id, 0);
  }
  return map;
}

async function nextTxnCode(
  ctx: TenantContext,
  prefix: string,
): Promise<string> {
  const { count } = await ctx.supabase
    .from('inventory_transactions')
    .select('id', { count: 'exact', head: true });
  return `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export interface PostTxnInput {
  warehouseId: string;
  txnType: 'receipt' | 'issue';
  notes: string;
  lines: { itemId: string; qty: number }[];
}

/** Tạo + post phiếu nhập/xuất ngay (K1 đơn giản). */
export async function postInventoryTxn(
  input: PostTxnInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const ctx = await getTenantContext();
  if (!(await canPostStock(ctx.supabase))) {
    return { ok: false, error: 'Không có quyền Kho hoặc Sản xuất để ghi phiếu.' };
  }
  if (input.lines.length === 0) return { ok: false, error: 'Thêm ít nhất một dòng.' };
  for (const [i, line] of input.lines.entries()) {
    if (!(line.qty > 0)) return { ok: false, error: `Dòng ${i + 1}: số lượng phải > 0.` };
  }

  const prefix = input.txnType === 'receipt' ? 'NK' : 'XK';
  const code = await nextTxnCode(ctx, prefix);

  const { data: tx, error } = await ctx.supabase
    .from('inventory_transactions')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      txn_type: input.txnType,
      status: 'draft',
      warehouse_id: input.warehouseId,
      notes: input.notes.trim() || null,
      created_by: ctx.userId,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Tạo phiếu thất bại: ${error.message}` };
  const txId = (tx as { id: string }).id;

  const { error: linesError } = await ctx.supabase.from('inventory_transaction_lines').insert(
    input.lines.map((l, i) => ({
      tenant_id: ctx.tenantId,
      transaction_id: txId,
      item_id: l.itemId,
      qty: l.qty,
      sort_order: i,
    })),
  );
  if (linesError) {
    await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
    return { ok: false, error: `Lưu dòng phiếu thất bại: ${linesError.message}` };
  }

  if (input.txnType === 'issue') {
    for (const line of input.lines) {
      const { data: bal } = await ctx.supabase
        .from('stock_balances')
        .select('qty_on_hand, qty_reserved')
        .eq('warehouse_id', input.warehouseId)
        .eq('item_id', line.itemId)
        .maybeSingle();
      const atp = computeAtp(
        Number((bal as { qty_on_hand?: number } | null)?.qty_on_hand ?? 0),
        Number((bal as { qty_reserved?: number } | null)?.qty_reserved ?? 0),
      );
      if (!canIssue(atp, line.qty)) {
        await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
        return { ok: false, error: `Không đủ ATP (còn ${atp}, cần ${line.qty}).` };
      }
    }
  }

  const productIds: string[] = [];
  for (const line of input.lines) {
    const delta = input.txnType === 'receipt' ? line.qty : -line.qty;
    const { data: ok, error: applyError } = await ctx.supabase.rpc('inventory_apply_line', {
      p_warehouse_id: input.warehouseId,
      p_item_id: line.itemId,
      p_qty_delta: delta,
    });
    if (applyError || ok !== true) {
      // rollback: reverse applied lines — best effort via opposite deltas not tracked; delete draft
      await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
      return {
        ok: false,
        error:
          input.txnType === 'issue'
            ? 'Không đủ tồn khả dụng (ATP) để xuất.'
            : `Cập nhật tồn thất bại: ${applyError?.message ?? 'unknown'}`,
      };
    }
    const { data: item } = await ctx.supabase
      .from('inventory_items')
      .select('product_id')
      .eq('id', line.itemId)
      .maybeSingle();
    const pid = (item as { product_id: string | null } | null)?.product_id;
    if (pid) productIds.push(pid);
  }

  await ctx.supabase
    .from('inventory_transactions')
    .update({ status: 'posted', posted_at: new Date().toISOString() })
    .eq('id', txId);

  for (const pid of [...new Set(productIds)]) {
    await ctx.supabase.rpc('inventory_sync_product_stock', { p_product_id: pid });
  }

  return { ok: true, data: { id: txId, code } };
}

/** Xuất kho TP theo product (Sales ship) — tạo phiếu XK posted. */
export async function issueFinishedGoodsForDelivery(
  lines: { productId: string; productName: string; qty: number }[],
  note: string,
): Promise<ActionResult<{ id: string; code: string } | undefined>> {
  const ctx = await getTenantContext();
  if (!(await hasKhoAccess(ctx.supabase))) {
    return { ok: false, error: 'NO_KHO' };
  }
  // narrow: callers treat NO_KHO specially
  await ctx.supabase.rpc('inventory_ensure_defaults');

  const { getInventorySettings } = await import('@/services/tenant-settings.service');
  const invSettings = await getInventorySettings();
  const fgCode = invSettings.defaultFgWarehouseCode || 'KHO-TP';

  const { data: wh } = await ctx.supabase
    .from('warehouses')
    .select('id')
    .eq('code', fgCode)
    .eq('is_active', true)
    .maybeSingle();
  const warehouseId = (wh as { id: string } | null)?.id;
  if (!warehouseId) {
    return { ok: false, error: `Chưa có kho thành phẩm ${fgCode} (Cài đặt → Kho).` };
  }

  const txnLines: { itemId: string; qty: number }[] = [];
  for (const line of lines) {
    const { data: item } = await ctx.supabase
      .from('inventory_items')
      .select('id')
      .eq('product_id', line.productId)
      .maybeSingle();
    const itemId = (item as { id: string } | null)?.id;
    if (!itemId) {
      return { ok: false, error: `Chưa có mã kho cho "${line.productName}". Mở module Kho để đồng bộ.` };
    }
    const { data: atp } = await ctx.supabase.rpc('inventory_get_atp', {
      p_product_id: line.productId,
    });
    if (!canIssue(Number(atp ?? 0), line.qty)) {
      return {
        ok: false,
        error: `Không đủ ATP cho "${line.productName}" (cần ${line.qty}, ATP ${Number(atp ?? 0)}).`,
      };
    }
    txnLines.push({ itemId, qty: line.qty });
  }

  return postInventoryTxn({
    warehouseId,
    txnType: 'issue',
    notes: note,
    lines: txnLines,
  });
}

export async function createWarehouse(input: {
  code: string;
  name: string;
  kind: WarehouseKind;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (!(await hasKhoAccess(ctx.supabase))) {
    return { ok: false, error: 'Không có quyền module Kho.' };
  }
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) return { ok: false, error: 'Nhập mã và tên kho.' };
  const { data, error } = await ctx.supabase
    .from('warehouses')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      name,
      kind: input.kind,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Tạo kho thất bại: ${error.message}` };
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export function balanceAtp(row: StockBalanceRow): number {
  return computeAtp(Number(row.qty_on_hand), Number(row.qty_reserved));
}

export { hasKhoAccess };
