export type BomStatus = 'draft' | 'active' | 'obsolete';
export type WorkOrderStatus = 'draft' | 'released' | 'in_progress' | 'completed' | 'cancelled';

export function canReleaseWorkOrder(input: {
  bomStatus: BomStatus | null;
  lineCount: number;
  rmCovered: boolean;
  allowReleaseWithoutRm: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.bomStatus || input.bomStatus !== 'active') {
    return { ok: false, reason: 'BOM phải ở trạng thái active.' };
  }
  if (input.lineCount < 1) {
    return { ok: false, reason: 'BOM chưa có dòng NVL.' };
  }
  if (!input.rmCovered && !input.allowReleaseWithoutRm) {
    return {
      ok: false,
      reason: 'Thiếu NVL theo định mức. Bật “Cho phép release khi thiếu NVL” trong Cài đặt → Sản xuất, hoặc nhập NVL.',
    };
  }
  return { ok: true };
}

export function maxReceiptQty(qtyPlanned: number, qtyCompleted: number, overReceiptPct: number): number {
  const cap = qtyPlanned * (1 + Math.max(0, overReceiptPct) / 100);
  return Math.max(0, Math.round((cap - qtyCompleted) * 1000) / 1000);
}

/** Cộng lead time (ngày) vào hôm nay → YYYY-MM-DD UTC date string. */
export function addLeadDays(fromIsoDate: string, leadDays: number): string {
  const d = new Date(`${fromIsoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.floor(leadDays)));
  return d.toISOString().slice(0, 10);
}
