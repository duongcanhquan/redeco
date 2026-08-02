/** Shared types/labels for hub REDECO — safe for client + server. */

export type HubStatus =
  | 'pending'
  | 'review'
  | 'rejected'
  | 'to_production'
  | 'quoted';

export const HUB_STATUS_LABELS: Record<HubStatus, string> = {
  pending: 'Pending',
  review: 'Xem lại',
  rejected: 'Không đạt',
  to_production: 'Chuyển sản xuất',
  quoted: 'Đã tạo BG',
};
