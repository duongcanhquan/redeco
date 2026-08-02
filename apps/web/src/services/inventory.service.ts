import 'server-only';
import { canIssue, computeAtp, allocatePickQty, type InventoryTxnType, type PickStrategy, type WarehouseKind } from '@optimake/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTenantContext,
  managerDeniedMessage,
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
  track_lot: boolean;
  pick_strategy: PickStrategy;
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
    location_id?: string | null;
    lot_id?: string | null;
    inventory_items?: { sku: string; name: string } | null;
    warehouse_locations?: { code: string } | null;
    inventory_lots?: { lot_code: string } | null;
  }[];
}

async function hasKhoAccess(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', { p_key: 'kho' });
  if (error) return false;
  return data === true;
}

/** Giữ chỗ / nhả chỗ: RPC cho phép Kho hoặc Kinh doanh. */
async function canUseStockReservation(supabase: SupabaseClient): Promise<boolean> {
  if (await hasKhoAccess(supabase)) return true;
  const { data, error } = await supabase.rpc('has_module_access', { p_key: 'kinh-doanh' });
  if (error) return false;
  return data === true;
}

/** Kho, Sản xuất hoặc Thiết bị được post phiếu (NVL / TP / phụ tùng BT). */
async function canPostStock(supabase: SupabaseClient): Promise<boolean> {
  if (await hasKhoAccess(supabase)) return true;
  const { data: sx } = await supabase.rpc('has_module_access', { p_key: 'san-xuat' });
  if (sx === true) return true;
  const { data: tb, error } = await supabase.rpc('has_module_access', { p_key: 'thiet-bi' });
  if (error) return false;
  return tb === true;
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

/** Nút «Đồng bộ» trên hub — chỉ manager. */
export async function ensureInventoryDefaultsAsManager(): Promise<ActionResult> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  return ensureInventoryDefaults();
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
    .select(
      'id, product_id, sku, name, uom, item_type, base_price, is_active, track_lot, pick_strategy',
    )
    .order('sku');
  if (error) throw new Error(`Không tải được danh mục kho: ${error.message}`);
  return (data ?? []).map((raw) => {
    const row = raw as InventoryItemRow;
    return {
      ...row,
      track_lot: Boolean(row.track_lot),
      pick_strategy: (row.pick_strategy ?? 'fifo') as PickStrategy,
    };
  });
}

/** Bật theo dõi lô + chiến lược xuất (FIFO/FEFO/LIFO). */
export async function updateInventoryItemLotPolicy(input: {
  itemId: string;
  trackLot: boolean;
  pickStrategy: PickStrategy;
}): Promise<ActionResult> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasKhoAccess(ctx.supabase))) {
    return { ok: false, error: 'Không có quyền module Kho.' };
  }
  const strategy = input.pickStrategy;
  if (strategy !== 'fifo' && strategy !== 'fefo' && strategy !== 'lifo') {
    return { ok: false, error: 'Chiến lược xuất không hợp lệ.' };
  }
  const { error } = await ctx.supabase
    .from('inventory_items')
    .update({
      track_lot: input.trackLot,
      pick_strategy: strategy,
    })
    .eq('id', input.itemId);
  if (error) return { ok: false, error: `Cập nhật mã hàng thất bại: ${error.message}` };
  return { ok: true, data: undefined };
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
      'id, code, txn_type, status, warehouse_id, notes, posted_at, created_at, warehouses(code, name), inventory_transaction_lines(id, item_id, qty, location_id, lot_id, inventory_items(sku, name), warehouse_locations(code), inventory_lots(lot_code))',
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
  lines: {
    itemId: string;
    qty: number;
    locationId?: string;
    lotId?: string;
    /** Tạo/tìm lot khi nhập (track_lot). */
    lotCode?: string;
    expiryDate?: string;
  }[];
}

