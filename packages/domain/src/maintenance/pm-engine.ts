/**
 * Preventive Maintenance engine — chọn plan đến hạn và tính next_due sau khi sinh lệnh.
 */

export interface PmPlanInput {
  readonly id: string;
  readonly equipmentId: string;
  readonly code: string;
  readonly name: string;
  readonly intervalDays: number;
  readonly nextDueOn: string;
  readonly isActive: boolean;
  readonly checklist: readonly string[];
}

export interface PmGenerateCandidate {
  readonly planId: string;
  readonly equipmentId: string;
  readonly dueOn: string;
  readonly nextDueAfterGenerate: string;
  readonly taskTitles: readonly string[];
  readonly planCode: string;
  readonly planName: string;
  /** Thứ tự catch-up (0 = lần đầu trong run). */
  readonly catchUpIndex: number;
}

function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Ngày không hợp lệ: ${isoDate}`);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Sinh danh sách ứng viên lệnh PM đến hạn (kèm catch-up nếu trễ nhiều kỳ).
 * @param maxCatchUpPerPlan giới hạn số lệnh / plan / lần chạy (tránh runaway).
 */
export function selectDueMaintenancePlans(
  plans: readonly PmPlanInput[],
  asOf: string,
  maxCatchUpPerPlan = 6,
): PmGenerateCandidate[] {
  const out: PmGenerateCandidate[] = [];
  for (const plan of plans) {
    if (!plan.isActive || plan.intervalDays <= 0) continue;
    let next = plan.nextDueOn;
    let idx = 0;
    while (next <= asOf && idx < maxCatchUpPerPlan) {
      const advanced = addCalendarDays(next, plan.intervalDays);
      out.push({
        planId: plan.id,
        equipmentId: plan.equipmentId,
        dueOn: next,
        nextDueAfterGenerate: advanced,
        taskTitles: plan.checklist.filter((t) => t.trim().length > 0),
        planCode: plan.code,
        planName: plan.name,
        catchUpIndex: idx,
      });
      next = advanced;
      idx += 1;
    }
  }
  return out;
}

export { addCalendarDays as addMaintenanceCalendarDays };
