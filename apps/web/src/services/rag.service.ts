import 'server-only';
import {
  RAG_MODULE_KEYS,
  chunkText,
  estimateTokens,
  formatRagContextBlock,
  isRagModuleKey,
  rankByCosine,
  type RagModuleKey,
  type RankedChunk,
} from '@optimake/domain';
import { callTenantEmbeddings } from '@/services/ai-llm.service';
import {
  getTenantContext,
  requireManager,
  type ActionResult,
} from '@/services/sales-context';
import { getAiRuntimeSecret } from '@/services/tenant-settings.service';

const COLLECTION_LABELS: Record<RagModuleKey, string> = {
  chung: 'Chung (mọi phân hệ)',
  'kinh-doanh': 'Kinh doanh',
  kho: 'Kho',
  'san-xuat': 'Sản xuất',
  'nhan-su': 'Nhân sự',
  'thiet-bi': 'Thiết bị / Bảo trì',
};

export type RagDocumentStatus =
  | 'draft'
  | 'indexing'
  | 'ready'
  | 'failed'
  | 'archived';

export interface RagCollectionRow {
  id: string;
  module_key: RagModuleKey;
  name: string;
  description: string;
  is_active: boolean;
}

export interface RagDocumentRow {
  id: string;
  collection_id: string;
  title: string;
  source_type: string;
  status: RagDocumentStatus;
  body_text: string;
  error_message: string | null;
  chunk_count: number;
  indexed_at: string | null;
  created_at: string;
  module_key?: RagModuleKey;
  collection_name?: string;
}

function parseEmbedding(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
  }
  if (typeof raw === 'string') {
    try {
      return parseEmbedding(JSON.parse(raw) as unknown);
    } catch {
      return [];
    }
  }
  return [];
}

/** Tạo đủ 6 collection mặc định (idempotent). */
export async function ensureRagCollections(): Promise<RagCollectionRow[]> {
  const ctx = await getTenantContext();
  requireManager(ctx);

  const { data: existing, error } = await ctx.supabase
    .from('rag_collections')
    .select('id, module_key, name, description, is_active')
    .eq('tenant_id', ctx.tenantId);
  if (error) throw new Error(error.message);

  const byKey = new Map(
    ((existing ?? []) as RagCollectionRow[]).map((r) => [r.module_key, r]),
  );

  for (const key of RAG_MODULE_KEYS) {
    if (byKey.has(key)) continue;
    const { data, error: insErr } = await ctx.supabase
      .from('rag_collections')
      .insert({
        tenant_id: ctx.tenantId,
        module_key: key,
        name: COLLECTION_LABELS[key],
        description: `Tri thức ${COLLECTION_LABELS[key]}`,
        is_active: true,
      })
      .select('id, module_key, name, description, is_active')
      .single();
    if (insErr) {
      // race / unique — đọc lại
      const { data: again } = await ctx.supabase
        .from('rag_collections')
        .select('id, module_key, name, description, is_active')
        .eq('tenant_id', ctx.tenantId)
        .eq('module_key', key)
        .maybeSingle();
      if (again) byKey.set(key, again as RagCollectionRow);
      else throw new Error(insErr.message);
    } else if (data) {
      byKey.set(key, data as RagCollectionRow);
    }
  }

  return RAG_MODULE_KEYS.map((k) => byKey.get(k)).filter(
    (r): r is RagCollectionRow => Boolean(r),
  );
}

