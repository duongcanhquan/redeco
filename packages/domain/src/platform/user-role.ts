/** Vai trò trong một công ty (user_profiles.role). */
export type TenantRole = 'owner' | 'admin' | 'member';

/** owner/admin của công ty được thấy toàn bộ module entitled, không cần phân công. */
export const isTenantAdmin = (role: TenantRole): boolean =>
  role === 'owner' || role === 'admin';
