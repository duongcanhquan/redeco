'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/services/sales-context';
import {
  importRedecoRfqExcel,
  softDeleteRedecoRfqRequest,
  type ImportRedecoRfqResult,
} from '@/services/customiz/redeco-rfq.service';

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
    revalidatePath(`${basePath}/sales/customiz/redeco-rfq`);
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
    revalidatePath(`${basePath}/sales/customiz/redeco-rfq`);
    revalidatePath(`${basePath}/sales/customiz/redeco-rfq/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Xóa thất bại.',
    };
  }
}
