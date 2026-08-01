'use server';

import { revalidatePath } from 'next/cache';
import {
  createCustomer,
  updateCustomer,
  type ActionResult,
  type CustomerInput,
} from '@/services/sales.service';
import type { CustomerStatus } from '@optimake/domain';

export async function createCustomerAction(
  input: CustomerInput,
): Promise<ActionResult<{ id: string }>> {
  const result = await createCustomer(input);
  if (result.ok) revalidatePath('/app/sales/customers');
  return result;
}

export async function updateCustomerAction(
  customerId: string,
  input: CustomerInput & { status: CustomerStatus },
): Promise<ActionResult> {
  const result = await updateCustomer(customerId, input);
  if (result.ok) revalidatePath('/app/sales/customers');
  return result;
}
