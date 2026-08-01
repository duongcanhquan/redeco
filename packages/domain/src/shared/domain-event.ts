import type { TenantId } from './branded-types';

/**
 * Hợp đồng chung cho mọi Domain Event.
 * Mỗi Aggregate phát event khi trạng thái nghiệp vụ thay đổi (xem ddd-blueprint.mdc).
 */
export interface DomainEvent<TPayload = Readonly<Record<string, unknown>>> {
  readonly eventName: string;
  readonly aggregateId: string;
  readonly tenantId: TenantId;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}
