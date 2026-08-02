'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/services/sales-context';
import {
  createWarehouseLocation,
  type LocationKind,
} from '@/services/inventory.service';

export async function createLocationAction(
  input: {
    warehouseId: string;
    parentId?: string;
    code: string;
    name: string;
    kind: LocationKind;
    tags?: string[];
  },
  basePath: string,
): Promise<ActionResult<{ id: string }>> {
  const result = await createWarehouseLocation(input);
  if (result.ok) {
    revalidatePath(`${basePath}/inventory/locations`);
  }
  return result;
}
