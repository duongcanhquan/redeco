'use server';

import { revalidatePath } from 'next/cache';
import { markInvoicePaid, type ActionResult } from '@/services/sales.service';

export async function markInvoicePaidAction(invoiceId: string): Promise<ActionResult> {
  const result = await markInvoicePaid(invoiceId);
  if (result.ok) {
    revalidatePath('/app/sales/invoices');
    revalidatePath('/app/sales/customers');
    revalidatePath('/app');
  }
  return result;
}
