'use server';

import { revalidatePath } from 'next/cache';
import type { WarehouseKind } from '@optimake/domain';
import {
  createWarehouse,
  ensureInventoryDefaults,
  postInventoryTxn,
  type ActionResult,
} from '@/services/inventory.service';

export async function ensureInventoryDefaultsAction(): Promise<ActionResult> {
  const result = await ensureInventoryDefaults();
  if (result.ok) {
    revalidatePath('/app/inventory');
    revalidatePath('/app/inventory/stock');
  }
  return result;
}

export async function createWarehouseAction(input: {
  code: string;
  name: string;
  kind: WarehouseKind;
}): Promise<ActionResult<{ id: string }>> {
  const result = await createWarehouse(input);
  if (result.ok) revalidatePath('/app/inventory/warehouses');
  return result;
}

export async function postInventoryTxnAction(input: {
  warehouseId: string;
  txnType: 'receipt' | 'issue';
  notes: string;
  lines: { itemId: string; qty: number }[];
}): Promise<ActionResult<{ id: string; code: string }>> {
  const result = await postInventoryTxn(input);
  if (result.ok) {
    revalidatePath('/app/inventory');
    revalidatePath('/app/inventory/stock');
    revalidatePath('/app/inventory/transactions');
    revalidatePath('/app/sales/products');
  }
  return result;
}
