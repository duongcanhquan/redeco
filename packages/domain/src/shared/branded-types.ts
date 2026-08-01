/**
 * Branded types: ngăn truyền nhầm UUID giữa các ngữ cảnh khác nhau
 * (ví dụ truyền UserId vào chỗ cần TenantId) — lỗi bị bắt tại compile-time.
 */
declare const brand: unique symbol;

export type Brand<T, TBrand extends string> = T & { readonly [brand]: TBrand };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;

export const asTenantId = (value: string): TenantId => value as TenantId;
export const asUserId = (value: string): UserId => value as UserId;
