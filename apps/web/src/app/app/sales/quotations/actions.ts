'use server';

import { revalidatePath } from 'next/cache';
import type { QuotationStatus } from '@optimake/domain';
import {
  convertQuotationToOrder,
  createQuotation,
  setQuotationStatus,
  type ActionResult,
  type QuotationInput,
} from '@/services/sales.service';

export async function createQuotationAction(
  input: QuotationInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const result = await createQuotation(input);
  if (result.ok) revalidatePath('/app/sales/quotations');
  return result;
}

export async function setQuotationStatusAction(
  quotationId: string,
  to: QuotationStatus,
): Promise<ActionResult> {
  try {
    const result = await setQuotationStatus(quotationId, to);
    if (result.ok) revalidatePath('/app/sales/quotations');
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function convertQuotationAction(
  quotationId: string,
): Promise<ActionResult<{ orderId: string; orderCode: string }>> {
  const result = await convertQuotationToOrder(quotationId);
  if (result.ok) {
    revalidatePath('/app/sales/quotations');
    revalidatePath('/app/sales/orders');
  }
  return result;
}
