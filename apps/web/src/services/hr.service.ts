import 'server-only';
import {
  canActivateContractForEmployee,
  computeNetPay,
  computeOtAmount,
  countLeaveDays,
  isValidContractPeriod,
  parseTimeToMinutes,
  processTimesheet,
  rangesOverlap,
  type DepartmentKind,
  type EmployeeStatus,
  type EmploymentContractStatus,
  type EmploymentContractType,
  type TimesheetResult,
} from '@optimake/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTenantContext,
  managerDeniedMessage,
  type ActionResult,
} from '@/services/sales-context';

export type { ActionResult };

export interface HrDepartmentRow {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  kind: DepartmentKind;
  sort_order: number;
  is_active: boolean;
}

export interface HrEmployeeRow {
  id: string;
  code: string;
  full_name: string;
  status: EmployeeStatus;
  department_id: string | null;
  job_title: string;
  user_id: string | null;
  hired_on: string | null;
  terminated_on: string | null;
  phone: string | null;
  email: string | null;
  hr_departments?: { code: string; name: string } | null;
}

export interface HrContractRow {
  id: string;
  employee_id: string;
  code: string;
  contract_type: EmploymentContractType;
  status: EmploymentContractStatus;
  starts_on: string;
  ends_on: string | null;
  base_salary: number | null;
}

async function hasHrAccess(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', { p_key: 'nhan-su' });
  if (error) return false;
  return data === true;
}

export async function listDepartments(
  supabase: SupabaseClient,
): Promise<HrDepartmentRow[]> {
  const { data, error } = await supabase
    .from('hr_departments')
    .select('id, parent_id, code, name, kind, sort_order, is_active')
    .order('sort_order')
    .order('code');
  if (error) throw new Error(`Không tải phòng ban: ${error.message}`);
  return (data ?? []) as HrDepartmentRow[];
}

export async function listEmployees(
  supabase: SupabaseClient,
): Promise<HrEmployeeRow[]> {
  const { data, error } = await supabase
    .from('hr_employees')
    .select(
      'id, code, full_name, status, department_id, job_title, user_id, hired_on, terminated_on, phone, email, hr_departments(code, name)',
    )
    .order('code');
  if (error) throw new Error(`Không tải nhân viên: ${error.message}`);
  return (data ?? []) as unknown as HrEmployeeRow[];
}

