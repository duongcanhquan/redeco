/**
 * Tính công từ AttendanceLog + cấu hình Shift.
 * Đơn vị: phút (integer) để tránh float.
 */

export type ShiftSchedule = {
  /** Phút từ 00:00 (0–1439). VD 08:00 = 480 */
  readonly startMinutes: number;
  readonly endMinutes: number;
  readonly breakMinutes: number;
};

export type AttendancePunch = {
  /** Phút từ 00:00 của work_date (local ca). */
  readonly clockInMinutes: number;
  /** null = chưa ra */
  readonly clockOutMinutes: number | null;
};

export type TimesheetResult = {
  /** Phút làm thực tế (sau trừ nghỉ ca, clamp trong khung ca nếu có out). */
  readonly workedMinutes: number;
  /** Phút công tiêu chuẩn của ca (end−start − break, xử lý qua đêm). */
  readonly standardMinutes: number;
  /** Đi muộn (phút) so với giờ bắt đầu ca. */
  readonly lateMinutes: number;
  /** Về sớm (phút) so với giờ kết thúc ca — 0 nếu chưa clock out. */
  readonly earlyLeaveMinutes: number;
  /** OT = max(0, worked − standard). */
  readonly otMinutes: number;
};

function spanMinutes(start: number, end: number): number {
  if (end >= start) return end - start;
  // qua đêm
  return 24 * 60 - start + end;
}

export function shiftStandardMinutes(shift: ShiftSchedule): number {
  const raw = spanMinutes(shift.startMinutes, shift.endMinutes);
  return Math.max(0, raw - Math.max(0, shift.breakMinutes));
}

/**
 * Logic NS2:
 * - worked: nếu có out → span(in,out) − break (break chỉ trừ nếu worked > break);
 *   nếu chưa out → 0.
 * - late: max(0, in − start)
 * - early: nếu có out → max(0, end − out) với end đã normalize qua đêm so với in
 * - ot: max(0, worked − standard)
 */
export function processTimesheet(
  punch: AttendancePunch,
  shift: ShiftSchedule,
): TimesheetResult {
  const standardMinutes = shiftStandardMinutes(shift);
  const lateMinutes = Math.max(0, punch.clockInMinutes - shift.startMinutes);

  if (punch.clockOutMinutes === null) {
    return {
      workedMinutes: 0,
      standardMinutes,
      lateMinutes,
      earlyLeaveMinutes: 0,
      otMinutes: 0,
    };
  }

  let out = punch.clockOutMinutes;
  // Nếu ca qua đêm và out < in theo đồng hồ trong ngày → out thuộc ngày sau (đã encode bằng +1440 phía caller),
  // ở đây giả định caller đã đưa cùng thang phút trong ngày ca; spanMinutes xử lý end < start.
  const workedRaw = spanMinutes(punch.clockInMinutes, out);
  const workedMinutes = Math.max(0, workedRaw - Math.max(0, shift.breakMinutes));

  // Về sớm: so với end ca trên cùng “timeline” — nếu ca không qua đêm và out < end
  let earlyLeaveMinutes = 0;
  if (shift.endMinutes >= shift.startMinutes) {
    earlyLeaveMinutes = Math.max(0, shift.endMinutes - out);
  } else {
    // ca đêm: end là sáng hôm sau — nếu out còn trong đoạn trước nửa đêm và < 24h từ start…
    const endAs = shift.endMinutes + 24 * 60;
    const outAs = out < shift.startMinutes ? out + 24 * 60 : out;
    earlyLeaveMinutes = Math.max(0, endAs - outAs);
  }

  const otMinutes = Math.max(0, workedMinutes - standardMinutes);

  return {
    workedMinutes,
    standardMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    otMinutes,
  };
}

/** Parse "HH:MM" hoặc "HH:MM:SS" → phút. */
export function parseTimeToMinutes(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutesAsHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
