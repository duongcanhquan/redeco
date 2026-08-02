import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseRedecoRfqWorkbook,
  REDECO_RFQ_PACK_KEY,
  tagRowsForDuplicates,
} from '@/lib/customiz/redeco-rfq-parse';
import { getTenantContext } from '@/services/sales.service';

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
  includeDeleted?: boolean;
}): Promise<RedecoRfqRequest[]> {
  const ctx = await getTenantContext();
  let q = ctx.supabase
    .from('customiz_rfq_requests')
    .select(
      'id, pack_key, batch_id, external_quote_no, tags, attributes, source_row, created_at, deleted_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .eq('pack_key', REDECO_RFQ_PACK_KEY)
    .order('created_at', { ascending: false })
    .limit(500);

  if (!opts?.includeDeleted) {
    q = q.is('deleted_at', null);
  }
  if (opts?.onlyDuplicates) {
    q = q.contains('tags', ['trung']);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRequest(r as Record<string, unknown>));
}

export async function getRedecoRfqRequest(id: string): Promise<RedecoRfqRequest | null> {
  const ctx = await getTenantContext();
  const { data, error } = await ctx.supabase
    .from('customiz_rfq_requests')
    .select(
      'id, pack_key, batch_id, external_quote_no, tags, attributes, source_row, created_at, deleted_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .eq('pack_key', REDECO_RFQ_PACK_KEY)
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
    .eq('pack_key', REDECO_RFQ_PACK_KEY)
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
    .eq('pack_key', REDECO_RFQ_PACK_KEY)
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
      .eq('pack_key', REDECO_RFQ_PACK_KEY)
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

  const { data: batch, error: batchErr } = await client
    .from('customiz_rfq_batches')
    .insert({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_RFQ_PACK_KEY,
      file_name: file.name,
      row_total: parsed.rows.length + parsed.errors.length,
      row_imported: tagged.length,
      row_duplicate: duplicateCount,
      row_error: parsed.errors.length,
      created_by: ctx.userId,
      attributes: { parse_errors: parsed.errors.slice(0, 50) },
    })
    .select('id')
    .single();
  if (batchErr) throw new Error(batchErr.message);
  const batchId = String((batch as { id: string }).id);

  if (tagged.length > 0) {
    const insertRows = tagged.map((t) => ({
      tenant_id: ctx.tenantId,
      pack_key: REDECO_RFQ_PACK_KEY,
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
    imported: tagged.length,
    duplicate: duplicateCount,
    errors: parsed.errors,
  };
}