export async function getEmployee(
  supabase: SupabaseClient,
  id: string,
): Promise<HrEmployeeRow | null> {
  const { data, error } = await supabase
    .from('hr_employees')
    .select(
      'id, code, full_name, status, department_id, job_title, user_id, hired_on, terminated_on, phone, email, hr_departments(code, name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as HrEmployeeRow) ?? null;
}

export async function listContractsForEmployee(
  supabase: SupabaseClient,
  employeeId: string,
): Promise<HrContractRow[]> {
  const { data, error } = await supabase
    .from('hr_employment_contracts')
    .select(
      'id, employee_id, code, contract_type, status, starts_on, ends_on, base_salary',
    )
    .eq('employee_id', employeeId)
    .order('starts_on', { ascending: false });
  if (error) throw new Error(`Không tải hợp đồng: ${error.message}`);
  return (data ?? []) as HrContractRow[];
}

export async function createDepartment(input: {
  code: string;
  name: string;
  kind: DepartmentKind;
  parentId?: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) return { ok: false, error: 'Nhập mã và tên phòng ban.' };

  if (input.parentId) {
    const { data: parent } = await ctx.supabase
      .from('hr_departments')
      .select('id')
      .eq('id', input.parentId)
      .maybeSingle();
    if (!parent) return { ok: false, error: 'Phòng ban cha không tồn tại.' };
  }

  const { data, error } = await ctx.supabase
    .from('hr_departments')
    .insert({
      tenant_id: ctx.tenantId,
      parent_id: input.parentId || null,
      code,
      name,
      kind: input.kind,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: String((data as { id: string }).id) } };
}

async function nextEmployeeCode(
  supabase: SupabaseClient,
  prefix: string,
): Promise<string> {
  const { count } = await supabase
    .from('hr_employees')
    .select('id', { count: 'exact', head: true });
  return `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

export async function createEmployee(input: {
  fullName: string;
  code?: string;
  departmentId?: string;
  jobTitle?: string;
  status?: EmployeeStatus;
  hiredOn?: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, error: 'Nhập họ tên.' };

  const { data: setting } = await ctx.supabase
    .from('tenant_settings')
    .select('value')
    .eq('namespace', 'hr')
    .eq('key', 'employee_code_prefix')
    .maybeSingle();
  const prefixRaw = (setting as { value?: unknown } | null)?.value;
  const prefix =
    typeof prefixRaw === 'string' && prefixRaw.trim()
      ? prefixRaw.trim().toUpperCase()
      : 'NV';

  const code = (input.code?.trim() || (await nextEmployeeCode(ctx.supabase, prefix))).toUpperCase();
  const status: EmployeeStatus = input.status ?? 'active';

  const { data, error } = await ctx.supabase
    .from('hr_employees')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      full_name: fullName,
      status,
      department_id: input.departmentId || null,
      job_title: (input.jobTitle ?? '').trim(),
      hired_on: input.hiredOn || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: String((data as { id: string }).id) } };
}

export async function updateEmployee(input: {
  id: string;
  fullName: string;
  departmentId?: string | null;
  jobTitle?: string;
  status: EmployeeStatus;
  hiredOn?: string | null;
  terminatedOn?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<ActionResult> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  if (input.status === 'terminated' && !input.terminatedOn) {
    return { ok: false, error: 'Nhân viên nghỉ việc cần ngày nghỉ.' };
  }
  const { error } = await ctx.supabase
    .from('hr_employees')
    .update({
      full_name: input.fullName.trim(),
      department_id: input.departmentId || null,
      job_title: (input.jobTitle ?? '').trim(),
      status: input.status,
      hired_on: input.hiredOn || null,
      terminated_on: input.status === 'terminated' ? input.terminatedOn : null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    })
    .eq('id', input.id);
  if (error) return { ok: false, error: error.message };

  // Kết thúc HĐ active khi NV nghỉ việc — tránh lương/HĐ treo
  if (input.status === 'terminated' && input.terminatedOn) {
    const { error: contractErr } = await ctx.supabase
      .from('hr_employment_contracts')
      .update({
        status: 'terminated',
        ends_on: input.terminatedOn,
      })
      .eq('employee_id', input.id)
      .eq('status', 'active');
    if (contractErr) {
      return {
        ok: false,
        error: `Đã cập nhật NV nhưng không đóng HĐ: ${contractErr.message}`,
      };
    }
  }
  return { ok: true, data: undefined };
}

export async function createEmploymentContract(input: {
  employeeId: string;
  code?: string;
  contractType: EmploymentContractType;
  status: EmploymentContractStatus;
  startsOn: string;
  endsOn?: string | null;
  baseSalary?: number | null;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  if (!isValidContractPeriod(input.startsOn, input.endsOn ?? null)) {
    return { ok: false, error: 'Ngày kết thúc phải ≥ ngày bắt đầu.' };
  }

  const { data: emp } = await ctx.supabase
    .from('hr_employees')
    .select('status')
    .eq('id', input.employeeId)
    .maybeSingle();
  const empStatus = (emp as { status: EmployeeStatus } | null)?.status;
  if (!empStatus) return { ok: false, error: 'Không tìm thấy nhân viên.' };
  if (input.status === 'active' && !canActivateContractForEmployee(empStatus)) {
    return { ok: false, error: 'Không kích hoạt HĐ cho nhân viên đã nghỉ việc.' };
  }

  const { count } = await ctx.supabase
    .from('hr_employment_contracts')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', input.employeeId);
  const code =
    input.code?.trim().toUpperCase() ||
    `HD-${String((count ?? 0) + 1).padStart(3, '0')}`;

  const { data, error } = await ctx.supabase
    .from('hr_employment_contracts')
    .insert({
      tenant_id: ctx.tenantId,
      employee_id: input.employeeId,
      code,
      contract_type: input.contractType,
      status: input.status,
      starts_on: input.startsOn,
      ends_on: input.endsOn || null,
      base_salary: input.baseSalary ?? null,
    })
    .select('id')
    .single();
  if (error) {
    if (error.message.includes('idx_hr_contracts_one_active')) {
      return { ok: false, error: 'Đã có hợp đồng đang hiệu lực — chỉ một HĐ active.' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, data: { id: String((data as { id: string }).id) } };
}

export async function listActiveContractsExpiring(
  supabase: SupabaseClient,
  withinDays: number,
  asOf: string,
): Promise<number> {
  const end = new Date(`${asOf}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + withinDays);
  const until = end.toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from('hr_employment_contracts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('ends_on', 'is', null)
    .gte('ends_on', asOf)
    .lte('ends_on', until);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function contractsExpiringSoon(
  contracts: readonly HrContractRow[],
  withinDays: number,
  asOf: string,
): HrContractRow[] {
  const asOfMs = Date.parse(`${asOf}T00:00:00.000Z`);
  const limit = asOfMs + withinDays * 86_400_000;
  return contracts.filter((c) => {
    if (c.status !== 'active' || !c.ends_on) return false;
    const end = Date.parse(`${c.ends_on}T00:00:00.000Z`);
    return Number.isFinite(end) && end >= asOfMs && end <= limit;
  });
}

// --- NS2: shifts & attendance ---

export interface HrShiftRow {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_active: boolean;
}

export interface HrAttendanceRow {
  id: string;
  employee_id: string;
  work_date: string;
  shift_id: string | null;
  clock_in: string;
  clock_out: string | null;
  source: string;
  attributes?: unknown;
  hr_employees?: { code: string; full_name: string } | null;
  hr_shifts?: { code: string; name: string; start_time: string; end_time: string; break_minutes: number } | null;
}

function timeToMinutes(t: string): number {
  const parsed = parseTimeToMinutes(t.slice(0, 8));
  if (parsed === null) throw new Error(`Giờ ca không hợp lệ: ${t}`);
  return parsed;
}

/** Chấm công theo giờ địa phương VN (Asia/Ho_Chi_Minh) — tránh lệch UTC trên server. */
const HR_TIMEZONE = 'Asia/Ho_Chi_Minh';
const HR_UTC_OFFSET = '+07:00';

function toTenantLocalIso(workDate: string, hhmm: string): string {
  const t = hhmm.length >= 5 ? hhmm.slice(0, 5) : hhmm;
  return `${workDate}T${t}:00${HR_UTC_OFFSET}`;
}

function stampLocalMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: HR_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function computeTimesheetForLog(
  log: {
    clock_in: string;
    clock_out: string | null;
  },
  shift: { start_time: string; end_time: string; break_minutes: number },
): TimesheetResult {
  return processTimesheet(
    {
      clockInMinutes: stampLocalMinutes(log.clock_in),
      clockOutMinutes: log.clock_out ? stampLocalMinutes(log.clock_out) : null,
    },
    {
      startMinutes: timeToMinutes(shift.start_time),
      endMinutes: timeToMinutes(shift.end_time),
      breakMinutes: shift.break_minutes,
    },
  );
}

export async function listShifts(supabase: SupabaseClient): Promise<HrShiftRow[]> {
  const { data, error } = await supabase
    .from('hr_shifts')
    .select('id, code, name, start_time, end_time, break_minutes, is_active')
    .order('code');
  if (error) throw new Error(`Không tải ca: ${error.message}`);
  return (data ?? []) as HrShiftRow[];
}

export async function createShift(input: {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) return { ok: false, error: 'Nhập mã và tên ca.' };
  if (parseTimeToMinutes(input.startTime) === null || parseTimeToMinutes(input.endTime) === null) {
    return { ok: false, error: 'Giờ ca dạng HH:MM.' };
  }
  if (!(input.breakMinutes >= 0)) return { ok: false, error: 'Phút nghỉ ≥ 0.' };

  const { data, error } = await ctx.supabase
    .from('hr_shifts')
    .insert({
      tenant_id: ctx.tenantId,
      code,
      name,
      start_time: input.startTime,
      end_time: input.endTime,
      break_minutes: input.breakMinutes,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: String((data as { id: string }).id) } };
}

export async function listAttendanceLogs(
  supabase: SupabaseClient,
  limit = 100,
): Promise<HrAttendanceRow[]> {
  const { data, error } = await supabase
    .from('hr_attendance_logs')
    .select(
      'id, employee_id, work_date, shift_id, clock_in, clock_out, source, attributes, hr_employees(code, full_name), hr_shifts(code, name, start_time, end_time, break_minutes)',
    )
    .order('work_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Không tải chấm công: ${error.message}`);
  return (data ?? []) as unknown as HrAttendanceRow[];
}

export async function upsertAttendanceLog(input: {
  employeeId: string;
  workDate: string;
  shiftId?: string;
  /** HH:MM */
  clockInTime: string;
  /** HH:MM optional */
  clockOutTime?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  if (!input.workDate) return { ok: false, error: 'Nhập ngày làm việc.' };
  const inMin = parseTimeToMinutes(input.clockInTime);
  if (inMin === null) return { ok: false, error: 'Giờ vào dạng HH:MM.' };
  const outMin = input.clockOutTime
    ? parseTimeToMinutes(input.clockOutTime)
    : null;
  if (input.clockOutTime && outMin === null) {
    return { ok: false, error: 'Giờ ra dạng HH:MM.' };
  }
  // Có giờ ra → bắt buộc chọn ca để tính OT / muộn / về sớm (không âm thầm OT=0)
  if (outMin !== null && !input.shiftId) {
    return {
      ok: false,
      error: 'Chọn ca làm việc khi có giờ ra để tính giờ công / OT.',
    };
  }

  const clockInIso = toTenantLocalIso(input.workDate, input.clockInTime);
  let clockOutFinal: string | null = null;
  if (outMin !== null && input.clockOutTime) {
    if (outMin < inMin) {
      const d = new Date(`${input.workDate}T12:00:00${HR_UTC_OFFSET}`);
      d.setDate(d.getDate() + 1);
      const next = new Intl.DateTimeFormat('en-CA', {
        timeZone: HR_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
      clockOutFinal = toTenantLocalIso(next, input.clockOutTime);
    } else {
      clockOutFinal = toTenantLocalIso(input.workDate, input.clockOutTime);
    }
  }

  let timesheetAttrs: Record<string, number> | null = null;
  if (input.shiftId) {
    const { data: shift } = await ctx.supabase
      .from('hr_shifts')
      .select('start_time, end_time, break_minutes')
      .eq('id', input.shiftId)
      .maybeSingle();
    if (!shift) {
      return { ok: false, error: 'Ca làm việc không tồn tại.' };
    }
    const sh = shift as { start_time: string; end_time: string; break_minutes: number };
    const ts = processTimesheet(
      {
        clockInMinutes: inMin,
        clockOutMinutes: outMin,
      },
      {
        startMinutes: timeToMinutes(sh.start_time),
        endMinutes: timeToMinutes(sh.end_time),
        breakMinutes: sh.break_minutes,
      },
    );
    timesheetAttrs = {
      worked_minutes: ts.workedMinutes,
      standard_minutes: ts.standardMinutes,
      late_minutes: ts.lateMinutes,
      early_leave_minutes: ts.earlyLeaveMinutes,
      ot_minutes: ts.otMinutes,
    };
  }

  const row = {
    tenant_id: ctx.tenantId,
    employee_id: input.employeeId,
    work_date: input.workDate,
    shift_id: input.shiftId || null,
    clock_in: clockInIso,
    clock_out: clockOutFinal,
    source: 'manual',
    attributes: timesheetAttrs ? { timesheet: timesheetAttrs } : {},
  };

  const { data, error } = await ctx.supabase
    .from('hr_attendance_logs')
    .upsert(row, { onConflict: 'tenant_id,employee_id,work_date' })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: String((data as { id: string }).id) } };
}

// --- NS3: leave + payroll ---

export type LeaveRequestStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface HrLeaveTypeRow {
  id: string;
  code: string;
  name: string;
  is_paid: boolean;
  annual_quota_days: number | null;
  is_active: boolean;
}

export interface HrLeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
  starts_on: string;
  ends_on: string;
  days: number;
  status: LeaveRequestStatus;
  note: string | null;
  hr_employees?: { code: string; full_name: string } | null;
  hr_leave_types?: { code: string; name: string } | null;
}

export interface HrPayrollRunRow {
  id: string;
  code: string;
  period_year: number;
  period_month: number;
  status: 'draft' | 'locked';
  locked_at: string | null;
}

export interface HrPayrollLineRow {
  id: string;
  run_id: string;
  employee_id: string;
  base_salary: number;
  ot_minutes: number;
  ot_amount: number;
  deductions: number;
  net_amount: number;
  hr_employees?: { code: string; full_name: string } | null;
}

export async function ensureDefaultLeaveTypes(): Promise<void> {
  const ctx = await getTenantContext();
  if (!(await hasHrAccess(ctx.supabase))) return;
  const defaults = [
    { code: 'ANNUAL', name: 'Phép năm', is_paid: true, annual_quota_days: 12 },
    { code: 'SICK', name: 'Ốm', is_paid: true, annual_quota_days: null as number | null },
    { code: 'UNPAID', name: 'Không lương', is_paid: false, annual_quota_days: null as number | null },
  ];
  const { data: existing } = await ctx.supabase
    .from('hr_leave_types')
    .select('code');
  const have = new Set(
    ((existing ?? []) as { code: string }[]).map((r) => r.code),
  );
  for (const d of defaults) {
    if (have.has(d.code)) continue;
    await ctx.supabase.from('hr_leave_types').insert({
      tenant_id: ctx.tenantId,
      code: d.code,
      name: d.name,
      is_paid: d.is_paid,
      annual_quota_days: d.annual_quota_days,
    });
  }
}

export async function listLeaveTypes(
  supabase: SupabaseClient,
): Promise<HrLeaveTypeRow[]> {
  const { data, error } = await supabase
    .from('hr_leave_types')
    .select('id, code, name, is_paid, annual_quota_days, is_active')
    .eq('is_active', true)
    .order('code');
  if (error) throw new Error(error.message);
  return (data ?? []) as HrLeaveTypeRow[];
}

export async function listLeaveRequests(
  supabase: SupabaseClient,
): Promise<HrLeaveRequestRow[]> {
  const { data, error } = await supabase
    .from('hr_leave_requests')
    .select(
      'id, employee_id, leave_type_id, starts_on, ends_on, days, status, note, hr_employees(code, full_name), hr_leave_types(code, name)',
    )
    .order('starts_on', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HrLeaveRequestRow[];
}

export async function createLeaveRequest(input: {
  employeeId: string;
  leaveTypeId: string;
  startsOn: string;
  endsOn: string;
  note?: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  const days = countLeaveDays(input.startsOn, input.endsOn);
  if (!(days > 0)) return { ok: false, error: 'Khoảng ngày không hợp lệ.' };

  const { data: existing } = await ctx.supabase
    .from('hr_leave_requests')
    .select('starts_on, ends_on, status')
    .eq('employee_id', input.employeeId)
    .in('status', ['pending', 'approved']);
  for (const row of existing ?? []) {
    const r = row as { starts_on: string; ends_on: string; status: string };
    if (rangesOverlap(input.startsOn, input.endsOn, r.starts_on, r.ends_on)) {
      return {
        ok: false,
        error: `Trùng đơn ${r.status} (${r.starts_on} → ${r.ends_on}).`,
      };
    }
  }

  const { data, error } = await ctx.supabase
    .from('hr_leave_requests')
    .insert({
      tenant_id: ctx.tenantId,
      employee_id: input.employeeId,
      leave_type_id: input.leaveTypeId,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      days,
      status: 'pending',
      note: input.note?.trim() || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: String((data as { id: string }).id) } };
}

export async function decideLeaveRequest(input: {
  id: string;
  decision: 'approved' | 'rejected';
}): Promise<ActionResult> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  const { data, error } = await ctx.supabase
    .from('hr_leave_requests')
    .update({
      status: input.decision,
      decided_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('status', 'pending')
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    return { ok: false, error: 'Đơn không còn ở trạng thái chờ duyệt.' };
  }
  return { ok: true, data: undefined };
}

async function getOtRatePerHour(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('value')
    .eq('namespace', 'hr')
    .eq('key', 'ot_rate_per_hour')
    .maybeSingle();
  const v = (data as { value?: unknown } | null)?.value;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 50_000;
}

export async function listPayrollRuns(
  supabase: SupabaseClient,
): Promise<HrPayrollRunRow[]> {
  const { data, error } = await supabase
    .from('hr_payroll_runs')
    .select('id, code, period_year, period_month, status, locked_at')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as HrPayrollRunRow[];
}

export async function listPayrollLines(
  supabase: SupabaseClient,
  runId: string,
): Promise<HrPayrollLineRow[]> {
  const { data, error } = await supabase
    .from('hr_payroll_lines')
    .select(
      'id, run_id, employee_id, base_salary, ot_minutes, ot_amount, deductions, net_amount, hr_employees(code, full_name)',
    )
    .eq('run_id', runId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HrPayrollLineRow[];
}

export async function generatePayrollRun(input: {
  year: number;
  month: number;
}): Promise<ActionResult<{ id: string; code: string }>> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  const { year, month } = input;
  if (!(month >= 1 && month <= 12)) return { ok: false, error: 'Tháng 1–12.' };

  const { data: existing } = await ctx.supabase
    .from('hr_payroll_runs')
    .select('id, status, code')
    .eq('period_year', year)
    .eq('period_month', month)
    .maybeSingle();
  const ex = existing as { id: string; status: string; code: string } | null;
  if (ex?.status === 'locked') {
    return { ok: false, error: 'Kỳ lương đã khóa — không tạo lại.' };
  }

  let runId = ex?.id;
  const code = ex?.code ?? `BL-${year}${String(month).padStart(2, '0')}`;
  if (!runId) {
    const { data, error } = await ctx.supabase
      .from('hr_payroll_runs')
      .insert({
        tenant_id: ctx.tenantId,
        code,
        period_year: year,
        period_month: month,
        status: 'draft',
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    runId = String((data as { id: string }).id);
  } else {
    const { error: delErr } = await ctx.supabase
      .from('hr_payroll_lines')
      .delete()
      .eq('run_id', runId);
    if (delErr) {
      return { ok: false, error: `Không xoá dòng lương cũ: ${delErr.message}` };
    }
  }

  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const otRate = await getOtRatePerHour(ctx.supabase);
  const { data: employees } = await ctx.supabase
    .from('hr_employees')
    .select('id')
    .eq('status', 'active');

  for (const emp of employees ?? []) {
    const employeeId = String((emp as { id: string }).id);
    const { data: contract } = await ctx.supabase
      .from('hr_employment_contracts')
      .select('base_salary')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .maybeSingle();
    const baseSalary = Number(
      (contract as { base_salary?: number } | null)?.base_salary ?? 0,
    );

    const { data: attLogs } = await ctx.supabase
      .from('hr_attendance_logs')
      .select('attributes')
      .eq('employee_id', employeeId)
      .gte('work_date', periodStart)
      .lte('work_date', periodEnd);

    let otMinutes = 0;
    for (const log of attLogs ?? []) {
      const attrs = (log as { attributes?: { timesheet?: { ot_minutes?: number } } })
        .attributes;
      otMinutes += Number(attrs?.timesheet?.ot_minutes ?? 0);
    }

    const otAmount = computeOtAmount(otMinutes, otRate);
    const netAmount = computeNetPay(baseSalary, otAmount, 0);

    const { error: lineErr } = await ctx.supabase.from('hr_payroll_lines').insert({
      tenant_id: ctx.tenantId,
      run_id: runId,
      employee_id: employeeId,
      base_salary: baseSalary,
      ot_minutes: otMinutes,
      ot_amount: otAmount,
      deductions: 0,
      net_amount: netAmount,
    });
    if (lineErr) {
      await ctx.supabase.from('hr_payroll_lines').delete().eq('run_id', runId);
      return {
        ok: false,
        error: `Lỗi ghi dòng lương — đã huỷ dòng kỳ này: ${lineErr.message}`,
      };
    }
  }

  return { ok: true, data: { id: runId, code } };
}

export async function lockPayrollRun(runId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  const denied = managerDeniedMessage(ctx);
  if (denied) return { ok: false, error: denied };
  if (!(await hasHrAccess(ctx.supabase))) {
    return { ok: false, error: 'Chưa cấp module Nhân sự.' };
  }
  const { data, error } = await ctx.supabase
    .from('hr_payroll_runs')
    .update({ status: 'locked', locked_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('status', 'draft')
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    return { ok: false, error: 'Kỳ lương không còn ở trạng thái nháp (đã khóa hoặc không tồn tại).' };
  }
  return { ok: true, data: undefined };
}

