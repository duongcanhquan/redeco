'use server';

import { revalidatePath } from 'next/cache';
import {
  createProduct,
  updateProduct,
  type ActionResult,
  type ProductInput,
} from '@/services/sales.service';

export async function createProductAction(
  input: ProductInput & { initialStock: number },
): Promise<ActionResult<{ id: string }>> {
  const result = await createProduct(input);
  if (result.ok) revalidatePath('/app/sales/products');
  return result;
}

export async function updateProductAction(
  productId: string,
  input: ProductInput & { isActive: boolean; stock: number },
): Promise<ActionResult> {
  const result = await updateProduct(productId, input);
  if (result.ok) revalidatePath('/app/sales/products');
  return result;
}
