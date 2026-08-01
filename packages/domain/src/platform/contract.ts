import type { Brand, TenantId } from '../shared/branded-types';
import type { ModuleId } from './module-catalog';

export type ContractId = Brand<string, 'ContractId'>;
export const asContractId = (value: string): ContractId => value as ContractId;

export type ContractStatus = 'draft' | 'active' | 'suspended' | 'terminated';

/** Hợp đồng của một công ty: thời hạn, seats, các node module được mua. */
export interface Contract {
  readonly id: ContractId;
  readonly tenantId: TenantId;
  readonly code: string;
  readonly status: ContractStatus;
  /** ISO date (yyyy-mm-dd) */
  readonly startsOn: string;
  readonly endsOn: string;
  readonly seats: number;
  readonly notes: string | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  /** Node module trong hợp đồng — cấp node nào được cả subtree (ADR-008). */
  readonly entitledModuleIds: readonly ModuleId[];
}

/** Trạng thái hiển thị suy ra từ ends_on, không lưu DB. */
export type ContractHealth = 'active' | 'expiring_soon' | 'expired';

export const contractHealth = (
  contract: Pick<Contract, 'status' | 'endsOn'>,
  today: Date,
  expiringSoonDays = 30,
): ContractHealth => {
  if (contract.status !== 'active') return 'expired';
  const end = new Date(`${contract.endsOn}T23:59:59Z`);
  if (end.getTime() < today.getTime()) return 'expired';
  const soon = new Date(today.getTime() + expiringSoonDays * 24 * 60 * 60 * 1000);
  return end.getTime() <= soon.getTime() ? 'expiring_soon' : 'active';
};
