/**
 * Allocate xuất kho FIFO / FEFO / LIFO từ danh sách quant.
 */

export type PickStrategy = 'fifo' | 'fefo' | 'lifo';

export type QuantCandidate = {
  locationId: string;
  lotId: string | null;
  qty: number;
  receivedAt: string | null;
  expiryDate: string | null;
};

export type AllocationSlice = {
  locationId: string;
  lotId: string | null;
  qty: number;
};

export function sortQuantsForStrategy(
  quants: readonly QuantCandidate[],
  strategy: PickStrategy,
): QuantCandidate[] {
  const copy = [...quants].filter((q) => q.qty > 0);
  copy.sort((a, b) => {
    if (strategy === 'fefo') {
      const ae = a.expiryDate ?? '9999-12-31';
      const be = b.expiryDate ?? '9999-12-31';
      if (ae !== be) return ae < be ? -1 : 1;
      const ar = a.receivedAt ?? '';
      const br = b.receivedAt ?? '';
      return ar < br ? -1 : ar > br ? 1 : 0;
    }
    if (strategy === 'lifo') {
      const ar = a.receivedAt ?? '';
      const br = b.receivedAt ?? '';
      return ar > br ? -1 : ar < br ? 1 : 0;
    }
    // fifo
    const ar = a.receivedAt ?? '';
    const br = b.receivedAt ?? '';
    return ar < br ? -1 : ar > br ? 1 : 0;
  });
  return copy;
}

/** Chia qty cần xuất thành các slice theo chiến lược. null nếu không đủ. */
export function allocatePickQty(
  quants: readonly QuantCandidate[],
  qtyNeeded: number,
  strategy: PickStrategy,
): AllocationSlice[] | null {
  if (!(qtyNeeded > 0)) return null;
  const ordered = sortQuantsForStrategy(quants, strategy);
  const slices: AllocationSlice[] = [];
  let remaining = qtyNeeded;
  for (const q of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(q.qty, remaining);
    if (take <= 0) continue;
    slices.push({ locationId: q.locationId, lotId: q.lotId, qty: take });
    remaining -= take;
  }
  if (remaining > 1e-9) return null;
  return slices;
}
