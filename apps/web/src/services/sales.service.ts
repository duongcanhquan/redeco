import 'server-only';
import {
  buildPromiseCheck,
  canActOnApprovalStep,
  canTransitionQuotation,
  checkCredit,
  computeDocTotal,
  computeLineTotal,
  pickWinningDiscountRule,
  requiredApprovalSteps,
  type ApprovalStepDef,
  type CreditCheckResult,
  type CustomerKind,
  type CustomerStatus,
  type DeliveryStatus,
  type DiscountRuleCandidate,
  type InvoiceStatus,
  type PromiseLineResult,
  type QuotationStatus,
  type SalesOrderStatus,
} from '@optimake/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTenantContext,
  requireManager,
  type ActionResult,
  type TenantContext,
} from '@/services/sales-context';
import { ensureDefaultQuotationWorkflow } from '@/services/sales-config.service';
import { getProductionSettings, getSalesSettings } from '@/services/tenant-settings.service';
import { getOpenWoByProductIds } from '@/services/production.service';
import {
  getAtpByProductIds,
  hasKhoAccess,
  issueFinishedGoodsForDelivery,
} from '@/services/inventory.service';

export type { ActionResult, TenantContext };
export { getTenantContext, requireManager };

/** Menu workspace: các module gốc user được dùng. */
export interface EntitledModule {
  id: string;
  key: string;
  name: string;
}

export async function getMyRootModules(supabase: SupabaseClient): Promise<EntitledModule[]> {
  const { data: ids, error } = await supabase.rpc('my_module_ids');
  if (error) throw new Error(`Không tải được quyền module: ${error.message}`);
  const idSet = new Set((ids ?? []) as string[]);
  if (idSet.size === 0) return [];

  // Hiện module gốc khi user có CHÍNH nó hoặc bất kỳ node con nào trong nhánh
  // (member có thể chỉ được phân công một phần con, vd kinh-doanh.bao-gia)
  const { data: modules } = await supabase
    .from('modules')
    .select('id, key, name, parent_id')
    .order('sort_order');
  const all = (modules ?? []) as (EntitledModule & { parent_id: string | null })[];
  const myKeys = all.filter((m) => idSet.has(m.id)).map((m) => m.key);
  return all.filter(
    (m) =>
      m.parent_id === null &&
      myKeys.some((k) => k === m.key || k.startsWith(`${m.key}.`)),
  );
}

// ------------------------------------------------------------
// Row types
// ------------------------------------------------------------

export interface CustomerRow {
  id: string;
  code: string;
  name: string;
  kind: CustomerKind;
  tax_code: string | null;
  credit_limit: number | null;
  status: CustomerStatus;
  attributes: { phone?: string; email?: string; address?: string };
  created_at: string;
}

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  uom: string;
  base_price: number;
  is_active: boolean;
  product_stock: { qty_on_hand: number } | null;
}

export interface DocItemRow {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
  atp_qty?: number | null;
}

export interface QuotationApprovalActionRow {
  id: string;
  step_order: number;
  step_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  acted_by: string | null;
  acted_at: string | null;
  comment: string | null;
}

export interface QuotationRow {
  id: string;
  code: string;
  customer_id: string;
  status: QuotationStatus;
  valid_until: string | null;
  discount_pct: number;
  total: number;
  notes: string | null;
  created_at: string;
  approval_workflow_id: string | null;
  current_step_order: number | null;
  applied_discount_rule_id: string | null;
  customers?: { name: string } | null;
  quotation_items?: DocItemRow[];
  quotation_approval_actions?: QuotationApprovalActionRow[];
}

export interface SalesOrderRow {
  id: string;
  code: string;
  customer_id: string;
  quotation_id: string | null;
  status: SalesOrderStatus;
  expected_delivery_date: string | null;
  discount_pct: number;
  total: number;
  credit_check: Partial<CreditCheckResult> & { checked_at?: string };
  promise_check: { lines?: PromiseLineResult[]; allCovered?: boolean };
  notes: string | null;
  created_at: string;
  customers?: { name: string } | null;
  sales_order_items?: DocItemRow[];
  invoices?: { id: string }[];
}

export interface DeliveryRow {
  id: string;
  code: string;
  sales_order_id: string;
  status: DeliveryStatus;
  shipped_at: string | null;
  notes: string | null;
  created_at: string;
  sales_orders?: { code: string; customers: { name: string } | null } | null;
}

export interface InvoiceRow {
  id: string;
  code: string;
  sales_order_id: string;
  customer_id: string;
  total: number;
  status: InvoiceStatus;
  issued_on: string;
  paid_at: string | null;
  customers?: { name: string } | null;
  sales_orders?: { code: string } | null;
}

// ------------------------------------------------------------
// Queries
// ------------------------------------------------------------

export async function listCustomers(supabase: SupabaseClient): Promise<CustomerRow[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, code, name, kind, tax_code, credit_limit, status, attributes, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải được khách hàng: ${error.message}`);
  return (data ?? []) as CustomerRow[];
}

/** Công nợ theo khách = Σ invoices unpaid. */
export async function getOutstandingByCustomer(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('invoices')
    .select('customer_id, total')
    .eq('status', 'unpaid');
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { customer_id: string; total: number }[]) {
    map.set(row.customer_id, (map.get(row.customer_id) ?? 0) + Number(row.total));
  }
  return map;
}

export async function listProducts(supabase: SupabaseClient): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, name, uom, base_price, is_active, product_stock(qty_on_hand)')
    .order('sku');
  if (error) throw new Error(`Không tải được sản phẩm: ${error.message}`);
  return (data ?? []) as unknown as ProductRow[];
}

export async function listQuotations(supabase: SupabaseClient): Promise<QuotationRow[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select(
      'id, code, customer_id, status, valid_until, discount_pct, total, notes, created_at, approval_workflow_id, current_step_order, applied_discount_rule_id, customers(name), quotation_items(id, product_id, product_name, qty, unit_price, discount_pct, line_total), quotation_approval_actions(id, step_order, step_name, status, acted_by, acted_at, comment)',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải được báo giá: ${error.message}`);
  return (data ?? []) as unknown as QuotationRow[];
}

