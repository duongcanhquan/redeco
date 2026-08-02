'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/services/sales-context';
import {
  importRedecoRfqExcel,
  softDeleteRedecoRfqRequest,
  saveFilterRules,
  reclassifyAllRedeecoRfq,
  createManualRedecoRfqRequest,
  type ImportRedecoRfqResult,
  type ManualRedecoRfqInput,
} from '@/services/customiz/redeco-rfq.service';
import { parseFilterRules } from '@/lib/customiz/redeco-rfq-filter';
import type { HubStatus } from '@/lib/customiz/redeco-hub-status';
import {
  runAndSaveCalculation,
  setHubStatus,
  upsertCalcProfile,
  deleteCalcProfile,
  syncQuotationFromCalculation,
} from '@/services/customiz/redeco-quote.service';

function revalidateHub(basePath: string): void {
  revalidatePath(`${basePath}/sales/redeco`);
  revalidatePath(`${basePath}/sales/customiz/redeco-rfq`);
}

export async function importRedecoRfqAction(
  formData: FormData,
  basePath: string,
): Promise<ActionResult<ImportRedecoRfqResult>> {
  try {
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { ok: false, error: 'Chưa chọn file Excel.' };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importRedecoRfqExcel({ name: file.name, buffer });
    revalidateHub(basePath);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Import thất bại.',
    };
  }
}

export async function deleteRedecoRfqAction(
  id: string,
  basePath: string,
): Promise<ActionResult> {
  try {
    await softDeleteRedecoRfqRequest(id);
    revalidateHub(basePath);
    return { ok: true, data: undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Xóa thất bại.',
    };
  }
}

export async function saveFilterRulesAction(
  rulesJson: string,
  basePath: string,
): Promise<ActionResult> {
  try {
    const parsed: unknown = JSON.parse(rulesJson);
    const rules = parseFilterRules(parsed);
    await saveFilterRules(rules);
    revalidateHub(basePath);
    return { ok: true, data: undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Lưu bộ lọc thất bại.',
    };
  }
}

export async function reclassifyAllAction(
  basePath: string,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const result = await reclassifyAllRedeecoRfq();
    revalidateHub(basePath);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Chạy lại lọc thất bại.',
    };
  }
}

export async function createManualRfqAction(
  input: ManualRedecoRfqInput,
  basePath: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const row = await createManualRedecoRfqRequest(input);
    revalidateHub(basePath);
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Thêm đề xuất thất bại.',
    };
  }
}

export async function runCalcAction(
  requestId: string,
  profileId: string | undefined,
  basePath: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const calc = await runAndSaveCalculation({ requestId, profileId });
    revalidateHub(basePath);
    return { ok: true, data: { id: calc.id } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Tính báo giá thất bại.',
    };
  }
}

export async function setHubStatusAction(
  id: string,
  status: HubStatus,
  basePath: string,
): Promise<ActionResult> {
  try {
    await setHubStatus(id, status);
    revalidateHub(basePath);
    return { ok: true, data: undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Đổi trạng thái thất bại.',
    };
  }
}

export async function upsertProfileAction(
  input: {
    id?: string;
    name: string;
    is_default: boolean;
    default_unit_cost: number;
    markup_pct: number;
  },
  basePath: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await upsertCalcProfile({
      id: input.id,
      name: input.name,
      is_default: input.is_default,
      config: {
        default_unit_cost: input.default_unit_cost,
        markup_pct: input.markup_pct,
      },
    });
    revalidateHub(basePath);
    return { ok: true, data: { id: profile.id } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Lưu profile thất bại.',
    };
  }
}

export async function deleteProfileAction(
  id: string,
  basePath: string,
): Promise<ActionResult> {
  try {
    await deleteCalcProfile(id);
    revalidateHub(basePath);
    return { ok: true, data: undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Xóa profile thất bại.',
    };
  }
}

export async function syncQuotationAction(
  calculationId: string,
  payload: { unitPrice: number; qty: number; notes?: string },
  basePath: string,
): Promise<ActionResult<{ quotationId: string; code: string }>> {
  try {
    const result = await syncQuotationFromCalculation({
      calculationId,
      unitPrice: payload.unitPrice,
      qty: payload.qty,
      notes: payload.notes,
    });
    revalidateHub(basePath);
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Đồng bộ báo giá thất bại.',
    };
  }
}
