export type EquipmentKind = 'plant' | 'line' | 'machine' | 'tool' | 'other';

export type EquipmentStatus = 'draft' | 'active' | 'idle' | 'down' | 'retired';

export type EquipmentCriticality = 'low' | 'medium' | 'high' | 'critical';

export type WorkRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export type WorkRequestStatus =
  | 'open'
  | 'approved'
  | 'rejected'
  | 'converted'
  | 'cancelled';

export type MaintenanceOrderKind = 'corrective' | 'preventive' | 'inspection';

export type MaintenanceOrderStatus =
  | 'draft'
  | 'released'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

const MO_TRANSITIONS: Record<MaintenanceOrderStatus, readonly MaintenanceOrderStatus[]> = {
  draft: ['released', 'cancelled'],
  released: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransitionMaintenanceOrder(
  from: MaintenanceOrderStatus,
  to: MaintenanceOrderStatus,
): boolean {
  return (MO_TRANSITIONS[from] ?? []).includes(to);
}

/** WR có thể chuyển thành lệnh bảo trì. */
export function canConvertWorkRequest(status: WorkRequestStatus): boolean {
  return status === 'open' || status === 'approved';
}

export function canCompleteMaintenanceOrder(tasksDone: boolean, allowIncomplete: boolean): boolean {
  return tasksDone || allowIncomplete;
}