export async function listSalesOrders(supabase: SupabaseClient): Promise<SalesOrderRow[]> {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(
      'id, code, customer_id, quotation_id, status, expected_delivery_date, discount_pct, total, credit_check, promise_check, notes, created_at, customers(name), sales_order_items(id, product_id, product_name, qty, unit_price, discount_pct, line_total, atp_qty), invoices(id)',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải được đơn hàng: ${error.message}`);
  return (data ?? []) as unknown as SalesOrderRow[];
}

export async function listDeliveries(supabase: SupabaseClient): Promise<DeliveryRow[]> {
  const { data, error } = await supabase
    .from('delivery_notes')
    .select(
      'id, code, sales_order_id, status, shipped_at, notes, created_at, sales_orders(code, customers(name))',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải được lệnh giao hàng: ${error.message}`);
  return (data ?? []) as unknown as DeliveryRow[];
}

export async function listInvoices(supabase: SupabaseClient): Promise<InvoiceRow[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(
      'id, code, sales_order_id, customer_id, total, status, issued_on, paid_at, customers(name), sales_orders(code)',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải được hóa đơn: ${error.message}`);
  return (data ?? []) as unknown as InvoiceRow[];
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function nextCode(
  supabase: SupabaseClient,
  table: string,
  prefix: string,
): Promise<string> {
  const { count } = await supabase.from(table).select('id', { count: 'exact', head: true });
  return `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export interface DocItemInput {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
}

function validateItems(items: DocItemInput[]): string | null {
  if (items.length === 0) return 'Chứng từ phải có ít nhất một dòng sản phẩm.';
  for (const it of items) {
    if (!it.productId) return 'Mỗi dòng phải chọn sản phẩm.';
    if (!(it.qty > 0)) return 'Số lượng phải lớn hơn 0.';
    if (it.unitPrice < 0) return 'Đơn giá không được âm.';
    if (it.discountPct < 0 || it.discountPct > 100) return 'Chiết khấu phải trong 0–100%.';
  }
  return null;
}

// ------------------------------------------------------------
// Mutations: Khách hàng
// ------------------------------------------------------------

export interface CustomerInput {
  name: string;
  kind: CustomerKind;
  taxCode: string;
  creditLimit: number | null;
  phone: string;
  email: string;
  address: string;
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!input.name.trim()) return { ok: false, error: 'Tên khách hàng không được để trống.' };

  const code = await nextCode(ctx.supabase, 'customers', 'KH');
  const { data, error } = await ctx.supabase
    .from('customers')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      name: input.name.trim(),
      kind: input.kind,
      tax_code: input.taxCode.trim() || null,
      credit_limit: input.creditLimit,
      attributes: {
        phone: input.phone.trim(),
        email: input.email.trim(),
        address: input.address.trim(),
      },
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Tạo khách hàng thất bại: ${error.message}` };
  return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput & { status: CustomerStatus },
): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (!input.name.trim()) return { ok: false, error: 'Tên khách hàng không được để trống.' };

  const { error } = await ctx.supabase
    .from('customers')
    .update({
      name: input.name.trim(),
      kind: input.kind,
      tax_code: input.taxCode.trim() || null,
      credit_limit: input.creditLimit,
      status: input.status,
      attributes: {
        phone: input.phone.trim(),
        email: input.email.trim(),
        address: input.address.trim(),
      },
    })
    .eq('id', customerId);
  if (error) return { ok: false, error: `Cập nhật khách hàng thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------
// Mutations: Sản phẩm + tồn kho
// ------------------------------------------------------------

export interface ProductInput {
  sku: string;
  name: string;
  uom: string;
  basePrice: number;
}

export async function createProduct(
  input: ProductInput & { initialStock: number },
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  if (!input.sku.trim() || !input.name.trim()) {
    return { ok: false, error: 'SKU và tên sản phẩm không được để trống.' };
  }
  if (input.basePrice < 0 || input.initialStock < 0) {
    return { ok: false, error: 'Giá và tồn kho không được âm.' };
  }

  const { data, error } = await ctx.supabase
    .from('products')
    .insert({
      tenant_id: ctx.tenantId,
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      uom: input.uom.trim() || 'cái',
      base_price: input.basePrice,
    })
    .select('id')
    .single();
  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? `SKU "${input.sku}" đã tồn tại.` : `Tạo sản phẩm thất bại: ${error.message}`,
    };
  }
  const productId = (data as { id: string }).id;

  const { error: stockError } = await ctx.supabase.from('product_stock').insert({
    product_id: productId,
    tenant_id: ctx.tenantId,
    qty_on_hand: input.initialStock,
  });
  if (stockError) {
    return { ok: false, error: `Tạo tồn kho thất bại: ${stockError.message}` };
  }
  return { ok: true, data: { id: productId } };
}

