'use server';

import type { WarehouseKind } from '@optimake/domain';
import { revalidateWorkspace } from '@/lib/revalidate-workspace';
import {
  createWarehouse,
  ensureInventoryDefaultsAsManager,
  postInventoryTxn,
  type ActionResult,
} from '@/services/inventory.service';

export async function ensureInventoryDefaultsAction(): Promise<ActionResult> {
  const result = await ensureInventoryDefaultsAsManager();
  if (result.ok) {
    await revalidateWorkspace([
      '/app/inventory',
      '/app/inventory/stock',
      '/app/inventory/warehouses',
    ]);
  }
  return result;
}

export async function createWarehouseAction(input: {
  code: string;
  name: string;
  kind: WarehouseKind;
}): Promise<ActionResult<{ id: string }>> {
  const result = await createWarehouse(input);
  if (result.ok) await revalidateWorkspace(['/app/inventory/warehouses', '/app/inventory']);
  return result;
}

export async function postInventoryTxnAction(input: {
  warehouseId: string;
  txnType: 'receipt' | 'issue';
  notes: string;
  lines: {
    itemId: string;
    qty: number;
    locationId?: string;
    lotCode?: string;
    expiryDate?: string;
  }[];
}): Promise<ActionResult<{ id: string; code: string }>> {
  const { getTenantContext, managerDeniedMessage } = await import(
    '@/services/sales-context'
  );
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  const { data: hasKho } = await ctx.supabase.rpc('has_module_access', {
    p_key: 'kho',
  });
  if (hasKho !== true) {
    return {
      ok: false,
      error: 'Chỉ tài khoản có module Kho được tạo phiếu từ màn Kho.',
    };
  }
  const result = await postInventoryTxn(input);
  if (result.ok) {
    await revalidateWorkspace([
      '/app/inventory',
      '/app/inventory/stock',
      '/app/inventory/transactions',
      '/app/inventory/locations',
      '/app/sales/products',
    ]);
  }
  return result;
}

export async function updateInventoryItemLotPolicyAction(input: {
  itemId: string;
  trackLot: boolean;
  pickStrategy: 'fifo' | 'fefo' | 'lifo';
}): Promise<ActionResult> {
  const { updateInventoryItemLotPolicy } = await import('@/services/inventory.service');
  const result = await updateInventoryItemLotPolicy(input);
  if (result.ok) {
    await revalidateWorkspace(['/app/inventory/warehouses', '/app/inventory/transactions']);
  }
  return result;
}
