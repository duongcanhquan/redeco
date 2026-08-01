'use server';

import { revalidatePath } from 'next/cache';
import {
  createContract,
  setContractStatus,
  type ActionResult,
  type ContractStatusAction,
  type CreateContractInput,
} from '@/services/platform-admin.service';

function revalidateContractViews(): void {
  revalidatePath('/platform/contracts');
  revalidatePath('/platform');
}

export async function createContractAction(
  input: CreateContractInput,
): Promise<ActionResult<{ contractId: string }>> {
  try {
    const result = await createContract(input);
    if (result.ok) revalidateContractViews();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function setContractStatusAction(
  contractId: string,
  status: ContractStatusAction,
): Promise<ActionResult> {
  try {
    const result = await setContractStatus(contractId, status);
    if (result.ok) revalidateContractViews();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