export async function updateProduct(
  productId: string,
  input: ProductInput & { isActive: boolean; stock: number },
): Promise<ActionResult> {
  const ctx = await getTenantContext();
  if (input.stock < 0) return { ok: false, error: 'Tồn kho không được âm.' };

  const { error } = await ctx.supabase
    .from('products')
    .update({
      name: input.name.trim(),
      uom: input.uom.trim() || 'cái',
      base_price: input.basePrice,
      is_active: input.isActive,
    })
    .eq('id', productId);
  if (error) return { ok: false, error: `Cập nhật sản phẩm thất bại: ${error.message}` };

  const { error: stockError } = await ctx.supabase
    .from('product_stock')
    .upsert({ product_id: productId, tenant_id: ctx.tenantId, qty_on_hand: input.stock });
  if (stockError) return { ok: false, error: `Cập nhật tồn kho thất bại: ${stockError.message}` };
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------
// Mutations: Báo giá
// ------------------------------------------------------------

export interface QuotationInput {
  customerId: string;
  validUntil: string | null;
  /** Nếu null/undefined → tự áp quy tắc chiết khấu thắng cuộc (nếu có). */
  discountPct: number | null;
  notes: string;
  items: DocItemInput[];
  /** true = tự match discount_rules (mặc định). */
  autoApplyDiscountRule?: boolean;
}

export async function createQuotation(
  input: QuotationInput,
): Promise<ActionResult<{ id: string; code: string; appliedRuleId: string | null }>> {
  const ctx = await getTenantContext();
  if (!input.customerId) return { ok: false, error: 'Hãy chọn khách hàng.' };
  const itemError = validateItems(input.items);
  if (itemError) return { ok: false, error: itemError };

  const lineTotals = input.items.map((it) =>
    computeLineTotal({ qty: it.qty, unitPrice: it.unitPrice, discountPct: it.discountPct }),
  );
  const subtotal = lineTotals.reduce((s, t) => s + t, 0);

  let discountPct = input.discountPct ?? 0;
  let appliedRuleId: string | null = null;
  if (input.autoApplyDiscountRule !== false) {
    const { data: customer } = await ctx.supabase
      .from('customers')
      .select('id, kind')
      .eq('id', input.customerId)
      .single();
    const { data: rules } = await ctx.supabase
      .from('discount_rules')
      .select('id, priority, is_active, valid_from, valid_until, discount_pct, conditions');
    const candidates: DiscountRuleCandidate[] = (
      (rules ?? []) as {
        id: string;
        priority: number;
        is_active: boolean;
        valid_from: string | null;
        valid_until: string | null;
        discount_pct: number;
        conditions: DiscountRuleCandidate['conditions'];
      }[]
    ).map((r) => ({
      id: r.id,
      priority: r.priority,
      isActive: r.is_active,
      validFrom: r.valid_from,
      validUntil: r.valid_until,
      discountPct: Number(r.discount_pct),
      conditions: r.conditions ?? {},
    }));
    const today = new Date().toISOString().slice(0, 10);
    const winner = pickWinningDiscountRule(candidates, {
      customerId: input.customerId,
      customerKind: ((customer as { kind?: CustomerKind } | null)?.kind ?? 'b2b') as CustomerKind,
      docSubtotal: subtotal,
      productIds: input.items.map((i) => i.productId),
      onDate: today,
    });
    if (winner && (input.discountPct === null || input.discountPct === undefined)) {
      discountPct = winner.discountPct;
      appliedRuleId = winner.id;
    } else if (winner && input.discountPct === winner.discountPct) {
      appliedRuleId = winner.id;
    }
  }

  const total = computeDocTotal(lineTotals, discountPct);
  const code = await nextCode(ctx.supabase, 'quotations', 'BG');

  let validUntil = input.validUntil;
  if (!validUntil) {
    const salesSettings = await getSalesSettings();
    const d = new Date();
    d.setDate(d.getDate() + salesSettings.defaultQuotationValidDays);
    validUntil = d.toISOString().slice(0, 10);
  }

  const { data, error } = await ctx.supabase
    .from('quotations')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      customer_id: input.customerId,
      valid_until: validUntil,
      discount_pct: discountPct,
      total,
      notes: input.notes.trim() || null,
      created_by: ctx.userId,
      applied_discount_rule_id: appliedRuleId,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Tạo báo giá thất bại: ${error.message}` };
  const quotationId = (data as { id: string }).id;

  const { error: itemsError } = await ctx.supabase.from('quotation_items').insert(
    input.items.map((it, i) => ({
      tenant_id: ctx.tenantId,
      quotation_id: quotationId,
      product_id: it.productId,
      product_name: it.productName,
      qty: it.qty,
      unit_price: it.unitPrice,
      discount_pct: it.discountPct,
      line_total: lineTotals[i],
      sort_order: i,
    })),
  );
  if (itemsError) {
    await ctx.supabase.from('quotations').delete().eq('id', quotationId);
    return { ok: false, error: `Lưu dòng báo giá thất bại: ${itemsError.message}` };
  }
  return { ok: true, data: { id: quotationId, code, appliedRuleId } };
}

/** Chỉ sửa báo giá ở trạng thái nháp — thay toàn bộ dòng hàng. */
export async function updateQuotation(
  quotationId: string,
  input: QuotationInput,
): Promise<ActionResult<{ id: string; code: string; appliedRuleId: string | null }>> {
  const ctx = await getTenantContext();
  if (!input.customerId) return { ok: false, error: 'Hãy chọn khách hàng.' };
  const itemError = validateItems(input.items);
  if (itemError) return { ok: false, error: itemError };

  const { data: existing } = await ctx.supabase
    .from('quotations')
    .select('id, code, status')
    .eq('id', quotationId)
    .maybeSingle();
  const q = existing as { id: string; code: string; status: QuotationStatus } | null;
  if (!q) return { ok: false, error: 'Không tìm thấy báo giá.' };
  if (q.status !== 'draft') {
    return { ok: false, error: 'Chỉ sửa được báo giá ở trạng thái nháp.' };
  }

  const lineTotals = input.items.map((it) =>
    computeLineTotal({ qty: it.qty, unitPrice: it.unitPrice, discountPct: it.discountPct }),
  );
  const subtotal = lineTotals.reduce((s, t) => s + t, 0);

  let discountPct = input.discountPct ?? 0;
  let appliedRuleId: string | null = null;
  if (input.autoApplyDiscountRule !== false) {
    const { data: customer } = await ctx.supabase
      .from('customers')
      .select('id, kind')
      .eq('id', input.customerId)
      .single();
    const { data: rules } = await ctx.supabase
      .from('discount_rules')
      .select('id, priority, is_active, valid_from, valid_until, discount_pct, conditions');
    const candidates: DiscountRuleCandidate[] = (
      (rules ?? []) as {
        id: string;
        priority: number;
        is_active: boolean;
        valid_from: string | null;
        valid_until: string | null;
        discount_pct: number;
        conditions: DiscountRuleCandidate['conditions'];
      }[]
    ).map((r) => ({
      id: r.id,
      priority: r.priority,
      isActive: r.is_active,
      validFrom: r.valid_from,
      validUntil: r.valid_until,
      discountPct: Number(r.discount_pct),
      conditions: r.conditions ?? {},
    }));
    const today = new Date().toISOString().slice(0, 10);
    const winner = pickWinningDiscountRule(candidates, {
      customerId: input.customerId,
      customerKind: ((customer as { kind?: CustomerKind } | null)?.kind ?? 'b2b') as CustomerKind,
      docSubtotal: subtotal,
      productIds: input.items.map((i) => i.productId),
      onDate: today,
    });
    if (winner && (input.discountPct === null || input.discountPct === undefined)) {
      discountPct = winner.discountPct;
      appliedRuleId = winner.id;
    } else if (winner && input.discountPct === winner.discountPct) {
      appliedRuleId = winner.id;
    }
  }

  const total = computeDocTotal(lineTotals, discountPct);
  let validUntil = input.validUntil;
  if (!validUntil) {
    const salesSettings = await getSalesSettings();
    const d = new Date();
    d.setDate(d.getDate() + salesSettings.defaultQuotationValidDays);
    validUntil = d.toISOString().slice(0, 10);
  }

  const { error } = await ctx.supabase
    .from('quotations')
    .update({
      customer_id: input.customerId,
      valid_until: validUntil,
      discount_pct: discountPct,
      total,
      notes: input.notes.trim() || null,
      applied_discount_rule_id: appliedRuleId,
    })
    .eq('id', quotationId)
    .eq('status', 'draft');
  if (error) return { ok: false, error: `Cập nhật báo giá thất bại: ${error.message}` };

  await ctx.supabase.from('quotation_items').delete().eq('quotation_id', quotationId);
  const { error: itemsError } = await ctx.supabase.from('quotation_items').insert(
    input.items.map((it, i) => ({
      tenant_id: ctx.tenantId,
      quotation_id: quotationId,
      product_id: it.productId,
      product_name: it.productName,
      qty: it.qty,
      unit_price: it.unitPrice,
      discount_pct: it.discountPct,
      line_total: lineTotals[i],
      sort_order: i,
    })),
  );
  if (itemsError) {
    return { ok: false, error: `Lưu dòng báo giá thất bại: ${itemsError.message}` };
  }
  return { ok: true, data: { id: quotationId, code: q.code, appliedRuleId } };
}

export async function getQuotationById(
  supabase: SupabaseClient,
  quotationId: string,
): Promise<QuotationRow | null> {
  const { data, error } = await supabase
    .from('quotations')
    .select(
      'id, code, customer_id, status, valid_until, discount_pct, total, notes, created_at, approval_workflow_id, current_step_order, applied_discount_rule_id, customers(name), quotation_items(id, product_id, product_name, qty, unit_price, discount_pct, line_total), quotation_approval_actions(id, step_order, step_name, status, acted_by, acted_at, comment)',
    )
    .eq('id', quotationId)
    .maybeSingle();
  if (error) throw new Error(`Không tải được báo giá: ${error.message}`);
  return (data as unknown as QuotationRow) ?? null;
}

export async function getSalesOrderById(
  supabase: SupabaseClient,
  orderId: string,
): Promise<SalesOrderRow | null> {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(
      'id, code, customer_id, quotation_id, status, expected_delivery_date, discount_pct, total, credit_check, promise_check, notes, created_at, customers(name), sales_order_items(id, product_id, product_name, qty, unit_price, discount_pct, line_total, atp_qty), invoices(id)',
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new Error(`Không tải được đơn hàng: ${error.message}`);
  return (data as unknown as SalesOrderRow) ?? null;
}

export async function getInvoiceById(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<InvoiceRow | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(
      'id, code, sales_order_id, customer_id, total, status, issued_on, paid_at, customers(name), sales_orders(code)',
    )
    .eq('id', invoiceId)
    .maybeSingle();
  if (error) throw new Error(`Không tải được hóa đơn: ${error.message}`);
  return (data as unknown as InvoiceRow) ?? null;
}

export async function getDeliveryById(
  supabase: SupabaseClient,
  deliveryId: string,
): Promise<DeliveryRow | null> {
  const { data, error } = await supabase
    .from('delivery_notes')
    .select(
      'id, code, sales_order_id, status, shipped_at, notes, created_at, sales_orders(code, customers(name))',
    )
    .eq('id', deliveryId)
    .maybeSingle();
  if (error) throw new Error(`Không tải được phiếu giao: ${error.message}`);
  return (data as unknown as DeliveryRow) ?? null;
}

/**
 * Gửi duyệt / duyệt bước / từ chối.
 * - draft → sent: khởi tạo chuỗi N cấp
 * - sent + approved: duyệt bước hiện tại (có thể còn bước tiếp)
 * - sent + rejected: từ chối toàn bộ
 */
export async function setQuotationStatus(
  quotationId: string,
  to: QuotationStatus,
  comment?: string,
): Promise<ActionResult<{ currentStep?: number; done?: boolean }>> {
  const ctx = await getTenantContext();

  const { data: current } = await ctx.supabase
    .from('quotations')
    .select('id, status, total, approval_workflow_id, current_step_order')
    .eq('id', quotationId)
    .single();
  const q = current as {
    id: string;
    status: QuotationStatus;
    total: number;
    approval_workflow_id: string | null;
    current_step_order: number | null;
  } | null;
  if (!q) return { ok: false, error: 'Không tìm thấy báo giá.' };

  if (to === 'sent') {
    if (!canTransitionQuotation(q.status, 'sent')) {
      return { ok: false, error: `Không thể gửi duyệt từ trạng thái "${q.status}".` };
    }
    return submitQuotationForApproval(ctx, q);
  }

  if (to === 'approved' || to === 'rejected') {
    if (q.status !== 'sent') {
      return { ok: false, error: 'Chỉ duyệt/từ chối báo giá đang chờ duyệt.' };
    }
    return actOnQuotationStep(ctx, q, to, comment ?? null);
  }

  if (!canTransitionQuotation(q.status, to)) {
    return { ok: false, error: `Không thể chuyển báo giá từ "${q.status}" sang "${to}".` };
  }
  const { error } = await ctx.supabase.from('quotations').update({ status: to }).eq('id', quotationId);
  if (error) return { ok: false, error: `Đổi trạng thái thất bại: ${error.message}` };
  return { ok: true, data: {} };
}

async function submitQuotationForApproval(
  ctx: TenantContext,
  q: { id: string; total: number },
): Promise<ActionResult<{ currentStep?: number; done?: boolean }>> {
  const workflowId = await ensureDefaultQuotationWorkflow(ctx);
  const { data: stepsData } = await ctx.supabase
    .from('approval_workflow_steps')
    .select('step_order, name, min_amount, assignee_role, assignee_user_id')
    .eq('workflow_id', workflowId)
    .order('step_order');
  const steps: ApprovalStepDef[] = (
    (stepsData ?? []) as {
      step_order: number;
      name: string;
      min_amount: number;
      assignee_role: ApprovalStepDef['assigneeRole'];
      assignee_user_id: string | null;
    }[]
  ).map((s) => ({
    stepOrder: s.step_order,
    name: s.name,
    minAmount: Number(s.min_amount),
    assigneeRole: s.assignee_role,
    assigneeUserId: s.assignee_user_id,
  }));
  const required = requiredApprovalSteps(steps, Number(q.total));
  if (required.length === 0) {
    return { ok: false, error: 'Quy trình duyệt chưa có bước phù hợp với giá trị báo giá.' };
  }

  await ctx.supabase.from('quotation_approval_actions').delete().eq('quotation_id', q.id);
  const { error: actError } = await ctx.supabase.from('quotation_approval_actions').insert(
    required.map((s) => ({
      tenant_id: ctx.tenantId,
      quotation_id: q.id,
      workflow_id: workflowId,
      step_order: s.stepOrder,
      step_name: s.name,
      status: 'pending' as const,
    })),
  );
  if (actError) return { ok: false, error: `Khởi tạo chuỗi duyệt thất bại: ${actError.message}` };

  const first = required[0]!.stepOrder;
  const { error } = await ctx.supabase
    .from('quotations')
    .update({
      status: 'sent',
      approval_workflow_id: workflowId,
      current_step_order: first,
    })
    .eq('id', q.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { currentStep: first, done: false } };
}

async function actOnQuotationStep(
  ctx: TenantContext,
  q: {
    id: string;
    total: number;
    approval_workflow_id: string | null;
    current_step_order: number | null;
  },
  decision: 'approved' | 'rejected',
  comment: string | null,
): Promise<ActionResult<{ currentStep?: number; done?: boolean }>> {
  if (!q.approval_workflow_id || !q.current_step_order) {
    // Fallback Phase 1: manager duyệt 1 cấp
    requireManager(ctx);
    const { error } = await ctx.supabase
      .from('quotations')
      .update({ status: decision })
      .eq('id', q.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { done: true } };
  }

  const { data: stepRow } = await ctx.supabase
    .from('approval_workflow_steps')
    .select('step_order, name, min_amount, assignee_role, assignee_user_id')
    .eq('workflow_id', q.approval_workflow_id)
    .eq('step_order', q.current_step_order)
    .single();
  if (!stepRow) return { ok: false, error: 'Không tìm thấy bước duyệt hiện tại.' };
  const step: ApprovalStepDef = {
    stepOrder: (stepRow as { step_order: number }).step_order,
    name: (stepRow as { name: string }).name,
    minAmount: Number((stepRow as { min_amount: number }).min_amount),
    assigneeRole: (stepRow as { assignee_role: ApprovalStepDef['assigneeRole'] }).assignee_role,
    assigneeUserId: (stepRow as { assignee_user_id: string | null }).assignee_user_id,
  };

  if (
    !canActOnApprovalStep({
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      step,
    })
  ) {
    return { ok: false, error: `Bạn không được phân công duyệt bước "${step.name}".` };
  }

  const { error: logError } = await ctx.supabase
    .from('quotation_approval_actions')
    .update({
      status: decision,
      acted_by: ctx.userId,
      acted_at: new Date().toISOString(),
      comment,
    })
    .eq('quotation_id', q.id)
    .eq('step_order', step.stepOrder)
    .eq('status', 'pending');
  if (logError) return { ok: false, error: logError.message };

  if (decision === 'rejected') {
    const { error } = await ctx.supabase
      .from('quotations')
      .update({ status: 'rejected', current_step_order: step.stepOrder })
      .eq('id', q.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { currentStep: step.stepOrder, done: true } };
  }

  const { data: pending } = await ctx.supabase
    .from('quotation_approval_actions')
    .select('step_order')
    .eq('quotation_id', q.id)
    .eq('status', 'pending')
    .order('step_order')
    .limit(1);
  const next = (pending ?? [])[0] as { step_order: number } | undefined;
  if (!next) {
    const { error } = await ctx.supabase
      .from('quotations')
      .update({ status: 'approved', current_step_order: step.stepOrder })
      .eq('id', q.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { currentStep: step.stepOrder, done: true } };
  }

  const { error } = await ctx.supabase
    .from('quotations')
    .update({ current_step_order: next.step_order })
    .eq('id', q.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { currentStep: next.step_order, done: false } };
}

/** Chuyển báo giá đã duyệt thành đơn hàng (copy dòng). */
export async function convertQuotationToOrder(
  quotationId: string,
): Promise<ActionResult<{ orderId: string; orderCode: string }>> {
  const ctx = await getTenantContext();

  const { data: q } = await ctx.supabase
    .from('quotations')
    .select('id, status, customer_id, discount_pct, total, quotation_items(*)')
    .eq('id', quotationId)
    .single();
  const quotation = q as
    | (QuotationRow & { quotation_items: DocItemRow[] })
    | null;
  if (!quotation) return { ok: false, error: 'Không tìm thấy báo giá.' };
  if (quotation.status !== 'approved') {
    return { ok: false, error: 'Chỉ chuyển được báo giá đã duyệt thành đơn hàng.' };
  }

  const code = await nextCode(ctx.supabase, 'sales_orders', 'DH');
  const { data: so, error } = await ctx.supabase
    .from('sales_orders')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      customer_id: quotation.customer_id,
      quotation_id: quotationId,
      discount_pct: quotation.discount_pct,
      total: quotation.total,
      created_by: ctx.userId,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Tạo đơn hàng thất bại: ${error.message}` };
  const orderId = (so as { id: string }).id;

  const { error: itemsError } = await ctx.supabase.from('sales_order_items').insert(
    quotation.quotation_items.map((it, i) => ({
      tenant_id: ctx.tenantId,
      sales_order_id: orderId,
      product_id: it.product_id,
      product_name: it.product_name,
      qty: it.qty,
      unit_price: it.unit_price,
      discount_pct: it.discount_pct,
      line_total: it.line_total,
      sort_order: i,
    })),
  );
  if (itemsError) {
    await ctx.supabase.from('sales_orders').delete().eq('id', orderId);
    return { ok: false, error: `Copy dòng báo giá thất bại: ${itemsError.message}` };
  }

  await ctx.supabase.from('quotations').update({ status: 'converted' }).eq('id', quotationId);
  return { ok: true, data: { orderId, orderCode: code } };
}

