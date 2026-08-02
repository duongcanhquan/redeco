'use server';

import { revalidatePath } from 'next/cache';
import {
  deleteDiscountRule,
  upsertDiscountRule,
  type DiscountRuleInput,
} from '@/services/sales-config.service';
import type { ActionResult } from '@/services/sales-context';

export async function upsertDiscountRuleAction(
  input: DiscountRuleInput & { id?: string },
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await upsertDiscountRule(input);
    if (result.ok) revalidatePath('/app/sales/discount-rules');
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function deleteDiscountRuleAction(id: string): Promise<ActionResult> {
  try {
    const result = await deleteDiscountRule(id);
    if (result.ok) revalidatePath('/app/sales/discount-rules');
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
