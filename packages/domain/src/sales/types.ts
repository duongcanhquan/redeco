/** Module Kinh doanh — Phase 1 (Order-to-Cash). Blueprint: docs/blueprints/2026-08-01-sales-module-blueprint.md */

export type CustomerKind = 'b2b' | 'b2c' | 'dai-ly';
export type CustomerStatus = 'active' | 'inactive';

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
export type SalesOrderStatus = 'draft' | 'confirmed' | 'delivering' | 'completed' | 'cancelled';
export type DeliveryStatus = 'pending' | 'shipped';
export type InvoiceStatus = 'unpaid' | 'paid';

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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
