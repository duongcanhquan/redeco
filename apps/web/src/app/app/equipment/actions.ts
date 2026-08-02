'use server';

import type {
  EquipmentCriticality,
  EquipmentKind,
  EquipmentStatus,
  MaintenanceOrderKind,
  MaintenanceOrderStatus,
  WorkRequestPriority,
} from '@optimake/domain';
import { revalidateWorkspace } from '@/lib/revalidate-workspace';
import {
  convertWorkRequestToOrder,
  createEquipment,
  createMaintenanceOrder,
  createMaintenancePlan,
  createMeter,
  createWorkRequest,
  addMaintenancePartLine,
  cancelMaintenancePartLine,
  issueMaintenanceParts,
  recordMeterReading,
  runPreventiveMaintenance,
  setPlanActive,
  setTaskDone,
  setWorkRequestStatus,
  transitionMaintenanceOrder,
  type ActionResult,
} from '@/services/maintenance.service';

async function revalidateEam(extra: string[] = []): Promise<void> {
  await revalidateWorkspace([
    '/app/equipment',
    '/app/equipment/assets',
    '/app/equipment/requests',
    '/app/equipment/orders',
    '/app/equipment/plans',
    '/app/equipment/meters',
    '/app/equipment/oee',
    ...extra,
  ]);
}

export async function createEquipmentAction(input: {
  code: string;
  name: string;
  kind: EquipmentKind;
  status?: EquipmentStatus;
  criticality?: EquipmentCriticality;
  parentId?: string;
  locationText?: string;
  installedOn?: string;
}): Promise<ActionResult<{ id: string }>> {
  const result = await createEquipment(input);
  if (result.ok) await revalidateEam();
  return result;
}

export async function createWorkRequestAction(input: {
  equipmentId: string;
  title: string;
  description?: string;
  priority?: WorkRequestPriority;
}): Promise<ActionResult<{ id: string }>> {
  const result = await createWorkRequest(input);
  if (result.ok) await revalidateEam();
  return result;
}

export async function convertWorkRequestAction(
  workRequestId: string,
): Promise<ActionResult<{ orderId: string }>> {
  const result = await convertWorkRequestToOrder(workRequestId);
  if (result.ok) await revalidateEam([`/app/equipment/orders/${result.data.orderId}`]);
  return result;
}

export async function createMaintenanceOrderAction(input: {
  equipmentId: string;
  title: string;
  kind?: MaintenanceOrderKind;
  priority?: WorkRequestPriority;
  scheduledOn?: string;
  taskTitles?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const result = await createMaintenanceOrder(input);
  if (result.ok) await revalidateEam();
  return result;
}

export async function transitionOrderAction(input: {
  orderId: string;
  to: MaintenanceOrderStatus;
  downtimeMinutes?: number;
}): Promise<ActionResult> {
  const result = await transitionMaintenanceOrder(input);
  if (result.ok) {
    await revalidateEam([`/app/equipment/orders/${input.orderId}`]);
  }
  return result;
}

export async function setTaskDoneAction(input: {
  taskId: string;
  isDone: boolean;
  orderId: string;
}): Promise<ActionResult> {
  const result = await setTaskDone(input);
  if (result.ok) await revalidateEam([`/app/equipment/orders/${input.orderId}`]);
  return result;
}

export async function createPlanAction(input: {
  equipmentId: string;
  code: string;
  name: string;
  intervalDays: number;
  nextDueOn: string;
  checklist?: string[];
}): Promise<ActionResult<{ id: string }>> {
  const result = await createMaintenancePlan(input);
  if (result.ok) await revalidateEam();
  return result;
}

export async function setPlanActiveAction(input: {
  planId: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const result = await setPlanActive(input);
  if (result.ok) await revalidateEam();
  return result;
}

export async function runPmAction(): Promise<
  ActionResult<{ created: number; orderCodes: string[] }>
> {
  const result = await runPreventiveMaintenance();
  if (result.ok) await revalidateEam();
  return result;
}

export async function addPartLineAction(input: {
  orderId: string;
  itemId: string;
  warehouseId: string;
  qtyPlanned: number;
}): Promise<ActionResult<{ id: string }>> {
  const result = await addMaintenancePartLine(input);
  if (result.ok) await revalidateEam([`/app/equipment/orders/${input.orderId}`]);
  return result;
}

export async function cancelPartLineAction(input: {
  partLineId: string;
  orderId: string;
}): Promise<ActionResult> {
  const result = await cancelMaintenancePartLine(input.partLineId);
  if (result.ok) await revalidateEam([`/app/equipment/orders/${input.orderId}`]);
  return result;
}

export async function issuePartsAction(
  orderId: string,
): Promise<ActionResult<{ txnCodes: string[] }>> {
  const result = await issueMaintenanceParts(orderId);
  if (result.ok) {
    await revalidateEam([`/app/equipment/orders/${orderId}`]);
    await revalidateWorkspace([
      '/app/inventory',
      '/app/inventory/stock',
      '/app/inventory/transactions',
    ]);
  }
  return result;
}

export async function setWorkRequestStatusAction(input: {
  workRequestId: string;
  status: 'approved' | 'rejected' | 'cancelled';
}): Promise<ActionResult> {
  const result = await setWorkRequestStatus(input);
  if (result.ok) await revalidateEam();
  return result;
}

export async function createMeterAction(input: {
  equipmentId: string;
  code: string;
  name: string;
  unit?: string;
  thresholdWarn?: number | null;
  thresholdCritical?: number | null;
}): Promise<ActionResult<{ id: string }>> {
  const result = await createMeter(input);
  if (result.ok) await revalidateEam();
  return result;
}

export async function recordMeterReadingAction(input: {
  meterId: string;
  value: number;
  source?: 'manual' | 'iot_stub';
}): Promise<
  ActionResult<{ alertLevel: string; workRequestId: string | null }>
> {
  const result = await recordMeterReading(input);
  if (result.ok) await revalidateEam();
  return result;
}