export async function listRagDocuments(
  moduleKey?: RagModuleKey,
): Promise<RagDocumentRow[]> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  await ensureRagCollections();

  let q = ctx.supabase
    .from('rag_documents')
    .select(
      'id, collection_id, title, source_type, status, body_text, error_message, chunk_count, indexed_at, created_at, rag_collections(module_key, name)',
    )
    .eq('tenant_id', ctx.tenantId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(100);

  if (moduleKey) {
    const collections = await ensureRagCollections();
    const col = collections.find((c) => c.module_key === moduleKey);
    if (!col) return [];
    q = q.eq('collection_id', col.id);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  type Nested = {
    module_key?: string;
    name?: string;
  };

  return ((data ?? []) as Array<
    RagDocumentRow & { rag_collections?: Nested | Nested[] | null }
  >).map((row) => {
    const nested = Array.isArray(row.rag_collections)
      ? row.rag_collections[0]
      : row.rag_collections;
    const mk = nested?.module_key;
    return {
      id: row.id,
      collection_id: row.collection_id,
      title: row.title,
      source_type: row.source_type,
      status: row.status,
      body_text: row.body_text,
      error_message: row.error_message,
      chunk_count: row.chunk_count,
      indexed_at: row.indexed_at,
      created_at: row.created_at,
      module_key: mk && isRagModuleKey(mk) ? mk : undefined,
      collection_name: nested?.name,
    };
  });
}

export async function createRagDocument(input: {
  moduleKey: string;
  title: string;
  bodyText: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (!isRagModuleKey(input.moduleKey)) {
    return { ok: false, error: 'Phân hệ tri thức không hợp lệ.' };
  }
  const body = input.bodyText.trim();
  const title =
    input.title.trim() || body.split(/\n/)[0]?.trim().slice(0, 80) || 'Tài liệu không tên';
  if (title.length < 2) return { ok: false, error: 'Tiêu đề tối thiểu 2 ký tự.' };
  if (title.length > 200) return { ok: false, error: 'Tiêu đề tối đa 200 ký tự.' };
  if (body.length < 20) return { ok: false, error: 'Nội dung tối thiểu 20 ký tự.' };
  if (body.length > 100_000) return { ok: false, error: 'Nội dung tối đa 100.000 ký tự.' };

  try {
    const collections = await ensureRagCollections();
    const col = collections.find((c) => c.module_key === input.moduleKey);
    if (!col) return { ok: false, error: 'Không tìm thấy collection.' };

    const { data, error } = await ctx.supabase
      .from('rag_documents')
      .insert({
        tenant_id: ctx.tenantId,
        collection_id: col.id,
        title,
        source_type: 'paste',
        status: 'draft',
        body_text: body,
        created_by: ctx.userId,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Tạo tài liệu thất bại.' };
  }
}

export async function ingestRagDocument(
  documentId: string,
): Promise<ActionResult<{ chunkCount: number }>> {
  const ctx = await getTenantContext();
  requireManager(ctx);

  const runtime = await getAiRuntimeSecret();
  if (!runtime) {
    return { ok: false, error: 'Chưa cấu hình API AI — lưu key trước khi index.' };
  }

  const { data: doc, error: docErr } = await ctx.supabase
    .from('rag_documents')
    .select('id, tenant_id, collection_id, title, body_text, status')
    .eq('id', documentId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  if (docErr) return { ok: false, error: docErr.message };
  if (!doc) return { ok: false, error: 'Không tìm thấy tài liệu.' };

  const body = String((doc as { body_text: string }).body_text ?? '').trim();
  if (body.length < 20) return { ok: false, error: 'Nội dung quá ngắn để index.' };

  const pieces = chunkText(
    body,
    runtime.rag.chunkSize,
    runtime.rag.chunkOverlap,
  );
  if (pieces.length === 0) return { ok: false, error: 'Không tạo được đoạn (chunk).' };
  if (pieces.length > 200) {
    return { ok: false, error: 'Quá nhiều đoạn (>200). Rút ngắn hoặc tăng chunk size.' };
  }

  await ctx.supabase
    .from('rag_documents')
    .update({ status: 'indexing', error_message: null })
    .eq('id', documentId)
    .eq('tenant_id', ctx.tenantId);

  try {
    await ctx.supabase.from('rag_chunks').delete().eq('document_id', documentId);

    const embeddings: number[][] = [];
    const batchSize = 16;
    for (let i = 0; i < pieces.length; i += batchSize) {
      const batch = pieces.slice(i, i + batchSize);
      const vectors = await callTenantEmbeddings({
        provider: runtime.provider,
        model: runtime.rag.embeddingModel,
        apiKey: runtime.apiKey,
        baseUrl: runtime.baseUrl,
        texts: batch,
      });
      embeddings.push(...vectors);
    }

    const collectionId = (doc as { collection_id: string }).collection_id;
    const rows = pieces.map((content, idx) => ({
      tenant_id: ctx.tenantId,
      document_id: documentId,
      collection_id: collectionId,
      chunk_index: idx,
      content,
      token_est: estimateTokens(content),
      embedding: embeddings[idx] ?? [],
    }));

    const { error: insErr } = await ctx.supabase.from('rag_chunks').insert(rows);
    if (insErr) throw new Error(insErr.message);

    const { error: upErr } = await ctx.supabase
      .from('rag_documents')
      .update({
        status: 'ready',
        chunk_count: pieces.length,
        indexed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', documentId)
      .eq('tenant_id', ctx.tenantId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, data: { chunkCount: pieces.length } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Index thất bại.';
    await ctx.supabase
      .from('rag_documents')
      .update({ status: 'failed', error_message: msg.slice(0, 500) })
      .eq('id', documentId)
      .eq('tenant_id', ctx.tenantId);
    return { ok: false, error: msg };
  }
}

export async function archiveRagDocument(documentId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  try {
    const { error } = await ctx.supabase
      .from('rag_documents')
      .update({ status: 'archived' })
      .eq('id', documentId)
      .eq('tenant_id', ctx.tenantId);
    if (error) throw new Error(error.message);
    await ctx.supabase.from('rag_chunks').delete().eq('document_id', documentId);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Xóa thất bại.' };
  }
}

/**
 * Retrieve chunks cho ask* — không require manager.
 * Trả về block text sẵn đưa vào prompt (hoặc rỗng nếu tắt/lỗi nhẹ).
 */
export async function retrieveRagContextBlock(
  moduleKey: RagModuleKey,
  query: string,
): Promise<string> {
  const runtime = await getAiRuntimeSecret();
  if (!runtime?.rag.ragEnabled) return '';

  const q = query.trim();
  if (q.length < 2) return '';

  try {
    const ctx = await getTenantContext();
    const keys: RagModuleKey[] =
      moduleKey === 'chung' ? ['chung'] : [moduleKey, 'chung'];

    const { data: collections, error: colErr } = await ctx.supabase
      .from('rag_collections')
      .select('id, module_key')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .in('module_key', keys);
    if (colErr || !collections?.length) return '';

    const collectionIds = (collections as { id: string }[]).map((c) => c.id);

    const { data: docs, error: docErr } = await ctx.supabase
      .from('rag_documents')
      .select('id, title')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'ready')
      .in('collection_id', collectionIds);
    if (docErr || !docs?.length) return '';

    const docIds = (docs as { id: string; title: string }[]).map((d) => d.id);
    const titleById = new Map(
      (docs as { id: string; title: string }[]).map((d) => [d.id, d.title]),
    );

    const { data: chunks, error: chErr } = await ctx.supabase
      .from('rag_chunks')
      .select('id, document_id, content, embedding')
      .eq('tenant_id', ctx.tenantId)
      .in('document_id', docIds)
      .limit(800);
    if (chErr || !chunks?.length) return '';

    const [queryVec] = await callTenantEmbeddings({
      provider: runtime.provider,
      model: runtime.rag.embeddingModel,
      apiKey: runtime.apiKey,
      baseUrl: runtime.baseUrl,
      texts: [q],
    });
    if (!queryVec) return '';

    const candidates = (
      chunks as {
        id: string;
        document_id: string;
        content: string;
        embedding: unknown;
      }[]
    )
      .map((c) => ({
        id: c.id,
        documentId: c.document_id,
        documentTitle: titleById.get(c.document_id) ?? 'Tài liệu',
        content: c.content,
        embedding: parseEmbedding(c.embedding),
      }))
      .filter((c) => c.embedding.length > 0);

    const ranked: RankedChunk[] = rankByCosine(
      queryVec,
      candidates,
      runtime.rag.topK,
    );
    return formatRagContextBlock(ranked);
  } catch {
    // Không chặn ask khi RAG lỗi — fallback snapshot only
    return '';
  }
}

export async function buildUserPromptWithRag(
  moduleKey: RagModuleKey,
  question: string,
  baseUser: string,
): Promise<string> {
  const block = await retrieveRagContextBlock(moduleKey, question);
  if (!block) return baseUser;
  return `${baseUser}\n\n${block}`;
}

export { COLLECTION_LABELS };
