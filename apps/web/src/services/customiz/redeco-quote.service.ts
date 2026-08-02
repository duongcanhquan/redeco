import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { computeDocTotal, computeLineTotal } from '@optimake/domain';
import { REDECO_PACK_KEY, REDECO_PACK_KEYS } from '@/lib/customiz/redeco-rfq-parse';
import { runStubQuoteCalc, type CalcOutput } from '@/lib/customiz/redeco-quote-calc';
import {
  HUB_STATUS_LABELS,
  type HubStatus,
} from '@/lib/customiz/redeco-hub-status';
import { getRedecoRfqRequest } from '@/services/customiz/redeco-rfq.service';
import { getTenantContext, requireManager } from '@/services/sales.service';

export type { HubStatus };
export { HUB_STATUS_LABELS };

async function nextCode(
  supabase: SupabaseClient,
  table: string,
  prefix: string,
): Promise<string> {
  const { count } = await supabase.from(table).select('id', { count: 'exact', head: true });
  return `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export type CalcProfile = {
  id: string;
  name: string;
  is_default: boolean;
  config: Record<string, unknown>;
  updated_at: string;
};

export type QuoteCalculation = {
  id: string;
  request_id: string;
  profile_id: string | null;
  input_snapshot: Record<string, unknown>;
  output_snapshot: CalcOutput & Record<string, unknown>;
  hub_status: HubStatus;
  quotation_id: string | null;
  calculated_at: string;
  created_at: string;
  request?: {
    external_quote_no: string;
    attributes: Record<string, string>;
  };
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function mapProfile(row: Record<string, unknown>): CalcProfile {
  return {
    id: String(row['id']),
    name: String(row['name']),
    is_default: Boolean(row['is_default']),
    config: asRecord(row['config']),
    updated_at: String(row['updated_at']),
  };
}

function mapCalc(row: Record<string, unknown>): QuoteCalculation {
  const out = asRecord(row['output_snapshot']);
  return {
    id: String(row['id']),
    request_id: String(row['request_id']),
    profile_id:
      row['profile_id'] === null || row['profile_id'] === undefined
        ? null
        : String(row['profile_id']),
    input_snapshot: asRecord(row['input_snapshot']),
    output_snapshot: {
      feasible: Boolean(out['feasible'] ?? true),
      cost: Number(out['cost'] ?? 0),
      price: Number(out['price'] ?? 0),
      currency: String(out['currency'] ?? 'VND'),
      note: String(out['note'] ?? ''),
      breakdown: Array.isArray(out['breakdown'])
        ? (out['breakdown'] as { label: string; amount: number }[])
        : [],
      ...out,
    },
    hub_status: String(row['hub_status']) as HubStatus,
    quotation_id:
      row['quotation_id'] === null || row['quotation_id'] === undefined
        ? null
        : String(row['quotation_id']),
    calculated_at: String(row['calculated_at']),
    created_at: String(row['created_at']),
  };
}

export async function listCalcProfiles(): Promise<CalcProfile[]> {
  const ctx = await getTenantContext();
  const { data, error } = await ctx.supabase
    .from('redeco_quote_calc_profiles')
    .select('id, name, is_default, config, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .order('is_default', { ascending: false })
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapProfile(r as Record<string, unknown>));
}

export async function getOrCreateDefaultProfile(): Promise<CalcProfile> {
  const list = await listCalcProfiles();
  const def = list.find((p) => p.is_default) ?? list[0];
  if (def) return def;
  const ctx = await getTenantContext();
  const { data, error } = await ctx.supabase
    .from('redeco_quote_calc_profiles')
    .insert({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_PACK_KEY,
      name: 'Mặc định',
      is_default: true,
      config: { default_unit_cost: 0, markup_pct: 20 },
    })
    .select('id, name, is_default, config, updated_at')
    .single();
  if (error) throw new Error(error.message);
  return mapProfile(data as Record<string, unknown>);
}

export async function upsertCalcProfile(input: {
  id?: string;
  name: string;
  is_default: boolean;
  config: Record<string, unknown>;
}): Promise<CalcProfile> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const name = input.name.trim();
  if (!name) throw new Error('Nhập tên profile.');

  if (input.is_default) {
    await ctx.supabase
      .from('redeco_quote_calc_profiles')
      .update({ is_default: false })
      .eq('tenant_id', ctx.tenantId)
      .in('pack_key', [...REDECO_PACK_KEYS]);
  }

  if (input.id) {
    const { data, error } = await ctx.supabase
      .from('redeco_quote_calc_profiles')
      .update({ name, is_default: input.is_default, config: input.config })
      .eq('id', input.id)
      .eq('tenant_id', ctx.tenantId)
      .select('id, name, is_default, config, updated_at')
      .single();
    if (error) throw new Error(error.message);
    return mapProfile(data as Record<string, unknown>);
  }

  const { data, error } = await ctx.supabase
    .from('redeco_quote_calc_profiles')
    .insert({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_PACK_KEY,
      name,
      is_default: input.is_default,
      config: input.config,
    })
    .select('id, name, is_default, config, updated_at')
    .single();
  if (error) throw new Error(error.message);
  return mapProfile(data as Record<string, unknown>);
}

export async function deleteCalcProfile(id: string): Promise<void> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const { error } = await ctx.supabase
    .from('redeco_quote_calc_profiles')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  if (error) throw new Error(error.message);
}

export async function runAndSaveCalculation(input: {
  requestId: string;
  profileId?: string;
}): Promise<QuoteCalculation> {
  const ctx = await getTenantContext();
  const request = await getRedecoRfqRequest(input.requestId);
  if (!request || request.deleted_at) throw new Error('Không tìm thấy đề xuất.');

  let profile = await getOrCreateDefaultProfile();
  if (input.profileId) {
    const { data } = await ctx.supabase
      .from('redeco_quote_calc_profiles')
      .select('id, name, is_default, config, updated_at')
      .eq('id', input.profileId)
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();
    if (data) profile = mapProfile(data as Record<string, unknown>);
  }

  const output = runStubQuoteCalc({
    externalQuoteNo: request.external_quote_no,
    attributes: request.attributes,
    profileConfig: profile.config,
  });

  const inputSnapshot = {
    external_quote_no: request.external_quote_no,
    attributes: request.attributes,
    profile_id: profile.id,
    profile_name: profile.name,
    profile_config: profile.config,
  };

  const { data, error } = await ctx.supabase
    .from('redeco_quote_calculations')
    .insert({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_PACK_KEY,
      request_id: request.id,
      profile_id: profile.id,
      input_snapshot: inputSnapshot,
      output_snapshot: output,
      hub_status: 'pending',
      created_by: ctx.userId,
    })
    .select(
      'id, request_id, profile_id, input_snapshot, output_snapshot, hub_status, quotation_id, calculated_at, created_at',
    )
    .single();
  if (error) throw new Error(error.message);
  return mapCalc(data as Record<string, unknown>);
}

export async function listCalculations(opts?: {
  hubStatus?: HubStatus;
  from?: string;
  to?: string;
}): Promise<QuoteCalculation[]> {
  const ctx = await getTenantContext();
  let q = ctx.supabase
    .from('redeco_quote_calculations')
    .select(
      'id, request_id, profile_id, input_snapshot, output_snapshot, hub_status, quotation_id, calculated_at, created_at, customiz_rfq_requests(external_quote_no, attributes)',
    )
    .eq('tenant_id', ctx.tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .is('deleted_at', null)
    .order('calculated_at', { ascending: false })
    .limit(200);

  if (opts?.hubStatus) q = q.eq('hub_status', opts.hubStatus);
  if (opts?.from) q = q.gte('calculated_at', opts.from);
  if (opts?.to) q = q.lte('calculated_at', opts.to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const calc = mapCalc(row);
    const req = row['customiz_rfq_requests'];
    const reqObj = Array.isArray(req) ? req[0] : req;
    if (reqObj && typeof reqObj === 'object') {
      const r = reqObj as Record<string, unknown>;
      calc.request = {
        external_quote_no: String(r['external_quote_no'] ?? ''),
        attributes: asRecord(r['attributes']) as Record<string, string>,
      };
    }
    return calc;
  });
}

export async function getCalculation(id: string): Promise<QuoteCalculation | null> {
  const ctx = await getTenantContext();
  const { data, error } = await ctx.supabase
    .from('redeco_quote_calculations')
    .select(
      'id, request_id, profile_id, input_snapshot, output_snapshot, hub_status, quotation_id, calculated_at, created_at',
    )
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapCalc(data as Record<string, unknown>);
}

export async function setHubStatus(
  id: string,
  hubStatus: HubStatus,
): Promise<void> {
  const ctx = await getTenantContext();
  const { error } = await ctx.supabase
    .from('redeco_quote_calculations')
    .update({ hub_status: hubStatus })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
}

const PLACEHOLDER_SKU = 'REDECO-PLACEHOLDER';

async function ensurePlaceholderProduct(
  tenantId: string,
  supabase: SupabaseClient,
): Promise<{ id: string; name: string }> {
  const { data: existing } = await supabase
    .from('products')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('sku', PLACEHOLDER_SKU)
    .maybeSingle();
  if (existing) {
    return {
      id: String((existing as { id: string }).id),
      name: String((existing as { name: string }).name),
    };
  }
  const { data, error } = await supabase
    .from('products')
    .insert({
      tenant_id: tenantId,
      sku: PLACEHOLDER_SKU,
      name: 'REDECO — dòng tạm (hub)',
      uom: 'cái',
      base_price: 0,
      is_active: true,
      attributes: { source: REDECO_PACK_KEY },
    })
    .select('id, name')
    .single();
  if (error) throw new Error(`Tạo SP placeholder: ${error.message}`);
  return {
    id: String((data as { id: string }).id),
    name: String((data as { name: string }).name),
  };
}

async function resolveOrCreateCustomer(
  tenantId: string,
  supabase: SupabaseClient,
  attrs: Record<string, string>,
): Promise<string> {
  const name =
    (attrs['end_customer'] || attrs['buyer_contact'] || 'Khách REDECO').trim();
  const { data: found } = await supabase
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', name)
    .limit(1)
    .maybeSingle();
  if (found) return String((found as { id: string }).id);

  const code = await nextCode(supabase, 'customers', 'KH');
  const { data, error } = await supabase
    .from('customers')
    .insert({
      tenant_id: tenantId,
      code,
      name,
      kind: 'b2b',
      attributes: { source: REDECO_PACK_KEY },
    })
    .select('id')
    .single();
  if (error) throw new Error(`Tạo khách: ${error.message}`);
  return String((data as { id: string }).id);
}

/** Tạo hoặc cập nhật BG Optimake từ calculation; sửa dòng trong hub. */
export async function syncQuotationFromCalculation(input: {
  calculationId: string;
  unitPrice?: number;
  qty?: number;
  notes?: string;
}): Promise<{ quotationId: string; code: string }> {
  const ctx = await getTenantContext();
  const calc = await getCalculation(input.calculationId);
  if (!calc) throw new Error('Không tìm thấy lần tính.');

  const request = await getRedecoRfqRequest(calc.request_id);
  if (!request) throw new Error('Đề xuất đã bị xóa.');

  const attrs = request.attributes;
  const product = await ensurePlaceholderProduct(ctx.tenantId, ctx.supabase);
  const customerId = await resolveOrCreateCustomer(
    ctx.tenantId,
    ctx.supabase,
    attrs,
  );

  const qtyRaw = attrs['qty_expected'] ?? '1';
  const qty =
    input.qty ??
    (Number.parseFloat(qtyRaw.replace(/,/g, '')) || 1);
  const unitPrice =
    input.unitPrice ??
    Number(calc.output_snapshot.price || 0) / (qty || 1);
  const discountPct = 0;
  const lineTotal = computeLineTotal({ qty, unitPrice, discountPct });
  const total = computeDocTotal([lineTotal], 0);
  const productName =
    attrs['product_name'] ||
    attrs['model_or_end_code'] ||
    product.name;
  const notes =
    input.notes ??
    `Hub REDECO · ${request.external_quote_no}\n${calc.output_snapshot.note}`;

  if (calc.quotation_id) {
    const { data: q } = await ctx.supabase
      .from('quotations')
      .select('id, code, status')
      .eq('id', calc.quotation_id)
      .maybeSingle();
    const existing = q as { id: string; code: string; status: string } | null;
    if (existing && existing.status === 'draft') {
      await ctx.supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', existing.id)
        .eq('tenant_id', ctx.tenantId);
      await ctx.supabase.from('quotation_items').insert({
        tenant_id: ctx.tenantId,
        quotation_id: existing.id,
        product_id: product.id,
        product_name: productName,
        qty,
        unit_price: unitPrice,
        discount_pct: discountPct,
        line_total: lineTotal,
        sort_order: 0,
      });
      await ctx.supabase
        .from('quotations')
        .update({
          customer_id: customerId,
          total,
          notes,
          attributes: {
            source: REDECO_PACK_KEY,
            calculation_id: calc.id,
            request_id: request.id,
          },
        })
        .eq('id', existing.id);
      await ctx.supabase
        .from('redeco_quote_calculations')
        .update({ hub_status: 'quoted', quotation_id: existing.id })
        .eq('id', calc.id);
      return { quotationId: existing.id, code: existing.code };
    }
  }

  const code = await nextCode(ctx.supabase, 'quotations', 'BG');
  const { data: created, error } = await ctx.supabase
    .from('quotations')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      customer_id: customerId,
      status: 'draft',
      discount_pct: 0,
      total,
      notes,
      created_by: ctx.userId,
      attributes: {
        source: REDECO_PACK_KEY,
        calculation_id: calc.id,
        request_id: request.id,
      },
    })
    .select('id, code')
    .single();
  if (error) throw new Error(`Tạo BG: ${error.message}`);
  const quotationId = String((created as { id: string }).id);

  const { error: itemErr } = await ctx.supabase.from('quotation_items').insert({
    tenant_id: ctx.tenantId,
    quotation_id: quotationId,
    product_id: product.id,
    product_name: productName,
    qty,
    unit_price: unitPrice,
    discount_pct: discountPct,
    line_total: lineTotal,
    sort_order: 0,
  });
  if (itemErr) {
    await ctx.supabase.from('quotations').delete().eq('id', quotationId);
    throw new Error(`Dòng BG: ${itemErr.message}`);
  }

  await ctx.supabase
    .from('redeco_quote_calculations')
    .update({ hub_status: 'quoted', quotation_id: quotationId })
    .eq('id', calc.id)
    .eq('tenant_id', ctx.tenantId);

  return { quotationId, code: String((created as { code: string }).code) };
}
