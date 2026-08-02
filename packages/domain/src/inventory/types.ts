/** Domain types — Inventory (Kho) Phase K1 */

export type WarehouseKind = 'raw' | 'wip' | 'fg' | 'spare' | 'other';
export type ItemType = 'raw' | 'wip' | 'fg' | 'consumable' | 'tool';
export type InventoryTxnType = 'receipt' | 'issue' | 'transfer' | 'adjustment';
export type InventoryTxnStatus = 'draft' | 'posted' | 'void';
export type ReservationStatus = 'active' | 'released' | 'consumed' | 'cancelled';

/** ATP = on_hand − reserved */
export function computeAtp(qtyOnHand: number, qtyReserved: number): number {
  return Math.max(0, round3(qtyOnHand) - round3(qtyReserved));
}

export function canIssue(atp: number, qty: number): boolean {
  return qty > 0 && round3(atp) >= round3(qty);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
