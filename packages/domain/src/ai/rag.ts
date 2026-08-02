/** Ước lượng token thô (~4 ký tự / token cho tiếng Việt/Latin mix). */
export function estimateTokens(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return Math.max(1, Math.ceil(t.length / 4));
}

/**
 * Chia văn bản thành chunk theo kích thước ký tự gần với token budget.
 * overlapChars = overlapTokens * 4.
 */
export function chunkText(
  body: string,
  chunkTokens: number,
  overlapTokens: number,
): string[] {
  const cleaned = body.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];
  const size = Math.max(200, chunkTokens * 4);
  const overlap = Math.max(0, Math.min(size - 50, overlapTokens * 4));
  if (cleaned.length <= size) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(cleaned.length, start + size);
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        slice.lastIndexOf('. '),
        slice.lastIndexOf('。'),
      );
      if (breakAt > size * 0.4) {
        end = start + breakAt + 1;
      }
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= cleaned.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface RankedChunk {
  readonly content: string;
  readonly documentTitle: string;
  readonly score: number;
  readonly documentId: string;
  readonly chunkId: string;
}

export function rankByCosine(
  queryEmbedding: readonly number[],
  candidates: readonly {
    id: string;
    documentId: string;
    documentTitle: string;
    content: string;
    embedding: readonly number[];
  }[],
  topK: number,
  minScore = 0.12,
): RankedChunk[] {
  const scored = candidates
    .map((c) => ({
      content: c.content,
      documentTitle: c.documentTitle,
      documentId: c.documentId,
      chunkId: c.id,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, topK));
}

export function formatRagContextBlock(chunks: readonly RankedChunk[]): string {
  if (chunks.length === 0) return '';
  const lines = chunks.map(
    (c, i) =>
      `[${i + 1}] (${c.documentTitle}, score=${c.score.toFixed(3)})\n${c.content}`,
  );
  return `Ngữ cảnh tri thức (RAG) — chỉ dùng khi liên quan; trích dẫn tiêu đề tài liệu:\n${lines.join('\n\n')}`;
}

export const RAG_MODULE_KEYS = [
  'chung',
  'kinh-doanh',
  'kho',
  'san-xuat',
  'nhan-su',
  'thiet-bi',
] as const;

export type RagModuleKey = (typeof RAG_MODULE_KEYS)[number];

export function isRagModuleKey(v: string): v is RagModuleKey {
  return (RAG_MODULE_KEYS as readonly string[]).includes(v);
}