async function getDefaultLocationId(
  supabase: SupabaseClient,
  warehouseId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('warehouse_locations')
    .select('id')
    .eq('warehouse_id', warehouseId)
    .eq('code', '__DEFAULT__')
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function ensureLotId(
  ctx: TenantContext,
  itemId: string,
  lotCode: string,
  expiryDate?: string,
): Promise<string> {
  const code = lotCode.trim();
  const { data: existing } = await ctx.supabase
    .from('inventory_lots')
    .select('id')
    .eq('item_id', itemId)
    .eq('lot_code', code)
    .maybeSingle();
  if (existing) return String((existing as { id: string }).id);
  const { data, error } = await ctx.supabase
    .from('inventory_lots')
    .insert({
      tenant_id: ctx.tenantId,
      item_id: itemId,
      lot_code: code,
      expiry_date: expiryDate || null,
      received_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw new Error(`Tạo lô thất bại: ${error.message}`);
  return String((data as { id: string }).id);
}

async function loadQuantCandidates(
  supabase: SupabaseClient,
  warehouseId: string,
  itemId: string,
): Promise<
  {
    locationId: string;
    lotId: string | null;
    qty: number;
    receivedAt: string | null;
    expiryDate: string | null;
  }[]
> {
  const { data, error } = await supabase
    .from('stock_quants')
    .select('location_id, lot_id, qty, inventory_lots(received_at, expiry_date)')
    .eq('warehouse_id', warehouseId)
    .eq('item_id', itemId)
    .gt('qty', 0);
  if (error) throw new Error(error.message);
  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const lot = row['inventory_lots'];
    const lotObj = Array.isArray(lot) ? lot[0] : lot;
    const lotRec =
      lotObj && typeof lotObj === 'object'
        ? (lotObj as Record<string, unknown>)
        : null;
    return {
      locationId: String(row['location_id']),
      lotId:
        row['lot_id'] === null || row['lot_id'] === undefined
          ? null
          : String(row['lot_id']),
      qty: Number(row['qty'] ?? 0),
      receivedAt: lotRec ? String(lotRec['received_at'] ?? '') || null : null,
      expiryDate: lotRec
        ? lotRec['expiry_date']
          ? String(lotRec['expiry_date'])
          : null
        : null,
    };
  });
}

/** Tạo + post phiếu nhập/xuất ngay (K1 đơn giản). */
export async function postInventoryTxn(
  input: PostTxnInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const ctx = await getTenantContext();
  if (!(await canPostStock(ctx.supabase))) {
    return { ok: false, error: 'Không có quyền Kho / Sản xuất / Thiết bị để ghi phiếu.' };
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
      location_id: l.locationId ?? null,
      lot_id: l.lotId ?? null,
      sort_order: i,
    })),
  );
  if (linesError) {
    await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
    return { ok: false, error: `Lưu dòng phiếu thất bại: ${linesError.message}` };
  }

  const defaultLoc = await getDefaultLocationId(ctx.supabase, input.warehouseId);
  if (!defaultLoc) {
    await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
    return { ok: false, error: 'Chưa có vị trí mặc định — chạy đồng bộ Kho.' };
  }

  const productIds: string[] = [];
  const appliedSlices: {
    locationId: string;
    itemId: string;
    lotId: string | null;
    delta: number;
  }[] = [];

  for (const line of input.lines) {
    const { data: itemRow } = await ctx.supabase
      .from('inventory_items')
      .select('product_id, track_lot, pick_strategy')
      .eq('id', line.itemId)
      .maybeSingle();
    const item = itemRow as {
      product_id: string | null;
      track_lot: boolean;
      pick_strategy: PickStrategy;
    } | null;
    if (!item) {
      await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
      return { ok: false, error: 'Không tìm thấy mã hàng kho.' };
    }

    if (input.txnType === 'receipt') {
      let lotId = line.lotId ?? null;
      if (item.track_lot && !lotId) {
        const lotCode = line.lotCode?.trim() ?? '';
        if (!lotCode) {
          await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
          return { ok: false, error: 'Hàng theo dõi lô — cần mã lô khi nhập.' };
        }
        try {
          lotId = await ensureLotId(ctx, line.itemId, lotCode, line.expiryDate);
        } catch (e) {
          await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
          return { ok: false, error: e instanceof Error ? e.message : 'Tạo lô thất bại.' };
        }
      }
      const locId = line.locationId ?? defaultLoc;
      const { data: ok, error: applyError } = await ctx.supabase.rpc('inventory_apply_quant', {
        p_warehouse_id: input.warehouseId,
        p_location_id: locId,
        p_item_id: line.itemId,
        p_lot_id: lotId,
        p_qty_delta: line.qty,
      });
      if (applyError || ok !== true) {
        await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
        return { ok: false, error: `Cập nhật tồn thất bại: ${applyError?.message ?? 'unknown'}` };
      }
      appliedSlices.push({
        locationId: locId,
        itemId: line.itemId,
        lotId,
        delta: line.qty,
      });
    } else {
      // issue — allocate nếu chưa chỉ định vị trí/lô
      let slices =
        line.locationId || line.lotId
          ? [
              {
                locationId: line.locationId ?? defaultLoc,
                lotId: line.lotId ?? null,
                qty: line.qty,
              },
            ]
          : null;
      if (!slices) {
        const candidates = await loadQuantCandidates(
          ctx.supabase,
          input.warehouseId,
          line.itemId,
        );
        slices = allocatePickQty(
          candidates,
          line.qty,
          item.pick_strategy ?? 'fifo',
        );
      }
      if (!slices) {
        await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
        return { ok: false, error: `Không đủ tồn (theo vị trí/lô) cho xuất qty ${line.qty}.` };
      }
      for (const s of slices) {
        const { data: ok, error: applyError } = await ctx.supabase.rpc(
          'inventory_apply_quant',
          {
            p_warehouse_id: input.warehouseId,
            p_location_id: s.locationId,
            p_item_id: line.itemId,
            p_lot_id: s.lotId,
            p_qty_delta: -s.qty,
          },
        );
        if (applyError || ok !== true) {
          // best-effort reverse
          for (const prev of appliedSlices) {
            await ctx.supabase.rpc('inventory_apply_quant', {
              p_warehouse_id: input.warehouseId,
              p_location_id: prev.locationId,
              p_item_id: prev.itemId,
              p_lot_id: prev.lotId,
              p_qty_delta: -prev.delta,
            });
          }
          await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
          return { ok: false, error: 'Không đủ tồn khả dụng (quant) để xuất.' };
        }
        appliedSlices.push({
          locationId: s.locationId,
          itemId: line.itemId,
          lotId: s.lotId,
          delta: -s.qty,
        });
      }
    }

    if (item.product_id) productIds.push(item.product_id);
  }

  // Ghi lại dòng phiếu đúng với Bin/Lô đã apply (kể cả khi XK chia nhiều slice)
  await ctx.supabase.from('inventory_transaction_lines').delete().eq('transaction_id', txId);
  const { error: rewriteErr } = await ctx.supabase.from('inventory_transaction_lines').insert(
    appliedSlices.map((s, i) => ({
      tenant_id: ctx.tenantId,
      transaction_id: txId,
      item_id: s.itemId,
      qty: Math.abs(s.delta),
      location_id: s.locationId,
      lot_id: s.lotId,
      sort_order: i,
    })),
  );
  if (rewriteErr) {
    for (const prev of appliedSlices) {
      await ctx.supabase.rpc('inventory_apply_quant', {
        p_warehouse_id: input.warehouseId,
        p_location_id: prev.locationId,
        p_item_id: prev.itemId,
        p_lot_id: prev.lotId,
        p_qty_delta: -prev.delta,
      });
    }
    await ctx.supabase.from('inventory_transactions').delete().eq('id', txId);
    return { ok: false, error: `Lưu dòng phiếu (Bin/Lô) thất bại: ${rewriteErr.message}` };
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
  salesOrderId?: string,
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
      return {
        ok: false,
        error: `Chưa có mã kho cho «${line.productName}». Mở phân hệ Kho để đồng bộ.`,
      };
    }
    // Kiểm tra tồn khả dụng tại kho thành phẩm (cùng kho sẽ xuất)
    const { data: bal } = await ctx.supabase
      .from('stock_balances')
      .select('qty_on_hand, qty_reserved')
      .eq('warehouse_id', warehouseId)
      .eq('item_id', itemId)
      .maybeSingle();
    const atp = computeAtp(
      Number((bal as { qty_on_hand?: number } | null)?.qty_on_hand ?? 0),
      Number((bal as { qty_reserved?: number } | null)?.qty_reserved ?? 0),
    );
    // Có giữ chỗ của chính đơn này → coi như đã «có chỗ» trong on_hand
    // (consume ngay trước khi xuất sẽ trả reserved về ATP)
    const reservedForOrder = salesOrderId
      ? await sumActiveReservationQty(ctx.supabase, salesOrderId, itemId, warehouseId)
      : 0;
    const availableForShip = atp + reservedForOrder;
    if (!canIssue(availableForShip, line.qty)) {
      return {
        ok: false,
        error: `Không đủ số còn bán được (ATP) cho «${line.productName}» tại ${fgCode} (cần ${line.qty}, còn ${availableForShip}).`,
      };
    }
    txnLines.push({ itemId, qty: line.qty });
  }

  // Chỉ tiêu thụ giữ chỗ SAU khi validate — tránh orphan nếu xuất thất bại
  if (salesOrderId) {
    await ctx.supabase.rpc('inventory_consume_sales_order_reservations', {
      p_sales_order_id: salesOrderId,
    });
  }

  const posted = await postInventoryTxn({
    warehouseId,
    txnType: 'issue',
    notes: note,
    lines: txnLines,
  });
  if (!posted.ok && salesOrderId) {
    // Xuất thất bại sau khi đã tiêu thụ giữ chỗ → giữ chỗ lại (best-effort)
    await ctx.supabase.rpc('inventory_reserve_for_sales_order', {
      p_sales_order_id: salesOrderId,
      p_require_full: false,
    });
  }
  return posted;
}

