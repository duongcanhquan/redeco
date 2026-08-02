import 'server-only';
import { addPaymentTermsDays, daysPastDue } from '@optimake/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTenantContext,
  type ActionResult,
  type TenantContext,
} from '@/services/sales-context';
import { getAccountingSettings } from '@/services/tenant-settings.service';

export type { ActionResult };

export interface ArInvoiceRow {
  id: string;
  source_invoice_id: string;
  customer_id: string;
  code: string;
  amount: number;
  status: string;
  issued_on: string;
  due_on: string;
  created_at: string;
  customers?: { name: string } | null;
}

export interface ValuationRow {
  id: string;
  source_type: string;
  source_id: string;
  item_id: string | null;
  qty: number;
  unit_cost: number;
  amount: number;
  posted_at: string;
  inventory_items?: { sku: string; name: string } | null;
}

async function hasKeToanAccess(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', { p_key: 'ke-toan' });
  if (error) return false;
  return data === true;
}

async function hasKhoAccess(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', { p_key: 'kho' });
  if (error) return false;
  return data === true;
}

/**
 * ADR-011: consume sales_outbox khi entitle + ar_enabled.
 * Không có KT / tắt AR → no-op (Sales không đứt).
 */
export async function processPendingAccountingOutbox(): Promise<
  ActionResult<{ processed: number; skipped: string }>
> {
  const ctx = await getTenantContext();
  if (!(await hasKeToanAccess(ctx.supabase))) {
    return { ok: true, data: { processed: 0, skipped: 'no_ke_toan' } };
  }
  const settings = await getAccountingSettings();
  if (!settings.arEnabled) {
    return { ok: true, data: { processed: 0, skipped: 'ar_disabled' } };
  }

  const { data: events, error } = await ctx.supabase
    .from('sales_outbox')
    .select('id, event_type, aggregate_id, payload, created_at')
    .is('published_at', null)
    .in('event_type', ['InvoiceCreated', 'InvoicePaid'])
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) return { ok: false, error: `Đọc outbox thất bại: ${error.message}` };

  let processed = 0;
  for (const ev of (events ?? []) as {
    id: string;
    event_type: string;
    aggregate_id: string;
    payload: Record<string, unknown>;
    created_at: string;
  }[]) {
    try {
      if (ev.event_type === 'InvoiceCreated') {
        await mirrorInvoiceCreated(ctx, ev.aggregate_id, ev.payload, settings.defaultPaymentTermsDays);
      } else if (ev.event_type === 'InvoicePaid') {
        await mirrorInvoicePaid(ctx, ev.aggregate_id, ev.payload, ev.id);
      }
      await ctx.supabase
        .from('sales_outbox')
        .update({ published_at: new Date().toISOString() })
        .eq('id', ev.id);
      processed += 1;
    } catch {
      // Fail-soft: để event pending, không chặn các event khác / Sales
      break;
    }
  }

  if (settings.cogsEnabled) {
    await syncCogsFromInventory(ctx);
  }

  return { ok: true, data: { processed, skipped: '' } };
}

async function mirrorInvoiceCreated(
  ctx: TenantContext,
  invoiceId: string,
  payload: Record<string, unknown>,
  termsDays: number,
): Promise<void> {
  const { data: existing } = await ctx.supabase
    .from('ar_invoices')
    .select('id')
    .eq('source_invoice_id', invoiceId)
    .maybeSingle();
  if (existing) return;

  let code = typeof payload['code'] === 'string' ? payload['code'] : '';
  let customerId = typeof payload['customer_id'] === 'string' ? payload['customer_id'] : '';
  let amount = typeof payload['total'] === 'number' ? payload['total'] : Number(payload['total']);

  if (!code || !customerId || !Number.isFinite(amount)) {
    const { data: inv } = await ctx.supabase
      .from('invoices')
      .select('code, customer_id, total, created_at')
      .eq('id', invoiceId)
      .maybeSingle();
    if (!inv) throw new Error('invoice_missing');
    const row = inv as { code: string; customer_id: string; total: number; created_at: string };
    code = row.code;
    customerId = row.customer_id;
    amount = Number(row.total);
  }

  const issuedOn = new Date().toISOString().slice(0, 10);
  const dueOn = addPaymentTermsDays(issuedOn, termsDays);

  const { error } = await ctx.supabase.from('ar_invoices').insert({
    tenant_id: ctx.tenantId,
    source_invoice_id: invoiceId,
    customer_id: customerId,
    code,
    amount,
    status: 'open',
    issued_on: issuedOn,
    due_on: dueOn,
  });
  if (error) throw new Error(error.message);
}

