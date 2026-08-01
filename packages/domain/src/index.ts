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
