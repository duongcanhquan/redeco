'use server';

import { revalidatePath } from 'next/cache';
import {
  createCompanyWithAdmin,
  type ActionResult,
  type CreateCompanyInput,
  type CreateCompanyOutput,
} from '@/services/platform-admin.service';

export async function createCompanyAction(
  input: CreateCompanyInput,
): Promise<ActionResult<CreateCompanyOutput>> {
  try {
    const result = await createCompanyWithAdmin(input);
    if (result.ok) {
      revalidatePath('/platform/companies');
      revalidatePath('/platform');
    }
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
