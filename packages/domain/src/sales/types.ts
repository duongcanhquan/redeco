/** Module Kinh doanh — Core Phase 1+2. Spec: docs/superpowers/specs/2026-08-02-sales-core-phase2-design.md */

export type CustomerKind = 'b2b' | 'b2c' | 'dai-ly';
export type CustomerStatus = 'active' | 'inactive';

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
export type SalesOrderStatus = 'draft' | 'confirmed' | 'delivering' | 'completed' | 'cancelled';
export type DeliveryStatus = 'pending' | 'shipped';
export type InvoiceStatus = 'unpaid' | 'paid';

export type ApprovalActionStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type AssigneeRole = 'owner' | 'admin' | 'member';
export type CtpStatus = 'not_needed' | 'unavailable' | 'estimated';

export interface LineItemInput {
  qty: number;
  unitPrice: number;
  discountPct: number;
}

/** Thành tiền 1 dòng = qty × đơn giá × (1 − chiết khấu dòng). */
export function computeLineTotal(item: LineItemInput): number {
  return round2(item.qty * item.unitPrice * (1 - item.discountPct / 100));
}

/** Tổng chứng từ = Σ line_total × (1 − chiết khấu tổng). */
export function computeDocTotal(lineTotals: number[], docDiscountPct: number): number {
  const subtotal = lineTotals.reduce((s, t) => s + t, 0);
  return round2(subtotal * (1 - docDiscountPct / 100));
}

export interface CreditCheckResult {
  passed: boolean;
  outstanding: number;
  orderTotal: number;
  creditLimit: number | null;
}

/** Invariant SalesOrder: (công nợ + giá trị đơn) ≤ hạn mức. Limit null = không giới hạn. */
export function checkCredit(
  outstanding: number,
  orderTotal: number,
  creditLimit: number | null,
): CreditCheckResult {
  const passed = creditLimit === null || outstanding + orderTotal <= creditLimit;
  return { passed, outstanding, orderTotal, creditLimit };
}

/** Chuyển trạng thái hợp lệ của báo giá. */
export const QUOTATION_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ['sent'],
  sent: ['approved', 'rejected'],
  approved: ['converted'],
  rejected: [],
  converted: [],
};

export function canTransitionQuotation(from: QuotationStatus, to: QuotationStatus): boolean {
  return QUOTATION_TRANSITIONS[from].includes(to);
}

// ---------- Discount rules ----------

export interface DiscountRuleConditions {
  customer_kinds?: CustomerKind[];
  customer_ids?: string[];
  min_doc_total?: number;
  product_ids?: string[];
}

export interface DiscountRuleMatchInput {
  customerId: string;
  customerKind: CustomerKind;
  /** Subtotal trước chiết khấu chứng từ. */
  docSubtotal: number;
  productIds: string[];
  /** YYYY-MM-DD (local/tenant date). */
  onDate: string;
}

export interface DiscountRuleCandidate {
  id: string;
  priority: number;
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
  discountPct: number;
  conditions: DiscountRuleConditions;
}

export function ruleMatchesDate(
  onDate: string,
  validFrom: string | null,
  validUntil: string | null,
): boolean {
  if (validFrom && onDate < validFrom) return false;
  if (validUntil && onDate > validUntil) return false;
  return true;
}

export function discountRuleMatches(
  rule: DiscountRuleCandidate,
  input: DiscountRuleMatchInput,
): boolean {
  if (!rule.isActive) return false;
  if (!ruleMatchesDate(input.onDate, rule.validFrom, rule.validUntil)) return false;
  const c = rule.conditions ?? {};
  if (c.customer_kinds?.length && !c.customer_kinds.includes(input.customerKind)) return false;
  if (c.customer_ids?.length && !c.customer_ids.includes(input.customerId)) return false;
  if (typeof c.min_doc_total === 'number' && input.docSubtotal < c.min_doc_total) return false;
  if (c.product_ids?.length) {
    const set = new Set(input.productIds);
    if (!c.product_ids.some((id) => set.has(id))) return false;
  }
  return true;
}

