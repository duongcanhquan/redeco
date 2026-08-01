'use server';

import { revalidatePath } from 'next/cache';
import { shipDelivery, type ActionResult } from '@/services/sales.service';

export async function shipDeliveryAction(deliveryId: string): Promise<ActionResult> {
  const result = await shipDelivery(deliveryId);
  if (result.ok) {
    revalidatePath('/app/sales/deliveries');
    revalidatePath('/app/sales/orders');
    revalidatePath('/app/sales/products');
  }
  return result;
}
