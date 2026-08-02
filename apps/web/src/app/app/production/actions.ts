'use server';

import { revalidatePath } from 'next/cache';
import {
  activateBom,
  createBom,
  createWorkOrder,
  issueMaterialsForWorkOrder,
  receiveFinishedGoods,
  releaseWorkOrder,
  type ActionResult,
} from '@/services/production.service';

function revalidateProduction(): void {
  revalidatePath('/app/production');
  revalidatePath('/app/production/boms');
  revalidatePath('/app/production/work-orders');
}

export async function createBomAction(input: {
  code: string;
  finishedItemId: string;
  lines: { componentItemId: string; qtyPer: number; scrapPct?: number }[];
}): Promise<ActionResult<{ id: string }>> {
  const result = await createBom(input);
  if (result.ok) revalidateProduction();
  return result;
}

export async function activateBomAction(bomId: string): Promise<ActionResult> {
  const result = await activateBom(bomId);
  if (result.ok) revalidateProduction();
  return result;
}

export async function createWorkOrderAction(input: {
  finishedItemId: string;
  qtyPlanned: number;
  salesOrderId?: string | null;
  plannedEnd?: string | null;
}): Promise<ActionResult<{ id: string; code: string }>> {
  const result = await createWorkOrder(input);
  if (result.ok) revalidateProduction();
  return result;
}

export async function releaseWorkOrderAction(workOrderId: string): Promise<ActionResult> {
  const result = await releaseWorkOrder(workOrderId);
  if (result.ok) revalidateProduction();
  return result;
}

export async function issueMaterialsAction(
  workOrderId: string,
): Promise<ActionResult<{ code: string } | undefined>> {
  const result = await issueMaterialsForWorkOrder(workOrderId);
  if (result.ok) {
    revalidateProduction();
    revalidatePath('/app/inventory');
  }
  return result;
}

export async function receiveFgAction(
  workOrderId: string,
  qty: number,
): Promise<ActionResult<{ code: string } | undefined>> {
  const result = await receiveFinishedGoods(workOrderId, qty);
  if (result.ok) {
    revalidateProduction();
    revalidatePath('/app/inventory');
    revalidatePath('/app/inventory/stock');
  }
  return result;
}
