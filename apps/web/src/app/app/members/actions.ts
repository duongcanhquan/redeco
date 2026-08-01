'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/services/sales.service';
import {
  createMember,
  removeMember,
  resetMemberPassword,
  updateMember,
  type CreateMemberInput,
  type UpdateMemberInput,
} from '@/services/tenant-admin.service';

function wrap<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return fn().catch((e: unknown) => ({
    ok: false as const,
    error: e instanceof Error ? e.message : 'Lỗi không xác định.',
  }));
}

export async function createMemberAction(
  input: CreateMemberInput,
): Promise<ActionResult<{ userId: string; email: string }>> {
  const result = await wrap(() => createMember(input));
  if (result.ok) revalidatePath('/app/members');
  return result;
}

export async function updateMemberAction(
  userId: string,
  input: UpdateMemberInput,
): Promise<ActionResult> {
  const result = await wrap(() => updateMember(userId, input));
  if (result.ok) revalidatePath('/app/members');
  return result;
}

export async function resetMemberPasswordAction(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  return wrap(() => resetMemberPassword(userId, newPassword));
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  const result = await wrap(() => removeMember(userId));
  if (result.ok) revalidatePath('/app/members');
  return result;
}
