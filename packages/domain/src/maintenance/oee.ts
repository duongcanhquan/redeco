export type MeterAlertLevel = 'ok' | 'warn' | 'critical';

export function evaluateMeterThreshold(input: {
  value: number;
  thresholdWarn: number | null;
  thresholdCritical: number | null;
}): MeterAlertLevel {
  const { value, thresholdWarn, thresholdCritical } = input;
  if (thresholdCritical != null && value >= thresholdCritical) return 'critical';
  if (thresholdWarn != null && value >= thresholdWarn) return 'warn';
  return 'ok';
}

/**
 * OEE = A × P × Q. TB3: P và Q mặc định 1 nếu không truyền.
 * Availability = (plannedMinutes - downtimeMinutes) / plannedMinutes.
 */
export function computeOee(input: {
  plannedMinutes: number;
  downtimeMinutes: number;
  performance?: number;
  quality?: number;
}): {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
} {
  const planned = Math.max(0, input.plannedMinutes);
  const down = Math.max(0, input.downtimeMinutes);
  const availability =
    planned <= 0 ? 0 : Math.max(0, Math.min(1, (planned - down) / planned));
  const performance = clamp01(input.performance ?? 1);
  const quality = clamp01(input.quality ?? 1);
  const oee = availability * performance * quality;
  return { availability, performance, quality, oee };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Số ngày lịch inclusive giữa 2 ISO date YYYY-MM-DD. */
export function inclusiveCalendarDays(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number);
  const [y2, m2, d2] = toIso.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  if (b < a) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}
