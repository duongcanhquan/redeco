'use server';

import {
  askSalesAssistant,
  reviewSalesOrder,
  reviewSalesQuotation,
} from '@/services/sales-ai.service';
import type { ActionResult } from '@/services/sales-context';

export async function askSalesAiAction(
  question: string,
  basePath: string,
): Promise<ActionResult<{ answer: string }>> {
  return askSalesAssistant(question, basePath);
}

export async function reviewQuotationAiAction(
  quotationId: string,
): Promise<ActionResult<{ answer: string }>> {
  return reviewSalesQuotation(quotationId);
}

export async function reviewOrderAiAction(
  orderId: string,
): Promise<ActionResult<{ answer: string }>> {
  return reviewSalesOrder(orderId);
}
