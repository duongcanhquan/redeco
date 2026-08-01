'use server';

import { revalidatePath } from 'next/cache';
import {
  updatePlatformSetting,
  type ActionResult,
} from '@/services/platform-admin.service';

export async function updateSettingAction(
  key: string,
  rawJson: string,
): Promise<ActionResult> {
  try {
    const result = await updatePlatformSetting(key, rawJson);
    if (result.ok) revalidatePath('/platform/settings');
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