async function sumActiveReservationQty(
  supabase: SupabaseClient,
  salesOrderId: string,
  itemId: string,
  warehouseId: string,
): Promise<number> {
  const { data } = await supabase
    .from('stock_reservations')
    .select('qty')
    .eq('source_type', 'sales_order')
    .eq('source_id', salesOrderId)
    .eq('item_id', itemId)
    .eq('warehouse_id', warehouseId)
    .eq('status', 'active');
  return ((data ?? []) as { qty: number }[]).reduce((s, r) => s + Number(r.qty), 0);
}

export async function createWarehouse(input: {
  code: string;
  name: string;
  kind: WarehouseKind;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
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
  const warehouseId = (data as { id: string }).id;
  // K2: mọi kho cần bin hệ thống __DEFAULT__ để nhận/xuất quant
  const { error: locErr } = await ctx.supabase.from('warehouse_locations').insert({
    tenant_id: ctx.tenantId,
    warehouse_id: warehouseId,
    code: '__DEFAULT__',
    name: 'Vị trí mặc định',
    kind: 'bin',
    tags: ['system'],
    attributes: { system: true },
  });
  if (locErr) {
    await ctx.supabase.from('warehouses').delete().eq('id', warehouseId);
    return {
      ok: false,
      error: `Tạo vị trí mặc định thất bại: ${locErr.message}`,
    };
  }
  return { ok: true, data: { id: warehouseId } };
}

export function balanceAtp(row: StockBalanceRow): number {
  return computeAtp(Number(row.qty_on_hand), Number(row.qty_reserved));
}

export interface ReserveSalesOrderResult {
  reservedLines: { product_id: string; product_name: string; qty: number }[];
  shortfalls: { product_id: string; product_name: string; shortfall: number }[];
  skipped?: boolean;
}

/** Giữ chỗ tồn cho đơn bán (RPC). Cần Kho hoặc Kinh doanh. */
export async function reserveStockForSalesOrder(
  salesOrderId: string,
  requireFull: boolean,
): Promise<ActionResult<ReserveSalesOrderResult>> {
  const ctx = await getTenantContext();
  if (!(await canUseStockReservation(ctx.supabase))) {
    return { ok: false, error: 'NO_RESERVE_ACCESS' };
  }
  const { data, error } = await ctx.supabase.rpc('inventory_reserve_for_sales_order', {
    p_sales_order_id: salesOrderId,
    p_require_full: requireFull,
  });
  if (error) {
    return { ok: false, error: `Giữ chỗ thất bại: ${error.message}` };
  }
  const raw = data as {
    ok?: boolean;
    error?: string;
    reserved_lines?: { product_id: string; product_name: string; qty: number }[];
    shortfalls?: { product_id: string; product_name: string; shortfall: number }[];
    skipped?: boolean;
  } | null;
  if (!raw || raw.ok === false) {
    return { ok: false, error: raw?.error ?? 'Giữ chỗ thất bại.' };
  }
  return {
    ok: true,
    data: {
      reservedLines: raw.reserved_lines ?? [],
      shortfalls: raw.shortfalls ?? [],
      skipped: raw.skipped === true,
    },
  };
}

export async function releaseSalesOrderReservations(salesOrderId: string): Promise<void> {
  const ctx = await getTenantContext();
  if (!(await canUseStockReservation(ctx.supabase))) return;
  await ctx.supabase.rpc('inventory_release_sales_order_reservations', {
    p_sales_order_id: salesOrderId,
  });
}

export async function consumeSalesOrderReservations(salesOrderId: string): Promise<void> {
  const ctx = await getTenantContext();
  if (!(await canUseStockReservation(ctx.supabase))) return;
  await ctx.supabase.rpc('inventory_consume_sales_order_reservations', {
    p_sales_order_id: salesOrderId,
  });
}

export { hasKhoAccess };

// --- K2+K3: locations / quants ---

export type LocationKind = 'zone' | 'row' | 'rack' | 'level' | 'bin';

export interface WarehouseLocationRow {
  id: string;
  warehouse_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  kind: LocationKind;
  tags: unknown;
  is_active: boolean;
  warehouses?: { code: string; name: string } | null;
}

export interface StockQuantRow {
  id: string;
  warehouse_id: string;
  location_id: string;
  item_id: string;
  lot_id: string | null;
  qty: number;
  warehouse_locations?: { code: string; name: string; kind: string } | null;
  inventory_items?: { sku: string; name: string; uom: string } | null;
  inventory_lots?: { lot_code: string; expiry_date: string | null } | null;
  warehouses?: { code: string; name: string } | null;
}

export async function listWarehouseLocations(
  supabase: SupabaseClient,
  warehouseId?: string,
): Promise<WarehouseLocationRow[]> {
  let q = supabase
    .from('warehouse_locations')
    .select(
      'id, warehouse_id, parent_id, code, name, kind, tags, is_active, warehouses(code, name)',
    )
    .neq('code', '__DEFAULT__')
    .order('sort_order')
    .order('code');
  if (warehouseId) q = q.eq('warehouse_id', warehouseId);
  const { data, error } = await q;
  if (error) throw new Error(`Không tải vị trí kho: ${error.message}`);
  return (data ?? []) as unknown as WarehouseLocationRow[];
}

export async function createWarehouseLocation(input: {
  warehouseId: string;
  parentId?: string;
  code: string;
  name: string;
  kind: LocationKind;
  tags?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasKhoAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Kho.' };
  }
  const code = input.code.trim().toUpperCase();
  if (!code || code === '__DEFAULT__') {
    return { ok: false, error: 'Mã vị trí không hợp lệ.' };
  }
  const { data, error } = await ctx.supabase
    .from('warehouse_locations')
    .insert({
      tenant_id: ctx.tenantId,
      warehouse_id: input.warehouseId,
      parent_id: input.parentId || null,
      code,
      name: input.name.trim() || code,
      kind: input.kind,
      tags: input.tags ?? [],
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: String((data as { id: string }).id) } };
}

export async function listStockQuants(supabase: SupabaseClient): Promise<StockQuantRow[]> {
  const { data, error } = await supabase
    .from('stock_quants')
    .select(
      'id, warehouse_id, location_id, item_id, lot_id, qty, warehouses(code, name), warehouse_locations(code, name, kind), inventory_items(sku, name, uom), inventory_lots(lot_code, expiry_date)',
    )
    .gt('qty', 0)
    .order('updated_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(`Không tải tồn theo vị trí/lô: ${error.message}`);
  return (data ?? []) as unknown as StockQuantRow[];
}
