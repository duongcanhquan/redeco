import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { formatMoney, isDebtOverdue } from '@/lib/format';
import { getSalesSettings } from '@/services/tenant-settings.service';

export interface DashboardKpis {
  activeCustomers: number;
  quotesPending: number;
  ordersActive: number;
  unpaidTotal: number;
  unpaidCount: number;
  overdueCount: number;
  lowStockCount: number;
}

export interface ChartPoint {
  label: string;
  amount: number;
}

export interface StackSlice {
  key: string;
  label: string;
  count: number;
  /** CSS color token name used by charts (accent | warning | success | danger | muted) */
  tone: 'accent' | 'warning' | 'success' | 'danger' | 'muted';
}

export interface QueueItem {
  id: string;
  code: string;
  title: string;
  meta: string;
  href: string;
  tone: string;
}

export interface LowStockRow {
  sku: string;
  name: string;
  qty: number;
}

export interface SalesDashboardData {
  kpis: DashboardKpis;
  pipeline: StackSlice[];
  quoteStatuses: StackSlice[];
  revenue14d: ChartPoint[];
  queues: {
    approvals: QueueItem[];
    deliveries: QueueItem[];
    debts: QueueItem[];
  };
  lowStock: LowStockRow[];
}

const ORDER_PIPELINE: { key: string; label: string; tone: StackSlice['tone'] }[] = [
  { key: 'draft', label: 'Nháp', tone: 'muted' },
  { key: 'confirmed', label: 'Đã xác nhận', tone: 'accent' },
  { key: 'delivering', label: 'Đang giao', tone: 'warning' },
  { key: 'completed', label: 'Hoàn tất', tone: 'success' },
  { key: 'cancelled', label: 'Huỷ', tone: 'danger' },
];

const QUOTE_FUNNEL: { key: string; label: string; tone: StackSlice['tone'] }[] = [
  { key: 'draft', label: 'Nháp', tone: 'muted' },
  { key: 'sent', label: 'Chờ duyệt', tone: 'warning' },
  { key: 'approved', label: 'Đã duyệt', tone: 'accent' },
  { key: 'converted', label: 'Chuyển đơn', tone: 'success' },
  { key: 'rejected', label: 'Từ chối', tone: 'danger' },
];

function countByStatus(rows: { status: string }[] | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    map.set(row.status, (map.get(row.status) ?? 0) + 1);
  }
  return map;
}

function last14DayLabels(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }
  return out;
}

/**
 * Tổng hợp số liệu hub Kinh doanh (bento + biểu đồ).
 * Chạy dưới JWT user — RLS cô lập tenant + module.
 */
