'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/services/sales-context';
import {
  saveAccountingSettings,
  saveAiSettings,
  saveIntegrationsSettings,
  saveInventorySettings,
  saveNotificationsSettings,
  saveProductionSettings,
  saveSalesSettings,
  type AccountingSettings,
  type AiSettingsInput,
  type IntegrationsSettings,
  type InventorySettings,
  type NotificationsSettings,
  type ProductionSettings,
  type SalesSettings,
} from '@/services/tenant-settings.service';

function revalidateSettings(): void {
  revalidatePath('/app/settings');
}

export async function saveAiSettingsAction(input: AiSettingsInput): Promise<ActionResult> {
  try {
    const result = await saveAiSettings(input);
    if (result.ok) revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveSalesSettingsAction(input: SalesSettings): Promise<ActionResult> {
  try {
    const result = await saveSalesSettings(input);
    if (result.ok) revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveIntegrationsSettingsAction(
  input: IntegrationsSettings,
): Promise<ActionResult> {
  try {
    const result = await saveIntegrationsSettings(input);
    if (result.ok) revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveNotificationsSettingsAction(
  input: NotificationsSettings,
): Promise<ActionResult> {
  try {
    const result = await saveNotificationsSettings(input);
    if (result.ok) revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveInventorySettingsAction(
  input: InventorySettings,
): Promise<ActionResult> {
  try {
    const result = await saveInventorySettings(input);
    if (result.ok) revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveProductionSettingsAction(
  input: ProductionSettings,
): Promise<ActionResult> {
  try {
    const result = await saveProductionSettings(input);
    if (result.ok) revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveAccountingSettingsAction(
  input: AccountingSettings,
): Promise<ActionResult> {
  try {
    const result = await saveAccountingSettings(input);
    if (result.ok) revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
