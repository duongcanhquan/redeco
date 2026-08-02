/**
 * Quy ước tên miền công ty (path prefix): optimake.com/{slug}/...
 * Dùng chung cho proxy, superadmin và form tạo công ty.
 */

/** Segment đầu URL không được dùng làm tên miền công ty. */
export const RESERVED_TENANT_SLUGS = new Set([
  '',
  'app',
  'login',
  'platform',
  'api',
  'admin',
  'www',
  'optimake',
  'icon',
  '_next',
]);

export const TENANT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Chuẩn hóa tên miền: bỏ dấu, chữ thường, chỉ a-z0-9 và dấu gạch ngang. */
export function slugifyTenantName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** null nếu hợp lệ; ngược lại trả thông báo lỗi tiếng Việt. */
export function validateTenantSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase();
  if (!TENANT_SLUG_PATTERN.test(slug)) {
    return 'Tên miền chỉ gồm chữ thường, số và dấu gạch ngang (vd: cong-ty-a).';
  }
  if (RESERVED_TENANT_SLUGS.has(slug)) {
    return `Tên miền "${slug}" là từ khóa hệ thống — hãy chọn tên khác.`;
  }
  return null;
}

export function isTenantPathSegment(segment: string): boolean {
  return !RESERVED_TENANT_SLUGS.has(segment) && TENANT_SLUG_PATTERN.test(segment);
}
