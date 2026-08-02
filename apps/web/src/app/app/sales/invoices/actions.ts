'use server';

import { revalidatePath } from 'next/cache';
import { processPendingAccountingOutbox } from '@/services/accounting.service';
import { markInvoicePaid, type ActionResult } from '@/services/sales.service';

export async function markInvoicePaidAction(invoiceId: string): Promise<ActionResult> {
  const result = await markInvoicePaid(invoiceId);
  if (result.ok) {
    // ADR-011: fail-soft — không có ke-toan / tắt AR thì no-op
    await processPendingAccountingOutbox();
    revalidatePath('/app/sales/invoices');
    revalidatePath('/app/sales/customers');
    revalidatePath('/app/accounting');
    revalidatePath('/app');
  }
  return result;
}
