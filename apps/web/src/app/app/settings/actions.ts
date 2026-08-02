'use server';

import type { ActionResult } from '@/services/sales-context';
import type { SalesSetupFlags } from '@/lib/sales-setup';
import { revalidateWorkspace } from '@/lib/revalidate-workspace';
import {
  applySalesCompanyProfile,
  applySalesPreset,
  deleteSalesCompanyProfile,
  saveAccountingSettings,
  saveAiSettings,
  saveIntegrationsSettings,
  saveInventorySettings,
  saveNotificationsSettings,
  saveProductionSettings,
  saveSalesCompanyProfile,
  saveSalesDocsSettings,
  saveSalesSettings,
  saveSalesSetupFlags,
  saveSalesStockPolicy,
  type AccountingSettings,
  type AiSettingsInput,
  type IntegrationsSettings,
  type InventorySettings,
  type NotificationsSettings,
  type ProductionSettings,
  type SalesSettings,
} from '@/services/tenant-settings.service';

async function revalidateSettings(): Promise<void> {
  await revalidateWorkspace(['/app/settings', '/app/ai', '/app/sales', '/app/inventory', '/app/hr', '/app/production']);
}

export async function saveAiSettingsAction(input: AiSettingsInput): Promise<ActionResult> {
  try {
    const result = await saveAiSettings(input);
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function testAiConnectionAction(): Promise<
  ActionResult<{ reply: string }>
> {
  try {
    const { testAiConnection } = await import('@/services/tenant-settings.service');
    return await testAiConnection();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveSalesSettingsAction(input: SalesSettings): Promise<ActionResult> {
  try {
    const result = await saveSalesSettings(input);
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveSalesDocsSettingsAction(input: SalesSettings): Promise<ActionResult> {
  try {
    const result = await saveSalesDocsSettings(input);
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveSalesStockPolicyAction(input: {
  allowConfirmWithoutAtp: boolean;
  reserveOnSoConfirm: boolean;
  requireFullReserveOnConfirm: boolean;
}): Promise<ActionResult> {
  try {
    const result = await saveSalesStockPolicy(input);
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveSalesSetupFlagsAction(
  patch: Partial<SalesSetupFlags>,
): Promise<ActionResult> {
  try {
    const result = await saveSalesSetupFlags(patch);
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function applySalesPresetAction(presetId: string): Promise<ActionResult> {
  try {
    const result = await applySalesPreset(presetId);
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function applySalesCompanyProfileAction(
  profileId: string,
): Promise<ActionResult> {
  try {
    const result = await applySalesCompanyProfile(profileId);
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function saveSalesCompanyProfileAction(input: {
  id?: string;
  name: string;
  description: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await saveSalesCompanyProfile(input);
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}

export async function deleteSalesCompanyProfileAction(
  profileId: string,
): Promise<ActionResult> {
  try {
    const result = await deleteSalesCompanyProfile(profileId);
    if (result.ok) await revalidateSettings();
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
    if (result.ok) await revalidateSettings();
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
    if (result.ok) await revalidateSettings();
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
    if (result.ok) await revalidateSettings();
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
    if (result.ok) await revalidateSettings();
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
    if (result.ok) await revalidateSettings();
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định.' };
  }
}
