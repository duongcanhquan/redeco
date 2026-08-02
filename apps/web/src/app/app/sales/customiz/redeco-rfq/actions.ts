'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/services/sales-context';
import {
  importRedecoRfqExcel,
  softDeleteRedecoRfqRequest,
  saveFilterRules,
  reclassifyAllRedeecoRfq,
  type ImportRedecoRfqResult,
} from '@/services/customiz/redeco-rfq.service';
import { parseFilterRules } from '@/lib/customiz/redeco-rfq-filter';

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
