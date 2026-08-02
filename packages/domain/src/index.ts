export type { Brand, TenantId, UserId } from './shared/branded-types';
export { asTenantId, asUserId } from './shared/branded-types';
export type { BaseEntityProps } from './shared/base-entity';
export type { DomainEvent } from './shared/domain-event';

export type { ModuleId, ModuleKind, AccessLevel, ModuleNode } from './platform/module-catalog';
export { asModuleId } from './platform/module-catalog';
export type { ContractId, ContractStatus, Contract, ContractHealth } from './platform/contract';
export { asContractId, contractHealth } from './platform/contract';
export type { TenantRole } from './platform/user-role';
export { isTenantAdmin } from './platform/user-role';

export type {
  CustomerKind,
  CustomerStatus,
  QuotationStatus,
  SalesOrderStatus,
  DeliveryStatus,
  InvoiceStatus,
  LineItemInput,
  CreditCheckResult,
  ApprovalActionStatus,
  AssigneeRole,
  CtpStatus,
  DiscountRuleConditions,
  DiscountRuleMatchInput,
  DiscountRuleCandidate,
  ApprovalStepDef,
  PromiseLineInput,
  PromiseLineResult,
} from './sales/types';
export {
  computeLineTotal,
  computeDocTotal,
  checkCredit,
  QUOTATION_TRANSITIONS,
  canTransitionQuotation,
  discountRuleMatches,
  pickWinningDiscountRule,
  requiredApprovalSteps,
  canActOnApprovalStep,
  buildPromiseCheck,
} from './sales/types';

export type {
  WarehouseKind,
  ItemType,
  InventoryTxnType,
  InventoryTxnStatus,
  ReservationStatus,
} from './inventory/types';
export { computeAtp, canIssue } from './inventory/types';
export type { PickStrategy, QuantCandidate, AllocationSlice } from './inventory/allocate';
export { sortQuantsForStrategy, allocatePickQty } from './inventory/allocate';

export type { BomStatus, WorkOrderStatus } from './production/types';
export { canReleaseWorkOrder, maxReceiptQty, addLeadDays } from './production/types';

export type { ArInvoiceStatus } from './accounting/types';
export { addPaymentTermsDays, daysPastDue } from './accounting/types';

export type {
  DepartmentKind,
  EmployeeStatus,
  EmploymentContractType,
  EmploymentContractStatus,
} from './hr/types';
export { isValidContractPeriod, canActivateContractForEmployee } from './hr/types';
export type { ShiftSchedule, AttendancePunch, TimesheetResult } from './hr/timesheet';
export {
  processTimesheet,
  shiftStandardMinutes,
  parseTimeToMinutes,
  formatMinutesAsHours,
} from './hr/timesheet';
export {
  countLeaveDays,
  rangesOverlap,
  computeOtAmount,
  computeNetPay,
} from './hr/payroll';

export type {
  EquipmentKind,
  EquipmentStatus,
  EquipmentCriticality,
  WorkRequestPriority,
  WorkRequestStatus,
  MaintenanceOrderKind,
  MaintenanceOrderStatus,
} from './maintenance/types';
export {
  canTransitionMaintenanceOrder,
  canConvertWorkRequest,
  canCompleteMaintenanceOrder,
} from './maintenance/types';
export type { PmPlanInput, PmGenerateCandidate } from './maintenance/pm-engine';
export {
  selectDueMaintenancePlans,
  addMaintenanceCalendarDays,
} from './maintenance/pm-engine';
export type { MeterAlertLevel } from './maintenance/oee';
export {
  evaluateMeterThreshold,
  computeOee,
  inclusiveCalendarDays,
} from './maintenance/oee';

export type { RankedChunk, RagModuleKey } from './ai/rag';
export {
  estimateTokens,
  chunkText,
  cosineSimilarity,
  rankByCosine,
  formatRagContextBlock,
  RAG_MODULE_KEYS,
  isRagModuleKey,
} from './ai/rag';