async function mirrorInvoicePaid(
  ctx: TenantContext,
  invoiceId: string,
  payload: Record<string, unknown>,
  outboxId: string,
): Promise<void> {
  let arId: string | null = null;
  const { data: ar } = await ctx.supabase
    .from('ar_invoices')
    .select('id, amount, status')
    .eq('source_invoice_id', invoiceId)
    .maybeSingle();

  if (!ar) {
    // Outbox Paid trước Created (hiếm) — tạo mirror rồi paid
    await mirrorInvoiceCreated(
      ctx,
      invoiceId,
      payload,
      (await getAccountingSettings()).defaultPaymentTermsDays,
    );
    const { data: again } = await ctx.supabase
      .from('ar_invoices')
      .select('id, amount, status')
      .eq('source_invoice_id', invoiceId)
      .maybeSingle();
    if (!again) throw new Error('ar_missing');
    arId = (again as { id: string }).id;
    const amount = Number((again as { amount: number }).amount);
    await insertReceiptIfNeeded(ctx, arId, amount, outboxId);
    await ctx.supabase.from('ar_invoices').update({ status: 'paid' }).eq('id', arId);
    return;
  }

  const row = ar as { id: string; amount: number; status: string };
  if (row.status === 'paid') return;
  arId = row.id;
  await insertReceiptIfNeeded(ctx, arId, Number(row.amount), outboxId);
  await ctx.supabase.from('ar_invoices').update({ status: 'paid' }).eq('id', arId);
}

async function insertReceiptIfNeeded(
  ctx: TenantContext,
  arInvoiceId: string,
  amount: number,
  outboxId: string,
): Promise<void> {
  const { data: existing } = await ctx.supabase
    .from('cash_receipts')
    .select('id')
    .eq('source_outbox_id', outboxId)
    .maybeSingle();
  if (existing) return;
  const { error } = await ctx.supabase.from('cash_receipts').insert({
    tenant_id: ctx.tenantId,
    ar_invoice_id: arInvoiceId,
    amount,
    method: 'transfer',
    source_outbox_id: outboxId,
  });
  if (error) throw new Error(error.message);
}

/** COGS stub: phiếu XK posted → valuation (chỉ khi cogs_enabled + có kho). */
async function syncCogsFromInventory(ctx: TenantContext): Promise<void> {
  if (!(await hasKhoAccess(ctx.supabase))) return;

  const { data: txns } = await ctx.supabase
    .from('inventory_transactions')
    .select(
      'id, posted_at, inventory_transaction_lines(item_id, qty, inventory_items(id, base_price))',
    )
    .eq('status', 'posted')
    .eq('txn_type', 'issue')
    .order('posted_at', { ascending: false })
    .limit(30);

  for (const tx of (txns ?? []) as unknown as {
    id: string;
    posted_at: string | null;
    inventory_transaction_lines: {
      item_id: string;
      qty: number;
      inventory_items: { id: string; base_price: number } | { id: string; base_price: number }[] | null;
    }[];
  }[]) {
    for (const line of tx.inventory_transaction_lines ?? []) {
      const item = Array.isArray(line.inventory_items)
        ? (line.inventory_items[0] ?? null)
        : line.inventory_items;
      const unit = Number(item?.base_price ?? 0);
      const qty = Number(line.qty);
      const amount = Math.round(unit * qty * 100) / 100;
      await ctx.supabase.from('inventory_valuation_entries').upsert(
        {
          tenant_id: ctx.tenantId,
          source_type: 'inventory_txn',
          source_id: tx.id,
          item_id: line.item_id,
          qty,
          unit_cost: unit,
          amount,
          posted_at: tx.posted_at ?? new Date().toISOString(),
        },
        { onConflict: 'tenant_id,source_type,source_id,item_id' },
      );
    }
  }
}

export async function listArInvoices(supabase: SupabaseClient): Promise<ArInvoiceRow[]> {
  const { data, error } = await supabase
    .from('ar_invoices')
    .select(
      'id, source_invoice_id, customer_id, code, amount, status, issued_on, due_on, created_at, customers(name)',
    )
    .order('due_on', { ascending: true })
    .limit(100);
  if (error) throw new Error(`Không tải được sổ công nợ: ${error.message}`);
  return (data ?? []) as unknown as ArInvoiceRow[];
}

export async function listValuationEntries(supabase: SupabaseClient): Promise<ValuationRow[]> {
  const { data, error } = await supabase
    .from('inventory_valuation_entries')
    .select(
      'id, source_type, source_id, item_id, qty, unit_cost, amount, posted_at, inventory_items(sku, name)',
    )
    .order('posted_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`Không tải được giá vốn: ${error.message}`);
  return (data ?? []) as unknown as ValuationRow[];
}

export function arAgingBuckets(rows: ArInvoiceRow[], asOf: string): {
  current: number;
  d1_30: number;
  d31_60: number;
  d60p: number;
  openCount: number;
  nCurrent: number;
  n1_30: number;
  n31_60: number;
  n60p: number;
} {
  let current = 0;
  let d1_30 = 0;
  let d31_60 = 0;
  let d60p = 0;
  let openCount = 0;
  let nCurrent = 0;
  let n1_30 = 0;
  let n31_60 = 0;
  let n60p = 0;
  for (const r of rows) {
    if (r.status === 'paid' || r.status === 'void') continue;
    openCount += 1;
    const amt = Number(r.amount);
    const d = daysPastDue(r.due_on, asOf);
    if (d <= 0) {
      current += amt;
      nCurrent += 1;
    } else if (d <= 30) {
      d1_30 += amt;
      n1_30 += 1;
    } else if (d <= 60) {
      d31_60 += amt;
      n31_60 += 1;
    } else {
      d60p += amt;
      n60p += 1;
    }
  }
  return { current, d1_30, d31_60, d60p, openCount, nCurrent, n1_30, n31_60, n60p };
}
