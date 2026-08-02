import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseRedecoRfqWorkbook,
  REDECO_PACK_KEY,
  REDECO_PACK_KEYS,
  tagRowsForDuplicates,
  ATTR_KEYS,
  type RedecoRfqAttrKey,
} from '@/lib/customiz/redeco-rfq-parse';
import {
  classifyWithRules,
  mergeClassificationTags,
  parseFilterRules,
  type FilterRule,
} from '@/lib/customiz/redeco-rfq-filter';
import { getTenantContext, requireManager } from '@/services/sales.service';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;

export type RedecoRfqRequest = {
  id: string;
  pack_key: string;
  batch_id: string | null;
  external_quote_no: string;
  tags: string[];
  attributes: Record<string, string>;
  source_row: number | null;
  created_at: string;
  deleted_at: string | null;
};

export type RedecoRfqBatch = {
  id: string;
  file_name: string;
  row_total: number;
  row_imported: number;
  row_duplicate: number;
  row_error: number;
  created_at: string;
};

export type ImportRedecoRfqResult = {
  batchId: string;
  imported: number;
  duplicate: number;
  errors: { sourceRow: number; message: string }[];
};

function asAttrMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = v === null || v === undefined ? '' : String(v);
  }
  return out;
}

function mapRequest(row: Record<string, unknown>): RedecoRfqRequest {
  const tagsRaw = row['tags'];
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.filter((t): t is string => typeof t === 'string')
    : [];
  return {
    id: String(row['id']),
    pack_key: String(row['pack_key']),
    batch_id: row['batch_id'] === null || row['batch_id'] === undefined ? null : String(row['batch_id']),
    external_quote_no: String(row['external_quote_no']),
    tags,
    attributes: asAttrMap(row['attributes']),
    source_row:
      typeof row['source_row'] === 'number'
        ? row['source_row']
        : row['source_row'] === null || row['source_row'] === undefined
          ? null
          : Number(row['source_row']),
    created_at: String(row['created_at']),
    deleted_at:
      row['deleted_at'] === null || row['deleted_at'] === undefined
        ? null
        : String(row['deleted_at']),
  };
}

export async function listRedecoRfqRequests(opts?: {
  onlyDuplicates?: boolean;
  classification?: string;
  includeDeleted?: boolean;
  /** Tìm số BG / khách / SP (lọc sau query). */
  q?: string;
  /** ISO date YYYY-MM-DD inclusive start */
  from?: string;
  /** ISO date YYYY-MM-DD inclusive end */
  to?: string;
  /** Giới hạn dòng (mặc định 100 — tối ưu hub). */
  limit?: number;
}): Promise<RedecoRfqRequest[]> {
  const ctx = await getTenantContext();
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
  let q = ctx.supabase
    .from('customiz_rfq_requests')
    .select(
      'id, pack_key, batch_id, external_quote_no, tags, attributes, source_row, created_at, deleted_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!opts?.includeDeleted) {
    q = q.is('deleted_at', null);
  }
  if (opts?.onlyDuplicates) {
    q = q.contains('tags', ['trung']);
  }
  if (opts?.classification) {
    q = q.contains('tags', [opts.classification]);
  }
  if (opts?.from) {
    q = q.gte('created_at', `${opts.from}T00:00:00.000Z`);
  }
  if (opts?.to) {
    q = q.lte('created_at', `${opts.to}T23:59:59.999Z`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));

  const needle = opts?.q?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((r) => {
      const blob = [
        r.external_quote_no,
        r.attributes.end_customer,
        r.attributes.product_name,
        r.attributes.buyer_contact,
        r.attributes.system_item_code,
        r.attributes.customer_item_code,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(needle);
    });
  }

  return rows;
}

/** Danh sách gọn cho dropdown tab Tính (ít cột, limit thấp). */
export async function listRedecoRfqChoices(limit = 80): Promise<
  {
    id: string;
    external_quote_no: string;
    end_customer: string;
    product_name: string;
    qty_expected: string;
    uom: string;
  }[]
> {
  const ctx = await getTenantContext();
  const { data, error } = await ctx.supabase
    .from('customiz_rfq_requests')
    .select('id, external_quote_no, attributes')
    .eq('tenant_id', ctx.tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  if (error) throw new Error(error.message);
  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const attrs = asAttrMap(row['attributes']);
    return {
      id: String(row['id']),
      external_quote_no: String(row['external_quote_no'] ?? ''),
      end_customer: attrs['end_customer'] ?? '',
      product_name: attrs['product_name'] ?? '',
      qty_expected: attrs['qty_expected'] ?? '',
      uom: attrs['uom'] ?? '',
    };
  });
}

