'use server';

import { revalidatePath } from 'next/cache';
import {
  createModuleNode,
  setModuleActive,
  updateModuleNode,
  type ActionResult,
  type CreateModuleNodeInput,
} from '@/services/platform-admin.service';

function revalidateModuleViews(): void {
  revalidatePath('/platform/modules');
  revalidatePath('/platform');
}

export async function createModuleAction(
  input: CreateModuleNodeInput,
): Promise<ActionResult<{ moduleId: string }>> {
  try {
    const result = await createModuleNode(input);
    if (result.ok) revalidateModuleViews();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function updateModuleAction(
  moduleId: string,
  patch: { name: string; description: string },
): Promise<ActionResult> {
  try {
    const result = await updateModuleNode(moduleId, patch);
    if (result.ok) revalidateModuleViews();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function setModuleActiveAction(
  moduleId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    const result = await setModuleActive(moduleId, isActive);
    if (result.ok) revalidateModuleViews();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
