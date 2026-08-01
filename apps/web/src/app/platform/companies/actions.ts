'use server';

import { revalidatePath } from 'next/cache';
import {
  createCompanyWithAdmin,
  resetCompanyAdminPassword,
  setTenantModules,
  setTenantStatus,
  type ActionResult,
  type CreateCompanyInput,
  type CreateCompanyOutput,
} from '@/services/platform-admin.service';

function revalidateCompanyViews(): void {
  revalidatePath('/platform/companies');
  revalidatePath('/platform');
}

export async function createCompanyAction(
  input: CreateCompanyInput,
): Promise<ActionResult<CreateCompanyOutput>> {
  try {
    const result = await createCompanyWithAdmin(input);
    if (result.ok) revalidateCompanyViews();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function setTenantStatusAction(
  tenantId: string,
  status: 'active' | 'suspended',
): Promise<ActionResult> {
  try {
    const result = await setTenantStatus(tenantId, status);
    if (result.ok) revalidateCompanyViews();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function setTenantModulesAction(
  tenantId: string,
  moduleIds: string[],
): Promise<ActionResult<{ contractCode: string | null }>> {
  try {
    const result = await setTenantModules(tenantId, moduleIds);
    if (result.ok) revalidateCompanyViews();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function resetAdminPasswordAction(
  tenantId: string,
  newPassword: string,
): Promise<ActionResult<{ adminEmail: string }>> {
  try {
    return await resetCompanyAdminPassword(tenantId, newPassword);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
