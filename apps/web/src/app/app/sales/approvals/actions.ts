'use server';

import { revalidatePath } from 'next/cache';
import {
  saveApprovalWorkflow,
  type SaveWorkflowInput,
} from '@/services/sales-config.service';
import type { ActionResult } from '@/services/sales-context';

export async function saveApprovalWorkflowAction(
  input: SaveWorkflowInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await saveApprovalWorkflow(input);
    if (result.ok) revalidatePath('/app/sales/approvals');
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