export async function getSalesDashboardData(
  supabase: SupabaseClient,
  basePath: string,
): Promise<SalesDashboardData> {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();
  const salesSettings = await getSalesSettings();
  const money = (n: number) => formatMoney(n, salesSettings.currencyLabel);

  const [
    customersRes,
    quotesRes,
    ordersRes,
    invoicesRes,
    invoices14Res,
    pendingQuotesRes,
    pendingDeliveriesRes,
    unpaidInvoicesRes,
    stockRes,
  ] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('quotations').select('status'),
    supabase.from('sales_orders').select('status'),
    supabase.from('invoices').select('id, total, status, issued_on').eq('status', 'unpaid'),
    supabase
      .from('invoices')
      .select('total, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true }),
    supabase
      .from('quotations')
      .select('id, code, total, customers(name)')
      .eq('status', 'sent')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('delivery_notes')
      .select('id, code, sales_orders(code)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('id, code, total, issued_on, customers(name)')
      .eq('status', 'unpaid')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('product_stock')
      .select('qty_on_hand, products(sku, name, is_active)')
      .lte('qty_on_hand', 5)
      .order('qty_on_hand', { ascending: true })
      .limit(40),
  ]);

  const quoteCounts = countByStatus(quotesRes.data as { status: string }[] | null);
  const orderCounts = countByStatus(ordersRes.data as { status: string }[] | null);

  const unpaidRows = (invoicesRes.data ?? []) as {
    id: string;
    total: number;
    status: string;
    issued_on: string;
  }[];
  const unpaidTotal = unpaidRows.reduce((s, r) => s + Number(r.total), 0);
  const overdueCount = unpaidRows.filter((r) =>
    isDebtOverdue(r.issued_on, r.status, salesSettings.debtWarningDays),
  ).length;

  const quotesPending = quoteCounts.get('sent') ?? 0;
  const ordersActive =
    (orderCounts.get('confirmed') ?? 0) + (orderCounts.get('delivering') ?? 0);

  const dayKeys = last14DayLabels();
  const byDay = new Map<string, number>();
  for (const row of (invoices14Res.data ?? []) as { total: number; created_at: string }[]) {
    const key = row.created_at.slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(row.total));
  }
  const revenue14d: ChartPoint[] = dayKeys.map((d) => ({
    label: d.label,
    amount: byDay.get(d.key) ?? 0,
  }));

  type NestedName = { name: string } | { name: string }[] | null;
  type NestedCode = { code: string } | { code: string }[] | null;

  const nameOf = (v: NestedName): string => {
    if (!v) return '—';
    if (Array.isArray(v)) return v[0]?.name ?? '—';
    return v.name;
  };
  const codeOf = (v: NestedCode): string => {
    if (!v) return '—';
    if (Array.isArray(v)) return v[0]?.code ?? '—';
    return v.code;
  };

  const approvals: QueueItem[] = (
    (pendingQuotesRes.data ?? []) as {
      id: string;
      code: string;
      total: number;
      customers: NestedName;
    }[]
  ).map((q) => ({
    id: q.id,
    code: q.code,
    title: nameOf(q.customers),
    meta: money(Number(q.total)),
    href: `${basePath}/sales/quotations?status=sent`,
    tone: 'warning',
  }));

  const deliveries: QueueItem[] = (
    (pendingDeliveriesRes.data ?? []) as {
      id: string;
      code: string;
      sales_orders: NestedCode;
    }[]
  ).map((d) => ({
    id: d.id,
    code: d.code,
    title: `Đơn ${codeOf(d.sales_orders)}`,
    meta: 'Chờ xuất kho',
    href: `${basePath}/sales/deliveries?status=pending`,
    tone: 'accent',
  }));

  const debts: QueueItem[] = (
    (unpaidInvoicesRes.data ?? []) as {
      id: string;
      code: string;
      total: number;
      issued_on: string;
      customers: NestedName;
    }[]
  )
    .sort((a, b) => {
      const ao = isDebtOverdue(a.issued_on, 'unpaid', salesSettings.debtWarningDays) ? 0 : 1;
      const bo = isDebtOverdue(b.issued_on, 'unpaid', salesSettings.debtWarningDays) ? 0 : 1;
      return ao - bo;
    })
    .slice(0, 5)
    .map((inv) => {
      const overdue = isDebtOverdue(inv.issued_on, 'unpaid', salesSettings.debtWarningDays);
      return {
        id: inv.id,
        code: inv.code,
        title: nameOf(inv.customers),
        meta: overdue ? `${money(Number(inv.total))} · quá hạn` : money(Number(inv.total)),
        href: `${basePath}/sales/invoices?status=${overdue ? 'overdue' : 'unpaid'}`,
        tone: overdue ? 'danger' : 'warning',
      };
    });

  type StockJoin = {
    qty_on_hand: number;
    products: { sku: string; name: string; is_active: boolean } | { sku: string; name: string; is_active: boolean }[] | null;
  };

  const lowStockAll: LowStockRow[] = [];
  for (const row of (stockRes.data ?? []) as StockJoin[]) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!product || product.is_active === false) continue;
    lowStockAll.push({
      sku: product.sku,
      name: product.name,
      qty: Number(row.qty_on_hand),
    });
  }
  const lowStock = lowStockAll.slice(0, 8);

  return {
    kpis: {
      activeCustomers: customersRes.count ?? 0,
      quotesPending,
      ordersActive,
      unpaidTotal,
      unpaidCount: unpaidRows.length,
      overdueCount,
      lowStockCount: lowStockAll.length,
    },
    pipeline: ORDER_PIPELINE.map((s) => ({
      ...s,
      count: orderCounts.get(s.key) ?? 0,
    })),
    quoteStatuses: QUOTE_FUNNEL.map((s) => ({
      ...s,
      count: quoteCounts.get(s.key) ?? 0,
    })),
    revenue14d,
    queues: { approvals, deliveries, debts },
    lowStock,
  };
}
