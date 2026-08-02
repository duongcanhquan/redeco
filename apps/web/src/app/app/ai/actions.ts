'use server';

import { askInventoryAssistant } from '@/services/inventory-ai.service';
import { askProductionAssistant } from '@/services/production-ai.service';
import { askHrAssistant } from '@/services/hr-ai.service';
import { askEquipmentAssistant } from '@/services/maintenance-ai.service';
import type { ActionResult } from '@/services/sales-context';

export async function askInventoryAiAction(
  question: string,
): Promise<ActionResult<{ answer: string }>> {
  return askInventoryAssistant(question);
}

export async function askProductionAiAction(
  question: string,
): Promise<ActionResult<{ answer: string }>> {
  return askProductionAssistant(question);
}

export async function askHrAiAction(
  question: string,
): Promise<ActionResult<{ answer: string }>> {
  return askHrAssistant(question);
}

export async function askEquipmentAiAction(
  question: string,
): Promise<ActionResult<{ answer: string }>> {
  return askEquipmentAssistant(question);
}
