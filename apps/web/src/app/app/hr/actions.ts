'use server';

import type {
  DepartmentKind,
  EmployeeStatus,
  EmploymentContractStatus,
  EmploymentContractType,
} from '@optimake/domain';
import { revalidateWorkspace } from '@/lib/revalidate-workspace';
import {
  createDepartment,
  createEmployee,
  createEmploymentContract,
  updateEmployee,
  type ActionResult,
} from '@/services/hr.service';

async function revalidateHr(extra: string[] = []): Promise<void> {
  await revalidateWorkspace([
    '/app/hr',
    '/app/hr/departments',
    '/app/hr/employees',
    '/app/hr/shifts',
    '/app/hr/attendance',
    '/app/hr/leave',
    '/app/hr/payroll',
    ...extra,
  ]);
}

export async function createDepartmentAction(input: {
  code: string;
  name: string;
  kind: DepartmentKind;
  parentId?: string;
}): Promise<ActionResult<{ id: string }>> {
  const result = await createDepartment(input);
  if (result.ok) await revalidateHr();
  return result;
}

export async function createEmployeeAction(input: {
  fullName: string;
  code?: string;
  departmentId?: string;
  jobTitle?: string;
  status?: EmployeeStatus;
  hiredOn?: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult<{ id: string }>> {
  const result = await createEmployee(input);
  if (result.ok) await revalidateHr();
  return result;
}

export async function updateEmployeeAction(input: {
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
  const result = await updateEmployee(input);
  if (result.ok) await revalidateHr([`/app/hr/employees/${input.id}`]);
  return result;
}

export async function createContractAction(input: {
  employeeId: string;
  code?: string;
  contractType: EmploymentContractType;
  status: EmploymentContractStatus;
  startsOn: string;
  endsOn?: string | null;
  baseSalary?: number | null;
}): Promise<ActionResult<{ id: string }>> {
  const result = await createEmploymentContract(input);
  if (result.ok) await revalidateHr([`/app/hr/employees/${input.employeeId}`]);
  return result;
}

export async function createShiftAction(input: {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
}): Promise<ActionResult<{ id: string }>> {
  const { createShift } = await import('@/services/hr.service');
  const result = await createShift(input);
  if (result.ok) await revalidateHr();
  return result;
}

export async function upsertAttendanceAction(input: {
  employeeId: string;
  workDate: string;
  shiftId?: string;
  clockInTime: string;
  clockOutTime?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const { upsertAttendanceLog } = await import('@/services/hr.service');
  const result = await upsertAttendanceLog(input);
  if (result.ok) await revalidateHr();
  return result;
}

export async function createLeaveRequestAction(input: {
  employeeId: string;
  leaveTypeId: string;
  startsOn: string;
  endsOn: string;
  note?: string;
}): Promise<ActionResult<{ id: string }>> {
  const { createLeaveRequest } = await import('@/services/hr.service');
  const result = await createLeaveRequest(input);
  if (result.ok) await revalidateHr();
  return result;
}

export async function decideLeaveRequestAction(input: {
  id: string;
  decision: 'approved' | 'rejected';
}): Promise<ActionResult> {
  const { decideLeaveRequest } = await import('@/services/hr.service');
  const result = await decideLeaveRequest(input);
  if (result.ok) await revalidateHr();
  return result;
}

export async function generatePayrollRunAction(input: {
  year: number;
  month: number;
}): Promise<ActionResult<{ id: string; code: string }>> {
  const { generatePayrollRun } = await import('@/services/hr.service');
  const result = await generatePayrollRun(input);
  if (result.ok) await revalidateHr();
  return result;
}

export async function lockPayrollRunAction(runId: string): Promise<ActionResult> {
  const { lockPayrollRun } = await import('@/services/hr.service');
  const result = await lockPayrollRun(runId);
  if (result.ok) await revalidateHr();
  return result;
}
