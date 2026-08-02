/**
 * Module Trợ lý AI — entitlement từ superadmin (catalog `ai.*`).
 * Admin công ty cấu hình key + bật từng chỗ trong Cài đặt.
 *
 * RPC `my_module_ids` đã expand subtree khi HĐ cấp node cha → keys thường gồm cả leaf.
 */

import { hasModuleKey } from '@/lib/workspace-nav';

export const AI_MODULE_ROOT = 'ai';

export const AI_FEATURE_KEYS = {
  hubChat: 'ai.kinh-doanh.hoi-dap',
  quoteReview: 'ai.kinh-doanh.danh-gia-bao-gia',
  orderReview: 'ai.kinh-doanh.danh-gia-don-hang',
  salesBranch: 'ai.kinh-doanh',
} as const;

export type AiFeatureModuleKey =
  (typeof AI_FEATURE_KEYS)[keyof typeof AI_FEATURE_KEYS];

/** Có module AI (root hoặc bất kỳ node con). */
export function hasAiModule(moduleKeys: readonly string[]): boolean {
  return hasModuleKey(moduleKeys, AI_MODULE_ROOT);
}

/**
 * Có quyền feature AI cụ thể.
 * - Có đúng key / con của key, hoặc
 * - Có ancestor trong keys (vd chỉ gán `ai` / `ai.kinh-doanh` mà catalog chưa expand đủ).
 */
export function hasAiFeature(
  moduleKeys: readonly string[],
  featureKey: AiFeatureModuleKey,
): boolean {
  if (!hasAiModule(moduleKeys)) return false;
  if (hasModuleKey(moduleKeys, featureKey)) return true;
  // Ancestor covers feature (dotted prefix)
  return moduleKeys.some(
    (k) => featureKey === k || featureKey.startsWith(`${k}.`),
  );
}
