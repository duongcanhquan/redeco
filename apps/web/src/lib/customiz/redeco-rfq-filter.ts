/**
 * Bộ lọc phân loại yêu cầu BG REDECO (Customiz Phase 2).
 * Rule: điều kiện AND/OR trên field → tag tiem-nang | can-nhac | khong-tiem-nang.
 */

export const CLASSIFICATION_TAGS = [
  'tiem-nang',
  'can-nhac',
  'khong-tiem-nang',
] as const;

export type ClassificationTag = (typeof CLASSIFICATION_TAGS)[number];

export const CLASSIFICATION_LABELS: Record<ClassificationTag, string> = {
  'tiem-nang': 'Tiềm năng',
  'can-nhac': 'Cần cân nhắc',
  'khong-tiem-nang': 'Không tiềm năng',
};

export const FILTER_OPS = [
  'eq',
  'neq',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'empty',
  'not_empty',
] as const;

export type FilterOp = (typeof FILTER_OPS)[number];

export type FilterCondition = {
  field: string;
  op: FilterOp;
  value?: string;
};

export type FilterRule = {
  id: string;
  name: string;
  enabled: boolean;
  /** Ưu tiên thấp hơn = chạy trước */
  priority: number;
  logic: 'and' | 'or';
  conditions: FilterCondition[];
  thenTag: ClassificationTag;
};

export type FilterEvalInput = {
  externalQuoteNo: string;
  attributes: Record<string, string>;
};

const FIELD_ALIASES: Record<string, (row: FilterEvalInput) => string> = {
  external_quote_no: (r) => r.externalQuoteNo,
  quote_no: (r) => r.externalQuoteNo,
};

export function getFieldValue(row: FilterEvalInput, field: string): string {
  const alias = FIELD_ALIASES[field];
  if (alias) return alias(row);
  return row.attributes[field] ?? '';
}

function toNumber(raw: string): number | null {
  const n = Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

export function evalCondition(row: FilterEvalInput, c: FilterCondition): boolean {
  const left = getFieldValue(row, c.field).trim();
  const right = (c.value ?? '').trim();

  switch (c.op) {
    case 'empty':
      return left.length === 0;
    case 'not_empty':
      return left.length > 0;
    case 'eq':
      return left.toLowerCase() === right.toLowerCase();
    case 'neq':
      return left.toLowerCase() !== right.toLowerCase();
    case 'contains':
      return left.toLowerCase().includes(right.toLowerCase());
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const a = toNumber(left);
      const b = toNumber(right);
      if (a === null || b === null) return false;
      if (c.op === 'gt') return a > b;
      if (c.op === 'gte') return a >= b;
      if (c.op === 'lt') return a < b;
      return a <= b;
    }
    default:
      return false;
  }
}

export function evalRule(row: FilterEvalInput, rule: FilterRule): boolean {
  if (!rule.enabled || rule.conditions.length === 0) return false;
  if (rule.logic === 'or') {
    return rule.conditions.some((c) => evalCondition(row, c));
  }
  return rule.conditions.every((c) => evalCondition(row, c));
}

/**
 * Rule đầu tiên (theo priority tăng dần) khớp → thenTag.
 * Không khớp rule nào → null (không gắn tag phân loại).
 */
export function classifyWithRules(
  row: FilterEvalInput,
  rules: readonly FilterRule[],
): ClassificationTag | null {
  const ordered = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  for (const rule of ordered) {
    if (evalRule(row, rule)) return rule.thenTag;
  }
  return null;
}

/** Giữ tag ngoài bộ phân loại (vd `trung`), thay tag phân loại. */
export function mergeClassificationTags(
  existing: readonly string[],
  classification: ClassificationTag | null,
): string[] {
  const kept = existing.filter(
    (t) => !(CLASSIFICATION_TAGS as readonly string[]).includes(t),
  );
  if (classification) kept.push(classification);
  return [...new Set(kept)];
}

export function parseFilterRules(raw: unknown): FilterRule[] {
  if (!Array.isArray(raw)) return [];
  const out: FilterRule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const thenTag = o['thenTag'];
    if (
      thenTag !== 'tiem-nang' &&
      thenTag !== 'can-nhac' &&
      thenTag !== 'khong-tiem-nang'
    ) {
      continue;
    }
    const logic = o['logic'] === 'or' ? 'or' : 'and';
    const conditionsRaw = Array.isArray(o['conditions']) ? o['conditions'] : [];
    const conditions: FilterCondition[] = [];
    for (const c of conditionsRaw) {
      if (!c || typeof c !== 'object') continue;
      const cc = c as Record<string, unknown>;
      const op = cc['op'];
      if (typeof op !== 'string' || !(FILTER_OPS as readonly string[]).includes(op)) {
        continue;
      }
      const field = typeof cc['field'] === 'string' ? cc['field'] : '';
      if (!field) continue;
      conditions.push({
        field,
        op: op as FilterOp,
        value: typeof cc['value'] === 'string' ? cc['value'] : '',
      });
    }
    out.push({
      id: typeof o['id'] === 'string' ? o['id'] : crypto.randomUUID(),
      name: typeof o['name'] === 'string' ? o['name'] : 'Quy tắc',
      enabled: o['enabled'] !== false,
      priority: typeof o['priority'] === 'number' ? o['priority'] : 100,
      logic,
      conditions,
      thenTag,
    });
  }
  return out;
}
