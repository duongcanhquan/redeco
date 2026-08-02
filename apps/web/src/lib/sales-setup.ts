/**
 * Logic thuần — preset / checklist / cảnh báo setup Kinh doanh.
 * Không gọi DB.
 */

export type SalesSetupPanel =
  | 'overview'
  | 'docs'
  | 'stock'
  | 'approval'
  | 'discount'
  | 'delivery'
  | 'ai'
  | 'profiles';

export const SALES_SETUP_PANELS: {
  key: SalesSetupPanel;
  label: string;
}[] = [
  { key: 'overview', label: 'Tổng quan setup' },
  { key: 'docs', label: 'Chứng từ' },
  { key: 'stock', label: 'Xác nhận & tồn' },
  { key: 'approval', label: 'Duyệt báo giá' },
  { key: 'discount', label: 'Chiết khấu' },
  { key: 'delivery', label: 'Giao & hóa đơn' },
  { key: 'ai', label: 'AI Kinh doanh' },
  { key: 'profiles', label: 'Profile' },
];

export function parseSalesSetupPanel(raw: string | undefined): SalesSetupPanel {
  const keys = SALES_SETUP_PANELS.map((p) => p.key);
  if (raw && (keys as string[]).includes(raw)) return raw as SalesSetupPanel;
  return 'overview';
}

export interface SalesSetupFlags {
  skipApproval: boolean;
  skipDiscountRules: boolean;
  ackDeliveryInvoice: boolean;
  ackStockPolicy: boolean;
}

export const DEFAULT_SETUP_FLAGS: SalesSetupFlags = {
  skipApproval: false,
  skipDiscountRules: false,
  ackDeliveryInvoice: false,
  ackStockPolicy: false,
};

/** Snapshot áp dụng / lưu profile (schema v1). */
export interface SalesProcessSnapshotV1 {
  schemaVersion: 1;
  currencyLabel: string;
  defaultQuotationValidDays: number;
  debtWarningDays: number;
  allowConfirmWithoutAtp: boolean;
  reserveOnSoConfirm: boolean;
  requireFullReserveOnConfirm: boolean;
  skipApproval: boolean;
  skipDiscountRules: boolean;
}

export interface SalesCompanyProfile {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  snapshot: SalesProcessSnapshotV1;
}

export type ActiveProfileId = string | null;

export interface SystemPreset {
  id: `preset:${string}`;
  name: string;
  description: string;
  snapshot: SalesProcessSnapshotV1;
  hint: string;
}

export const SYSTEM_PRESETS: readonly SystemPreset[] = [
  {
    id: 'preset:b2c',
    name: 'Bán nhanh B2C',
    description: 'Báo giá ngắn hạn, linh hoạt tồn — phù hợp bán lẻ / giao nhanh.',
    hint: 'Nên cấu hình 1 bước duyệt đơn giản hoặc bỏ qua duyệt.',
    snapshot: {
      schemaVersion: 1,
      currencyLabel: 'VND',
      defaultQuotationValidDays: 7,
      debtWarningDays: 3,
      allowConfirmWithoutAtp: true,
      reserveOnSoConfirm: false,
      requireFullReserveOnConfirm: false,
      skipApproval: true,
      skipDiscountRules: false,
    },
  },
  {
    id: 'preset:b2b',
    name: 'B2B duyệt chặt',
    description: 'Hiệu lực báo giá dài, siết tồn / giữ chỗ, khuyến khích duyệt nhiều cấp.',
    hint: 'Mở tab Duyệt để thêm bước theo ngưỡng tiền.',
    snapshot: {
      schemaVersion: 1,
      currencyLabel: 'VND',
      defaultQuotationValidDays: 30,
      debtWarningDays: 14,
      allowConfirmWithoutAtp: false,
      reserveOnSoConfirm: true,
      requireFullReserveOnConfirm: true,
      skipApproval: false,
      skipDiscountRules: false,
    },
  },
  {
    id: 'preset:agency',
    name: 'Đại lý',
    description: 'Cảnh báo công nợ rõ, giữ chỗ khi xác nhận — nên có quy tắc chiết khấu.',
    hint: 'Mở Chiết khấu để thêm rule theo loại khách đại lý.',
    snapshot: {
      schemaVersion: 1,
      currencyLabel: 'VND',
      defaultQuotationValidDays: 21,
      debtWarningDays: 21,
      allowConfirmWithoutAtp: true,
      reserveOnSoConfirm: true,
      requireFullReserveOnConfirm: false,
      skipApproval: false,
      skipDiscountRules: false,
    },
  },
] as const;

export type ChecklistKey =
  | 'docs'
  | 'stock_policy'
  | 'approval'
  | 'discount'
  | 'delivery_invoice'
  | 'profile_touch';

export interface ChecklistItem {
  key: ChecklistKey;
  label: string;
  hint: string;
  done: boolean;
  panel: SalesSetupPanel;
}