// ------------------------------------------------------------
// Mutations: Đơn hàng
// ------------------------------------------------------------

export interface SalesOrderInput {
  customerId: string;
  expectedDeliveryDate: string | null;
  discountPct: number;
  notes: string;
  items: DocItemInput[];
}

export async function createSalesOrder(
  input: SalesOrderInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const ctx = await getTenantContext();
  if (!input.customerId) return { ok: false, error: 'Hãy chọn khách hàng.' };
  const itemError = validateItems(input.items);
  if (itemError) return { ok: false, error: itemError };

  const lineTotals = input.items.map((it) =>
    computeLineTotal({ qty: it.qty, unitPrice: it.unitPrice, discountPct: it.discountPct }),
  );
  const total = computeDocTotal(lineTotals, input.discountPct);
  const code = await nextCode(ctx.supabase, 'sales_orders', 'DH');

  const { data, error } = await ctx.supabase
    .from('sales_orders')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      customer_id: input.customerId,
      expected_delivery_date: input.expectedDeliveryDate,
      discount_pct: input.discountPct,
      total,
      notes: input.notes.trim() || null,
      created_by: ctx.userId,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Tạo đơn hàng thất bại: ${error.message}` };
  const orderId = (data as { id: string }).id;

  const { error: itemsError } = await ctx.supabase.from('sales_order_items').insert(
    input.items.map((it, i) => ({
      tenant_id: ctx.tenantId,
      sales_order_id: orderId,
      product_id: it.productId,
      product_name: it.productName,
      qty: it.qty,
      unit_price: it.unitPrice,
      discount_pct: it.discountPct,
      line_total: lineTotals[i],
      sort_order: i,
    })),
  );
  if (itemsError) {
    await ctx.supabase.from('sales_orders').delete().eq('id', orderId);
    return { ok: false, error: `Lưu dòng đơn hàng thất bại: ${itemsError.message}` };
  }
  return { ok: true, data: { id: orderId, code } };
}

export interface ConfirmOrderOutput {
  credit: CreditCheckResult;
  atp: { productName: string; requested: number; available: number; enough: boolean }[];
  promise: { lines: PromiseLineResult[]; allCovered: boolean };
}

/** Xác nhận đơn: BẮT BUỘC pass credit check; ATP + CTP stub snapshot. */
export async function confirmSalesOrder(
  orderId: string,
): Promise<ActionResult<ConfirmOrderOutput>> {
  const ctx = await getTenantContext();

  const { data: o } = await ctx.supabase
    .from('sales_orders')
    .select('id, status, total, customer_id, customers(credit_limit), sales_order_items(*)')
    .eq('id', orderId)
    .single();
  const order = o as
    | {
        id: string;
        status: SalesOrderStatus;
        total: number;
        customer_id: string;
        customers: { credit_limit: number | null } | null;
        sales_order_items: DocItemRow[];
      }
    | null;
  if (!order) return { ok: false, error: 'Không tìm thấy đơn hàng.' };
  if (order.status !== 'draft') return { ok: false, error: 'Chỉ xác nhận được đơn ở trạng thái nháp.' };

  const outstandingMap = await getOutstandingByCustomer(ctx.supabase);
  const outstanding = outstandingMap.get(order.customer_id) ?? 0;
  const credit = checkCredit(
    outstanding,
    Number(order.total),
    order.customers?.credit_limit ?? null,
  );
  if (!credit.passed) {
    return {
      ok: false,
      error: `Vượt hạn mức tín dụng: công nợ ${fmt(credit.outstanding)} + đơn ${fmt(credit.orderTotal)} > hạn mức ${fmt(credit.creditLimit ?? 0)}. Cần thu hồi công nợ hoặc nâng hạn mức.`,
    };
  }

  const productIds = order.sales_order_items.map((it) => it.product_id);
  // Ưu tiên ATP module Kho; fallback product_stock nếu chưa sync
  const [stockMap, openWoMap, productionSettings] = await Promise.all([
    getAtpByProductIds(ctx.supabase, productIds),
    getOpenWoByProductIds(ctx.supabase, productIds),
    getProductionSettings(),
  ]);

  const asOf = new Date().toISOString().slice(0, 10);
  const promise = buildPromiseCheck(
    order.sales_order_items.map((it) => {
      const open = openWoMap.get(it.product_id) ?? { qty: 0, earliestEnd: null };
      return {
        productId: it.product_id,
        qty: Number(it.qty),
        atpQty: stockMap.get(it.product_id) ?? 0,
        openWoQty: open.qty,
        openWoEarliestEnd: open.earliestEnd,
        leadTimeDays: productionSettings.defaultLeadTimeDays,
        asOfDate: asOf,
      };
    }),
  );

  const atp = order.sales_order_items.map((it) => {
    const available = stockMap.get(it.product_id) ?? 0;
    return {
      productName: it.product_name,
      requested: Number(it.qty),
      available,
      enough: available >= Number(it.qty),
    };
  });

  // Tôn trọng cài đặt công ty: có thể chặn confirm khi thiếu ATP
  const salesSettings = await getSalesSettings();
  if (!salesSettings.allowConfirmWithoutAtp && !promise.allCovered) {
    return {
      ok: false,
      error:
        'Không đủ tồn kho (ATP) để xác nhận đơn. Bật “Cho phép xác nhận khi ATP thiếu” trong Cài đặt → Kinh doanh, hoặc bổ sung tồn / chờ sản xuất.',
    };
  }

  for (const it of order.sales_order_items) {
    await ctx.supabase
      .from('sales_order_items')
      .update({ atp_qty: stockMap.get(it.product_id) ?? 0 })
      .eq('id', it.id);
  }
  const { data: updated, error } = await ctx.supabase
    .from('sales_orders')
    .update({
      status: 'confirmed',
      credit_check: { ...credit, checked_at: new Date().toISOString() },
      promise_check: { ...promise, checked_at: new Date().toISOString() },
    })
    .eq('id', orderId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, error: `Xác nhận đơn thất bại: ${error.message}` };
  if (!updated) {
    return {
      ok: false,
      error: 'Đơn đã được xác nhận hoặc không còn ở trạng thái nháp.',
    };
  }

  return { ok: true, data: { credit, atp, promise } };
}

async function appendSalesOutbox(
  ctx: TenantContext,
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await ctx.supabase.from('sales_outbox').insert({
    tenant_id: ctx.tenantId,
    event_type: eventType,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    payload,
  });
}

export async function cancelSalesOrder(orderId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  const { error } = await ctx.supabase
    .from('sales_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .in('status', ['draft', 'confirmed']);
  if (error) return { ok: false, error: `Hủy đơn thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------
// Mutations: Giao hàng + Hóa đơn
// ------------------------------------------------------------

export async function createDeliveryNote(
  salesOrderId: string,
): Promise<ActionResult<{ id: string; code: string }>> {
  const ctx = await getTenantContext();

  const { data: so } = await ctx.supabase
    .from('sales_orders')
    .select('status')
    .eq('id', salesOrderId)
    .single();
  const status = (so as { status: SalesOrderStatus } | null)?.status;
  if (status !== 'confirmed') {
    return { ok: false, error: 'Chỉ tạo lệnh giao cho đơn đã xác nhận.' };
  }

  const { data: existingDeliveries } = await ctx.supabase
    .from('delivery_notes')
    .select('id')
    .eq('sales_order_id', salesOrderId)
    .limit(1);
  if ((existingDeliveries ?? []).length > 0) {
    return {
      ok: false,
      error: 'Đơn đã có lệnh giao hàng. Mỗi đơn chỉ tạo một lệnh giao (MVP).',
    };
  }

  const code = await nextCode(ctx.supabase, 'delivery_notes', 'GH');
  const { data, error } = await ctx.supabase
    .from('delivery_notes')
    .insert({ tenant_id: ctx.tenantId, code, sales_order_id: salesOrderId })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Tạo lệnh giao thất bại: ${error.message}` };

  await ctx.supabase
    .from('sales_orders')
    .update({ status: 'delivering' })
    .eq('id', salesOrderId);
  return { ok: true, data: { id: (data as { id: string }).id, code } };
}

/** Xuất kho: trừ tồn nguyên tử từng dòng; đủ hết mới ship. */
export async function shipDelivery(deliveryId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();

  const { data: d } = await ctx.supabase
    .from('delivery_notes')
    .select('id, status, sales_order_id')
    .eq('id', deliveryId)
    .single();
  const delivery = d as { id: string; status: DeliveryStatus; sales_order_id: string } | null;
  if (!delivery) return { ok: false, error: 'Không tìm thấy lệnh giao.' };
  if (delivery.status !== 'pending') return { ok: false, error: 'Lệnh giao đã xuất kho rồi.' };

  const { data: items } = await ctx.supabase
    .from('sales_order_items')
    .select('product_id, product_name, qty')
    .eq('sales_order_id', delivery.sales_order_id);
  const lines = (items ?? []) as { product_id: string; product_name: string; qty: number }[];

  // Ưu tiên xuất qua module Kho (phiếu XK + sync product_stock); fallback decrement_stock
  if (await hasKhoAccess(ctx.supabase)) {
    const issued = await issueFinishedGoodsForDelivery(
      lines.map((l) => ({
        productId: l.product_id,
        productName: l.product_name,
        qty: Number(l.qty),
      })),
      `Xuất giao hàng — đơn ${delivery.sales_order_id}`,
    );
    if (!issued.ok) {
      return {
        ok: false,
        error: issued.error === 'NO_KHO'
          ? 'Lỗi quyền Kho.'
          : issued.error,
      };
    }
  } else {
    const decremented: { product_id: string; qty: number }[] = [];
    for (const line of lines) {
      const { data: okDec, error } = await ctx.supabase.rpc('decrement_stock', {
        p_product_id: line.product_id,
        p_qty: line.qty,
      });
      if (error || okDec !== true) {
        for (const done of decremented) {
          await ctx.supabase.rpc('decrement_stock', {
            p_product_id: done.product_id,
            p_qty: -done.qty,
          });
        }
        return {
          ok: false,
          error: `Không đủ tồn kho cho "${line.product_name}" (cần ${line.qty}). Nhập thêm hàng hoặc chờ sản xuất.`,
        };
      }
      decremented.push({ product_id: line.product_id, qty: line.qty });
    }
  }

  const { error: shipError } = await ctx.supabase
    .from('delivery_notes')
    .update({ status: 'shipped', shipped_at: new Date().toISOString() })
    .eq('id', deliveryId);
  if (shipError) return { ok: false, error: `Cập nhật lệnh giao thất bại: ${shipError.message}` };

  await ctx.supabase
    .from('sales_orders')
    .update({ status: 'completed' })
    .eq('id', delivery.sales_order_id);

  await appendSalesOutbox(ctx, 'DeliveryShipped', 'delivery_note', deliveryId, {
    sales_order_id: delivery.sales_order_id,
    lines: lines.map((l) => ({ product_id: l.product_id, qty: l.qty })),
  });
  return { ok: true, data: undefined };
}

export async function createInvoice(
  salesOrderId: string,
): Promise<ActionResult<{ id: string; code: string }>> {
  const ctx = await getTenantContext();

  const { data: so } = await ctx.supabase
    .from('sales_orders')
    .select('id, status, total, customer_id')
    .eq('id', salesOrderId)
    .single();
  const order = so as
    | { id: string; status: SalesOrderStatus; total: number; customer_id: string }
    | null;
  if (!order) return { ok: false, error: 'Không tìm thấy đơn hàng.' };
  if (
    order.status !== 'confirmed' &&
    order.status !== 'delivering' &&
    order.status !== 'completed'
  ) {
    return {
      ok: false,
      error: 'Chỉ xuất hóa đơn cho đơn đã xác nhận, đang giao hoặc hoàn thành.',
    };
  }

  const { data: existingInvoices } = await ctx.supabase
    .from('invoices')
    .select('id')
    .eq('sales_order_id', salesOrderId)
    .limit(1);
  if ((existingInvoices ?? []).length > 0) {
    return { ok: false, error: 'Đơn đã có hóa đơn.' };
  }

  const code = await nextCode(ctx.supabase, 'invoices', 'HD');
  const { data, error } = await ctx.supabase
    .from('invoices')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      sales_order_id: salesOrderId,
      customer_id: order.customer_id,
      total: order.total,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: `Xuất hóa đơn thất bại: ${error.message}` };
  const invoiceId = (data as { id: string }).id;
  await appendSalesOutbox(ctx, 'InvoiceCreated', 'invoice', invoiceId, {
    code,
    sales_order_id: salesOrderId,
    customer_id: order.customer_id,
    total: order.total,
  });
  return { ok: true, data: { id: invoiceId, code } };
}

export async function markInvoicePaid(invoiceId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  const { data: inv } = await ctx.supabase
    .from('invoices')
    .select('id, code, total, customer_id, sales_order_id')
    .eq('id', invoiceId)
    .eq('status', 'unpaid')
    .maybeSingle();
  const { error } = await ctx.supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('status', 'unpaid');
  if (error) return { ok: false, error: `Ghi nhận thanh toán thất bại: ${error.message}` };
  if (inv) {
    await appendSalesOutbox(ctx, 'InvoicePaid', 'invoice', invoiceId, {
      code: (inv as { code: string }).code,
      total: (inv as { total: number }).total,
      customer_id: (inv as { customer_id: string }).customer_id,
      sales_order_id: (inv as { sales_order_id: string }).sales_order_id,
    });
  }
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------
// CRM — lịch sử giao dịch khách hàng
// ------------------------------------------------------------

export type CustomerTimelineKind =
  | 'quotation'
  | 'sales_order'
  | 'delivery'
  | 'invoice'
  | 'payment';

export interface CustomerTimelineEvent {
  kind: CustomerTimelineKind;
  id: string;
  code: string;
  status: string;
  amount: number | null;
  at: string;
  title: string;
}

export interface CustomerDetail {
  customer: CustomerRow;
  outstanding: number;
  timeline: CustomerTimelineEvent[];
}

export async function getCustomerDetail(customerId: string): Promise<CustomerDetail | null> {
  const ctx = await getTenantContext();
  const { data: c } = await ctx.supabase
    .from('customers')
    .select('id, code, name, kind, tax_code, credit_limit, status, attributes, created_at')
    .eq('id', customerId)
    .maybeSingle();
  if (!c) return null;
  const customer = c as CustomerRow;

  const [{ data: quotes }, { data: orders }, { data: invoices }] = await Promise.all([
    ctx.supabase
      .from('quotations')
      .select('id, code, status, total, created_at, updated_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    ctx.supabase
      .from('sales_orders')
      .select('id, code, status, total, created_at, updated_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    ctx.supabase
      .from('invoices')
      .select('id, code, status, total, issued_on, paid_at, created_at, sales_order_id')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ]);

  const orderIds = ((orders ?? []) as { id: string }[]).map((o) => o.id);
  const { data: deliveries } =
    orderIds.length > 0
      ? await ctx.supabase
          .from('delivery_notes')
          .select('id, code, status, shipped_at, created_at, sales_order_id')
          .in('sales_order_id', orderIds)
      : { data: [] };

  const timeline: CustomerTimelineEvent[] = [];
  for (const q of (quotes ?? []) as {
    id: string;
    code: string;
    status: string;
    total: number;
    created_at: string;
  }[]) {
    timeline.push({
      kind: 'quotation',
      id: q.id,
      code: q.code,
      status: q.status,
      amount: Number(q.total),
      at: q.created_at,
      title: `Báo giá ${q.code}`,
    });
  }
  for (const o of (orders ?? []) as {
    id: string;
    code: string;
    status: string;
    total: number;
    created_at: string;
  }[]) {
    timeline.push({
      kind: 'sales_order',
      id: o.id,
      code: o.code,
      status: o.status,
      amount: Number(o.total),
      at: o.created_at,
      title: `Đơn hàng ${o.code}`,
    });
  }
  for (const d of (deliveries ?? []) as {
    id: string;
    code: string;
    status: string;
    shipped_at: string | null;
    created_at: string;
  }[]) {
    timeline.push({
      kind: 'delivery',
      id: d.id,
      code: d.code,
      status: d.status,
      amount: null,
      at: d.shipped_at ?? d.created_at,
      title: `Giao hàng ${d.code}`,
    });
  }
  for (const inv of (invoices ?? []) as {
    id: string;
    code: string;
    status: string;
    total: number;
    issued_on: string;
    paid_at: string | null;
    created_at: string;
  }[]) {
    timeline.push({
      kind: 'invoice',
      id: inv.id,
      code: inv.code,
      status: inv.status,
      amount: Number(inv.total),
      at: inv.created_at,
      title: `Hóa đơn ${inv.code}`,
    });
    if (inv.status === 'paid' && inv.paid_at) {
      timeline.push({
        kind: 'payment',
        id: `${inv.id}-paid`,
        code: inv.code,
        status: 'paid',
        amount: Number(inv.total),
        at: inv.paid_at,
        title: `Thanh toán ${inv.code}`,
      });
    }
  }
  timeline.sort((a, b) => (a.at < b.at ? 1 : -1));

  const outstanding = ((invoices ?? []) as { status: string; total: number }[])
    .filter((i) => i.status === 'unpaid')
    .reduce((s, i) => s + Number(i.total), 0);

  return { customer, outstanding, timeline };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}
