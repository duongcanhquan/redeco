import 'server-only';
import {
  canTransitionQuotation,
  checkCredit,
  computeDocTotal,
  computeLineTotal,
  type CreditCheckResult,
  type CustomerKind,
  type CustomerStatus,
  type DeliveryStatus,
  type InvoiceStatus,
  type QuotationStatus,
  type SalesOrderStatus,
} from '@optimake/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ------------------------------------------------------------
// Ngữ cảnh tenant + quyền
// ------------------------------------------------------------

export interface TenantContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
}

export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập.');
  const tenantId = user.app_metadata['tenant_id'];
  if (typeof tenantId !== 'string' || !tenantId) {
    throw new Error('Tài khoản không thuộc công ty nào.');
  }
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return {
    supabase,
    userId: user.id,
    tenantId,
    role: ((profile as { role?: string } | null)?.role ?? 'member') as TenantContext['role'],
  };
}

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
  customers?: { name: string } | null;
  quotation_items?: DocItemRow[];
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
      'id, code, customer_id, status, valid_until, discount_pct, total, notes, created_at, customers(name), quotation_items(id, product_id, product_name, qty, unit_price, discount_pct, line_total)',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Không tải được báo giá: ${error.message}`);
  return (data ?? []) as unknown as QuotationRow[];
}

export async function listSalesOrders(supabase: SupabaseClient): Promise<SalesOrderRow[]> {
  const { data, error } = await supabase
    .from('sales_orders')
    .select(
      'id, code, customer_id, quotation_id, status, expected_delivery_date, discount_pct, total, credit_check, notes, created_at, customers(name), sales_order_items(id, product_id, product_name, qty, unit_price, discount_pct, line_total, atp_qty), invoices(id)',
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

function requireManager(ctx: TenantContext): void {
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    throw new Error('Chỉ quản trị công ty (owner/admin) được thực hiện thao tác này.');
  }
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
  discountPct: number;
  notes: string;
  items: DocItemInput[];
}

export async function createQuotation(
  input: QuotationInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const ctx = await getTenantContext();
  if (!input.customerId) return { ok: false, error: 'Hãy chọn khách hàng.' };
  const itemError = validateItems(input.items);
  if (itemError) return { ok: false, error: itemError };

  const lineTotals = input.items.map((it) =>
    computeLineTotal({ qty: it.qty, unitPrice: it.unitPrice, discountPct: it.discountPct }),
  );
  const total = computeDocTotal(lineTotals, input.discountPct);
  const code = await nextCode(ctx.supabase, 'quotations', 'BG');

  const { data, error } = await ctx.supabase
    .from('quotations')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      customer_id: input.customerId,
      valid_until: input.validUntil,
      discount_pct: input.discountPct,
      total,
      notes: input.notes.trim() || null,
      created_by: ctx.userId,
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
  return { ok: true, data: { id: quotationId, code } };
}

export async function setQuotationStatus(
  quotationId: string,
  to: QuotationStatus,
): Promise<ActionResult> {
  const ctx = await getTenantContext();
  // Duyệt / từ chối chỉ dành cho quản trị công ty (phê duyệt 1 cấp — blueprint)
  if (to === 'approved' || to === 'rejected') requireManager(ctx);

  const { data: current } = await ctx.supabase
    .from('quotations')
    .select('status')
    .eq('id', quotationId)
    .single();
  const from = (current as { status: QuotationStatus } | null)?.status;
  if (!from) return { ok: false, error: 'Không tìm thấy báo giá.' };
  if (!canTransitionQuotation(from, to)) {
    return { ok: false, error: `Không thể chuyển báo giá từ "${from}" sang "${to}".` };
  }

  const { error } = await ctx.supabase
    .from('quotations')
    .update({ status: to })
    .eq('id', quotationId);
  if (error) return { ok: false, error: `Đổi trạng thái thất bại: ${error.message}` };
  return { ok: true, data: undefined };
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
}

/** Xác nhận đơn: BẮT BUỘC pass credit check; ATP snapshot từng dòng. */
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

  // 1) Credit check (invariant bắt buộc)
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

  // 2) ATP: so tồn kho khả dụng từng dòng (thiếu vẫn cho xác nhận — giao sau; CTP ở Phase 2)
  const productIds = order.sales_order_items.map((it) => it.product_id);
  const { data: stocks } = await ctx.supabase
    .from('product_stock')
    .select('product_id, qty_on_hand')
    .in('product_id', productIds);
  const stockMap = new Map(
    ((stocks ?? []) as { product_id: string; qty_on_hand: number }[]).map((s) => [
      s.product_id,
      Number(s.qty_on_hand),
    ]),
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

  // 3) Lưu snapshot + chuyển trạng thái
  for (const it of order.sales_order_items) {
    await ctx.supabase
      .from('sales_order_items')
      .update({ atp_qty: stockMap.get(it.product_id) ?? 0 })
      .eq('id', it.id);
  }
  const { error } = await ctx.supabase
    .from('sales_orders')
    .update({
      status: 'confirmed',
      credit_check: { ...credit, checked_at: new Date().toISOString() },
    })
    .eq('id', orderId);
  if (error) return { ok: false, error: `Xác nhận đơn thất bại: ${error.message}` };

  return { ok: true, data: { credit, atp } };
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

  // Kiểm tra đủ tồn trước, rồi trừ nguyên tử từng dòng (decrement_stock chống âm kho)
  const decremented: { product_id: string; qty: number }[] = [];
  for (const line of lines) {
    const { data: okDec, error } = await ctx.supabase.rpc('decrement_stock', {
      p_product_id: line.product_id,
      p_qty: line.qty,
    });
    if (error || okDec !== true) {
      // Hoàn kho các dòng đã trừ
      for (const done of decremented) {
        await ctx.supabase.rpc('decrement_stock', { p_product_id: done.product_id, p_qty: -done.qty });
      }
      return {
        ok: false,
        error: `Không đủ tồn kho cho "${line.product_name}" (cần ${line.qty}). Nhập thêm hàng hoặc chờ sản xuất.`,
      };
    }
    decremented.push({ product_id: line.product_id, qty: line.qty });
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
  if (order.status !== 'delivering' && order.status !== 'completed') {
    return { ok: false, error: 'Chỉ xuất hóa đơn cho đơn đã giao hàng.' };
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
  return { ok: true, data: { id: (data as { id: string }).id, code } };
}

export async function markInvoicePaid(invoiceId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  const { error } = await ctx.supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('status', 'unpaid');
  if (error) return { ok: false, error: `Ghi nhận thanh toán thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}
