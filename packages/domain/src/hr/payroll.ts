/** Số ngày nghỉ inclusive (NS3: đếm lịch, không trừ cuối tuần). */
export function countLeaveDays(startsOn: string, endsOn: string): number {
  const a = Date.parse(`${startsOn}T00:00:00.000Z`);
  const b = Date.parse(`${endsOn}T00:00:00.000Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** OT amount = (otMinutes/60) * ratePerHour */
export function computeOtAmount(otMinutes: number, ratePerHour: number): number {
  if (!(otMinutes > 0) || !(ratePerHour >= 0)) return 0;
  return Math.round((otMinutes / 60) * ratePerHour);
}

export function computeNetPay(
  baseSalary: number,
  otAmount: number,
  deductions: number,
): number {
  return Math.max(0, baseSalary + otAmount - Math.max(0, deductions));
}
