export type DepartmentKind =
  | 'company'
  | 'division'
  | 'workshop'
  | 'team'
  | 'office'
  | 'other';

export type EmployeeStatus = 'active' | 'on_leave' | 'terminated' | 'draft';

export type EmploymentContractType =
  | 'probation'
  | 'definite'
  | 'indefinite'
  | 'seasonal'
  | 'other';

export type EmploymentContractStatus = 'draft' | 'active' | 'expired' | 'terminated';

/** ends_on null = không xác định; nếu có thì phải ≥ starts_on. */
export function isValidContractPeriod(startsOn: string, endsOn: string | null): boolean {
  if (!startsOn) return false;
  if (!endsOn) return true;
  return endsOn >= startsOn;
}

/** Có thể kích hoạt HĐ active khi NV chưa terminated. */
export function canActivateContractForEmployee(status: EmployeeStatus): boolean {
  return status !== 'terminated';
}