/** Rule thắng = priority nhỏ hơn (1 > 100); hòa thì discount_pct cao hơn. */
export function pickWinningDiscountRule(
  rules: DiscountRuleCandidate[],
  input: DiscountRuleMatchInput,
): DiscountRuleCandidate | null {
  const matched = rules.filter((r) => discountRuleMatches(r, input));
  if (matched.length === 0) return null;
  matched.sort((a, b) => a.priority - b.priority || b.discountPct - a.discountPct);
  return matched[0] ?? null;
}

// ---------- Approval N cấp ----------

export interface ApprovalStepDef {
  stepOrder: number;
  name: string;
  minAmount: number;
  assigneeRole: AssigneeRole | null;
  assigneeUserId: string | null;
}

/** Bước bắt buộc với tổng chứng từ: luôn gồm min_amount=0; các bước khác khi total ≥ ngưỡng. */
export function requiredApprovalSteps(
  steps: ApprovalStepDef[],
  docTotal: number,
): ApprovalStepDef[] {
  return steps
    .filter((s) => s.minAmount === 0 || docTotal >= s.minAmount)
    .sort((a, b) => a.stepOrder - b.stepOrder);
}

export function canActOnApprovalStep(params: {
  actorUserId: string;
  actorRole: AssigneeRole;
  step: ApprovalStepDef;
  /** Owner được override mọi bước. */
  allowOwnerOverride?: boolean;
}): boolean {
  const allowOwner = params.allowOwnerOverride !== false;
  if (allowOwner && params.actorRole === 'owner') return true;
  if (params.step.assigneeUserId && params.step.assigneeUserId === params.actorUserId) return true;
  if (params.step.assigneeRole && params.step.assigneeRole === params.actorRole) return true;
  return false;
}

// ---------- ATP / CTP ----------

export interface PromiseLineInput {
  productId: string;
  qty: number;
  atpQty: number;
  /** Lệnh SX đang chạy (released/in_progress). */
  openWoQty: number;
  /** Ngày kết thúc LSX sớm nhất che shortfall (YYYY-MM-DD), optional. */
  openWoEarliestEnd?: string | null;
  /** Lead time CTP từ tenant_settings.production khi vẫn thiếu sau open WO. */
  leadTimeDays?: number | null;
  /** Ngày gốc tính lead (mặc định hôm nay UTC). */
  asOfDate?: string | null;
}

export interface PromiseLineResult {
  productId: string;
  qty: number;
  atpQty: number;
  openWoQty: number;
  shortfall: number;
  ctpStatus: CtpStatus;
  earliestDate: string | null;
  reason: string | null;
}

function addUtcDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.floor(days)));
  return d.toISOString().slice(0, 10);
}

export function buildPromiseCheck(lines: PromiseLineInput[]): {
  lines: PromiseLineResult[];
  allCovered: boolean;
} {
  const results = lines.map((l): PromiseLineResult => {
    const available = l.atpQty + l.openWoQty;
    const shortfall = Math.max(0, round3(l.qty - available));
    if (shortfall <= 0) {
      const coveredByWo = l.qty > l.atpQty && l.openWoQty > 0;
      return {
        productId: l.productId,
        qty: l.qty,
        atpQty: l.atpQty,
        openWoQty: l.openWoQty,
        shortfall: 0,
        ctpStatus: coveredByWo ? 'estimated' : 'not_needed',
        earliestDate: coveredByWo ? (l.openWoEarliestEnd ?? null) : null,
        reason: coveredByWo ? 'Phủ bởi lệnh SX đang mở.' : null,
      };
    }
    const lead = l.leadTimeDays;
    if (typeof lead === 'number' && lead >= 0) {
      const asOf = l.asOfDate ?? new Date().toISOString().slice(0, 10);
      return {
        productId: l.productId,
        qty: l.qty,
        atpQty: l.atpQty,
        openWoQty: l.openWoQty,
        shortfall,
        ctpStatus: 'estimated',
        earliestDate: addUtcDays(asOf, lead),
        reason: `Ước CTP theo lead time ${lead} ngày (cài đặt công ty).`,
      };
    }
    return {
      productId: l.productId,
      qty: l.qty,
      atpQty: l.atpQty,
      openWoQty: l.openWoQty,
      shortfall,
      ctpStatus: 'unavailable',
      earliestDate: null,
      reason: 'Thiếu hàng và chưa có cấu hình lead time / LSX mở để tính CTP.',
    };
  });
  return { lines: results, allCovered: results.every((r) => r.shortfall <= 0) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
