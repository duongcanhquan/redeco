'use server';

import { revalidatePath } from 'next/cache';
import {
  cancelSalesOrder,
  confirmSalesOrder,
  createDeliveryNote,
  createInvoice,
  createSalesOrder,
  type ActionResult,
  type ConfirmOrderOutput,
  type SalesOrderInput,
} from '@/services/sales.service';

function revalidateSales(): void {
  revalidatePath('/app/sales/orders');
  revalidatePath('/app/sales/deliveries');
  revalidatePath('/app/sales/invoices');
}

export async function createSalesOrderAction(
  input: SalesOrderInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const result = await createSalesOrder(input);
  if (result.ok) revalidatePath('/app/sales/orders');
  return result;
}

export async function confirmSalesOrderAction(
  orderId: string,
): Promise<ActionResult<ConfirmOrderOutput>> {
  const result = await confirmSalesOrder(orderId);
  if (result.ok) revalidatePath('/app/sales/orders');
  return result;
}

export async function cancelSalesOrderAction(orderId: string): Promise<ActionResult> {
  const result = await cancelSalesOrder(orderId);
  if (result.ok) revalidatePath('/app/sales/orders');
  return result;
}

export async function createDeliveryFromOrderAction(
  orderId: string,
): Promise<ActionResult<{ id: string; code: string }>> {
  const result = await createDeliveryNote(orderId);
  if (result.ok) revalidateSales();
  return result;
}

export async function createInvoiceFromOrderAction(
  orderId: string,
): Promise<ActionResult<{ id: string; code: string }>> {
  const result = await createInvoice(orderId);
  if (result.ok) {
    const { processPendingAccountingOutbox } = await import(
      '@/services/accounting.service'
    );
    await processPendingAccountingOutbox();
    revalidateSales();
  }
  return result;
}

export async function createWorkOrdersFromOrderAction(
  orderId: string,
): Promise<
  ActionResult<{ created: { code: string; productName: string; qty: number }[] }>
> {
  const { createWorkOrdersFromSalesOrder } = await import(
    '@/services/production.service'
  );
  const result = await createWorkOrdersFromSalesOrder(orderId);
  if (result.ok) {
    revalidatePath('/app/sales/orders');
    revalidatePath(`/app/sales/orders/${orderId}`);
    revalidatePath('/app/production/work-orders');
    revalidatePath('/app/production');
  }
  return result;
}
