import type { TenantId } from './branded-types';

/**
 * Thuộc tính chung của mọi Entity trong hệ thống multi-tenant.
 * `attributes` là dữ liệu động theo tenant, lưu ở cột JSONB (xem ADR-001).
 */
export interface BaseEntityProps {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