export interface SetupReviewInput {
  currencyLabel: string;
  defaultQuotationValidDays: number;
  debtWarningDays: number;
  allowConfirmWithoutAtp: boolean;
  reserveOnSoConfirm: boolean;
  requireFullReserveOnConfirm: boolean;
  flags: SalesSetupFlags;
  hasDefaultWorkflow: boolean;
  activeDiscountRuleCount: number;
  activeProfileId: ActiveProfileId;
  companyProfileCount: number;
  hasKhoModule: boolean;
}

export function buildChecklist(input: SetupReviewInput): ChecklistItem[] {
  const docsDone =
    input.currencyLabel.trim().length > 0 && input.defaultQuotationValidDays >= 1;
  const stockCoherent =
    !input.requireFullReserveOnConfirm || input.reserveOnSoConfirm;
  const stockDone =
    stockCoherent && (input.flags.ackStockPolicy || input.activeProfileId !== null);
  const approvalDone = input.flags.skipApproval || input.hasDefaultWorkflow;
  const discountDone =
    input.flags.skipDiscountRules || input.activeDiscountRuleCount > 0;
  const deliveryDone = input.flags.ackDeliveryInvoice;
  const profileDone =
    input.activeProfileId !== null || input.companyProfileCount > 0;

  return [
    {
      key: 'docs',
      label: 'Chứng từ & hiển thị',
      hint: 'Tiền tệ, hiệu lực báo giá, cảnh báo nợ.',
      done: docsDone,
      panel: 'docs',
    },
    {
      key: 'stock_policy',
      label: 'Xác nhận đơn & tồn',
      hint: 'ATP thiếu hàng và giữ chỗ khi xác nhận.',
      done: stockDone && !(input.requireFullReserveOnConfirm && !input.reserveOnSoConfirm),
      panel: 'stock',
    },
    {
      key: 'approval',
      label: 'Duyệt báo giá',
      hint: 'Có quy trình mặc định hoặc đánh dấu không cần duyệt.',
      done: approvalDone,
      panel: 'approval',
    },
    {
      key: 'discount',
      label: 'Chiết khấu / KM',
      hint: 'Có rule đang bật hoặc bỏ qua bước này.',
      done: discountDone,
      panel: 'discount',
    },
    {
      key: 'delivery_invoice',
      label: 'Giao hàng & hóa đơn',
      hint: 'Xác nhận đã xem chính sách giao / xuất HĐ.',
      done: deliveryDone,
      panel: 'delivery',
    },
    {
      key: 'profile_touch',
      label: 'Preset / profile',
      hint: 'Đã áp preset hoặc lưu profile công ty.',
      done: profileDone,
      panel: 'profiles',
    },
  ];
}

export interface SetupWarning {
  id: string;
  message: string;
  panel: SalesSetupPanel;
}

export function buildSetupWarnings(input: SetupReviewInput): SetupWarning[] {
  const out: SetupWarning[] = [];
  if (input.requireFullReserveOnConfirm && !input.reserveOnSoConfirm) {
    out.push({
      id: 'reserve-inconsistent',
      message:
        'Đang bật «bắt buộc giữ chỗ đủ» nhưng tắt «giữ chỗ khi xác nhận» — hãy bật giữ chỗ hoặc tắt bắt buộc.',
      panel: 'stock',
    });
  }
  if (!input.allowConfirmWithoutAtp && !input.hasKhoModule) {
    out.push({
      id: 'atp-without-kho',
      message:
        'Đang chặn xác nhận khi thiếu ATP nhưng công ty chưa có module Kho — cân nhắc bật «cho phép confirm thiếu hàng» hoặc mở Kho.',
      panel: 'stock',
    });
  }
  if (input.flags.skipApproval && input.hasDefaultWorkflow) {
    out.push({
      id: 'skip-vs-workflow',
      message:
        'Đã chọn «không cần duyệt» nhưng vẫn còn quy trình duyệt mặc định — báo giá vẫn có thể đi theo workflow. Kiểm tra tab Duyệt.',
      panel: 'approval',
    });
  }
  if (
    input.debtWarningDays === 0 &&
    (input.activeProfileId === 'preset:b2b' || input.activeProfileId === 'preset:agency')
  ) {
    out.push({
      id: 'debt-zero-on-strict',
      message:
        'Preset B2B/Đại lý đang dùng nhưng cảnh báo tuổi nợ = 0 (tắt). Cân nhắc bật lại số ngày cảnh báo.',
      panel: 'docs',
    });
  }
  return out;
}

export function resolveActiveProfileLabel(
  activeId: ActiveProfileId,
  profiles: readonly { id: string; name: string }[],
): string {
  if (!activeId) return 'Tùy chỉnh thủ công';
  const preset = SYSTEM_PRESETS.find((p) => p.id === activeId);
  if (preset) return preset.name;
  const company = profiles.find((p) => `profile:${p.id}` === activeId || p.id === activeId);
  if (company) return company.name;
  return 'Tùy chỉnh thủ công';
}

export function isSalesSetupPanel(v: string): v is SalesSetupPanel {
  return SALES_SETUP_PANELS.some((p) => p.key === v);
}