export async function getRedecoRfqRequest(id: string): Promise<RedecoRfqRequest | null> {
  const ctx = await getTenantContext();
  const { data, error } = await ctx.supabase
    .from('customiz_rfq_requests')
    .select(
      'id, pack_key, batch_id, external_quote_no, tags, attributes, source_row, created_at, deleted_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRequest(data as Record<string, unknown>);
}

export async function listDuplicatesForQuoteNo(
  quoteNo: string,
  excludeId?: string,
): Promise<RedecoRfqRequest[]> {
  const ctx = await getTenantContext();
  let q = ctx.supabase
    .from('customiz_rfq_requests')
    .select(
      'id, pack_key, batch_id, external_quote_no, tags, attributes, source_row, created_at, deleted_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .eq('external_quote_no', quoteNo)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));
}

export async function softDeleteRedecoRfqRequest(id: string): Promise<void> {
  const ctx = await getTenantContext();
  const { error } = await ctx.supabase
    .from('customiz_rfq_requests')
    .update({ deleted_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
}

export async function importRedecoRfqExcel(
  file: { name: string; buffer: Buffer },
  supabase?: SupabaseClient,
): Promise<ImportRedecoRfqResult> {
  if (file.buffer.byteLength > MAX_BYTES) {
    throw new Error('File vượt quá 5MB.');
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.xls') && !lower.endsWith('.xlsx')) {
    throw new Error('Chỉ chấp nhận file .xls hoặc .xlsx.');
  }

  const ctx = await getTenantContext();
  const client = supabase ?? ctx.supabase;
  const parsed = parseRedecoRfqWorkbook(file.buffer);

  if (parsed.rows.length > MAX_ROWS) {
    throw new Error(`Vượt quá ${MAX_ROWS} dòng dữ liệu.`);
  }

  const quoteNos = [...new Set(parsed.rows.map((r) => r.externalQuoteNo))];
  const existing = new Set<string>();
  if (quoteNos.length > 0) {
    const { data: existingRows, error: exErr } = await client
      .from('customiz_rfq_requests')
      .select('external_quote_no')
      .eq('tenant_id', ctx.tenantId)
      .in('pack_key', [...REDECO_PACK_KEYS])
      .is('deleted_at', null)
      .in('external_quote_no', quoteNos);
    if (exErr) throw new Error(exErr.message);
    for (const r of existingRows ?? []) {
      const n = (r as { external_quote_no?: string }).external_quote_no;
      if (typeof n === 'string') existing.add(n);
    }
  }

  const tagged = tagRowsForDuplicates(
    parsed.rows,
    parsed.inBatchDuplicates,
    existing,
  );
  const duplicateCount = tagged.filter((t) => t.tags.includes('trung')).length;

  const rules = await loadActiveFilterRules(ctx.tenantId, client);
  const classified = tagged.map((t) => {
    const tag = classifyWithRules(
      { externalQuoteNo: t.externalQuoteNo, attributes: t.attributes },
      rules,
    );
    return {
      ...t,
      tags: mergeClassificationTags(t.tags, tag),
    };
  });

  const { data: batch, error: batchErr } = await client
    .from('customiz_rfq_batches')
    .insert({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_PACK_KEY,
      file_name: file.name,
      row_total: parsed.rows.length + parsed.errors.length,
      row_imported: classified.length,
      row_duplicate: duplicateCount,
      row_error: parsed.errors.length,
      created_by: ctx.userId,
      attributes: { parse_errors: parsed.errors.slice(0, 50) },
    })
    .select('id')
    .single();
  if (batchErr) throw new Error(batchErr.message);
  const batchId = String((batch as { id: string }).id);

  if (classified.length > 0) {
    const insertRows = classified.map((t) => ({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_PACK_KEY,
      batch_id: batchId,
      external_quote_no: t.externalQuoteNo,
      tags: t.tags,
      attributes: t.attributes,
      source_row: t.sourceRow,
    }));
    const { error: insErr } = await client.from('customiz_rfq_requests').insert(insertRows);
    if (insErr) throw new Error(insErr.message);
  }

  return {
    batchId,
    imported: classified.length,
    duplicate: duplicateCount,
    errors: parsed.errors,
  };
}

async function loadActiveFilterRules(
  tenantId: string,
  client: SupabaseClient,
): Promise<FilterRule[]> {
  const { data, error } = await client
    .from('customiz_rfq_filter_profiles')
    .select('rules')
    .eq('tenant_id', tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return [];
  return parseFilterRules((data as { rules: unknown }).rules);
}

export type FilterProfile = {
  id: string;
  name: string;
  is_active: boolean;
  rules: FilterRule[];
  updated_at: string;
};

export async function getOrCreateFilterProfile(): Promise<FilterProfile> {
  const ctx = await getTenantContext();
  const { data, error } = await ctx.supabase
    .from('customiz_rfq_filter_profiles')
    .select('id, name, is_active, rules, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .in('pack_key', [...REDECO_PACK_KEYS])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    const row = data as Record<string, unknown>;
    return {
      id: String(row['id']),
      name: String(row['name']),
      is_active: Boolean(row['is_active']),
      rules: parseFilterRules(row['rules']),
      updated_at: String(row['updated_at']),
    };
  }
  const { data: created, error: cErr } = await ctx.supabase
    .from('customiz_rfq_filter_profiles')
    .insert({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_PACK_KEY,
      name: 'Mặc định',
      is_active: true,
      rules: [],
    })
    .select('id, name, is_active, rules, updated_at')
    .single();
  if (cErr) throw new Error(cErr.message);
  const row = created as Record<string, unknown>;
  return {
    id: String(row['id']),
    name: String(row['name']),
    is_active: Boolean(row['is_active']),
    rules: [],
    updated_at: String(row['updated_at']),
  };
}

export async function saveFilterRules(rules: FilterRule[]): Promise<void> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const profile = await getOrCreateFilterProfile();
  const { error } = await ctx.supabase
    .from('customiz_rfq_filter_profiles')
    .update({ rules, is_active: true })
    .eq('id', profile.id)
    .eq('tenant_id', ctx.tenantId);
  if (error) throw new Error(error.message);
}

/** Chạy lại bộ lọc trên toàn bộ yêu cầu còn sống. */
export async function reclassifyAllRedeecoRfq(): Promise<{ updated: number }> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const rules = await loadActiveFilterRules(ctx.tenantId, ctx.supabase);
  const rows = await listRedecoRfqRequests();
  let updated = 0;
  for (const row of rows) {
    const tag = classifyWithRules(
      { externalQuoteNo: row.external_quote_no, attributes: row.attributes },
      rules,
    );
    const next = mergeClassificationTags(row.tags, tag);
    const same =
      next.length === row.tags.length && next.every((t) => row.tags.includes(t));
    if (same) continue;
    const { error } = await ctx.supabase
      .from('customiz_rfq_requests')
      .update({ tags: next })
      .eq('id', row.id)
      .eq('tenant_id', ctx.tenantId);
    if (error) throw new Error(error.message);
    updated += 1;
  }
  return { updated };
}

export type ManualRedecoRfqInput = {
  externalQuoteNo: string;
  attributes: Partial<Record<RedecoRfqAttrKey, string>>;
};

/** Thêm đề xuất bằng tay (không batch). */
export async function createManualRedecoRfqRequest(
  input: ManualRedecoRfqInput,
): Promise<RedecoRfqRequest> {
  const ctx = await getTenantContext();
  const quoteNo = input.externalQuoteNo.trim();
  if (!quoteNo) throw new Error('Nhập số báo giá / mã đề xuất.');

  const attributes: Record<string, string> = {};
  for (const k of ATTR_KEYS) {
    attributes[k] = (input.attributes[k] ?? '').trim();
  }

  const existing = await listDuplicatesForQuoteNo(quoteNo);
  let tags: string[] = existing.length > 0 ? ['trung'] : [];
  const rules = await loadActiveFilterRules(ctx.tenantId, ctx.supabase);
  const cls = classifyWithRules(
    { externalQuoteNo: quoteNo, attributes },
    rules,
  );
  tags = mergeClassificationTags(tags, cls);

  const { data, error } = await ctx.supabase
    .from('customiz_rfq_requests')
    .insert({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_PACK_KEY,
      batch_id: null,
      external_quote_no: quoteNo,
      tags,
      attributes,
      source_row: null,
    })
    .select(
      'id, pack_key, batch_id, external_quote_no, tags, attributes, source_row, created_at, deleted_at',
    )
    .single();
  if (error) throw new Error(error.message);
  return mapRequest(data as Record<string, unknown>);
}

