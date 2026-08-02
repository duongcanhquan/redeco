import 'server-only';
import { isAiProviderId, parseAiProviderId, type AiProviderId } from '@/lib/ai-providers';
import {
  DEFAULT_SETUP_FLAGS,
  SYSTEM_PRESETS,
  type ActiveProfileId,
  type SalesCompanyProfile,
  type SalesProcessSnapshotV1,
  type SalesSetupFlags,
} from '@/lib/sales-setup';
import {
  getTenantContext,
  requireManager,
  type ActionResult,
  type TenantContext,
} from '@/services/sales-context';

export type SettingsNamespace =
  | 'ai'
  | 'sales'
  | 'integrations'
  | 'notifications'
  | 'company'
  | 'inventory'
  | 'production'
  | 'accounting';

export interface AiFeatureFlags {
  /** Hỏi đáp trên Tổng quan Kinh doanh */
  copilot: boolean;
  /** Đánh giá / nhận xét báo giá */
  salesQuoteReview: boolean;
  /** Đánh giá / nhận xét đơn hàng */
  salesOrderReview: boolean;
  demandForecast: boolean;
  nlpOrderParsing: boolean;
  churnScoring: boolean;
}

export interface AiSettingsPublic {
  provider: AiProviderId;
  model: string;
  /** Masked — không bao giờ trả plaintext. */
  apiKeyMasked: string | null;
  hasApiKey: boolean;
  baseUrl: string;
  features: AiFeatureFlags;
}

export interface SalesSettings {
  currencyLabel: string;
  debtWarningDays: number;
  allowConfirmWithoutAtp: boolean;
  defaultQuotationValidDays: number;
}

export interface IntegrationsSettings {
  webhookUrl: string;
  webhookEnabled: boolean;
  webhookSecret: string;
}

export interface NotificationsSettings {
  emailApprovalReminder: boolean;
  emailDebtReminder: boolean;
  emailFrom: string;
  smsEnabled: boolean;
  smsProvider: 'twilio' | 'viettel' | 'custom' | 'none';
  smsSenderId: string;
  smsApprovalReminder: boolean;
  smsDebtReminder: boolean;
}

/** ADR-010 — tham số Kho theo công ty. */
export interface InventorySettings {
  defaultFgWarehouseCode: string;
  defaultRmWarehouseCode: string;
  lowStockThreshold: number;
  /** Giữ chỗ tồn khi xác nhận đơn (cần module Kho). */
  reserveOnSoConfirm: boolean;
  /** true = không xác nhận nếu không giữ chỗ đủ 100% số lượng. */
  requireFullReserveOnConfirm: boolean;
}

/** ADR-010 — tham số / cờ quy trình Sản xuất theo công ty. */
export interface ProductionSettings {
  defaultFgWarehouseCode: string;
  defaultRmWarehouseCode: string;
  defaultLeadTimeDays: number;
  allowReleaseWithoutRm: boolean;
  overReceiptPct: number;
  autoCreateWoOnSoShortfall: boolean;
}

/** ADR-010/011 — capability Kế toán (bật từng công đoạn). */
export interface AccountingSettings {
  arEnabled: boolean;
  cogsEnabled: boolean;
  apEnabled: boolean;
  defaultPaymentTermsDays: number;
}

const AI_DEFAULTS: AiSettingsPublic = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKeyMasked: null,
  hasApiKey: false,
  baseUrl: '',
  features: {
    copilot: false,
    salesQuoteReview: false,
    salesOrderReview: false,
    demandForecast: false,
    nlpOrderParsing: false,
    churnScoring: false,
  },
};

function parseAiFeatures(raw: unknown): AiFeatureFlags {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    copilot: asBool(o['copilot'], AI_DEFAULTS.features.copilot),
    salesQuoteReview: asBool(o['salesQuoteReview'], AI_DEFAULTS.features.salesQuoteReview),
    salesOrderReview: asBool(o['salesOrderReview'], AI_DEFAULTS.features.salesOrderReview),
    demandForecast: asBool(o['demandForecast'], AI_DEFAULTS.features.demandForecast),
    nlpOrderParsing: asBool(o['nlpOrderParsing'], AI_DEFAULTS.features.nlpOrderParsing),
    churnScoring: asBool(o['churnScoring'], AI_DEFAULTS.features.churnScoring),
  };
}

const SALES_DEFAULTS: SalesSettings = {
  currencyLabel: 'VND',
  debtWarningDays: 7,
  allowConfirmWithoutAtp: true,
  defaultQuotationValidDays: 30,
};

const INTEGRATIONS_DEFAULTS: IntegrationsSettings = {
  webhookUrl: '',
  webhookEnabled: false,
  webhookSecret: '',
};

const NOTIFICATIONS_DEFAULTS: NotificationsSettings = {
  emailApprovalReminder: true,
  emailDebtReminder: true,
  emailFrom: '',
  smsEnabled: false,
  smsProvider: 'none',
  smsSenderId: '',
  smsApprovalReminder: false,
  smsDebtReminder: false,
}

const INVENTORY_DEFAULTS: InventorySettings = {
  defaultFgWarehouseCode: 'KHO-TP',
  defaultRmWarehouseCode: 'KHO-NVL',
  lowStockThreshold: 5,
  reserveOnSoConfirm: true,
  requireFullReserveOnConfirm: false,
};

const PRODUCTION_DEFAULTS: ProductionSettings = {
  defaultFgWarehouseCode: 'KHO-TP',
  defaultRmWarehouseCode: 'KHO-NVL',
  defaultLeadTimeDays: 7,
  allowReleaseWithoutRm: false,
  overReceiptPct: 0,
  autoCreateWoOnSoShortfall: false,
};

const ACCOUNTING_DEFAULTS: AccountingSettings = {
  arEnabled: true,
  cogsEnabled: false,
  apEnabled: false,
  defaultPaymentTermsDays: 30,
};

function maskSecret(raw: string | null | undefined): string | null {
  if (!raw || raw.length < 4) return raw ? '••••' : null;
  return `••••${raw.slice(-4)}`;
}

function looksMasked(value: string): boolean {
  return value.trim() === '' || value.includes('•') || value.includes('*');
}

async function loadNamespaceMap(
  ctx: TenantContext,
  namespace: SettingsNamespace,
): Promise<Map<string, unknown>> {
  const { data, error } = await ctx.supabase
    .from('tenant_settings')
    .select('key, value')
    .eq('namespace', namespace);
  if (error) throw new Error(error.message);
  const map = new Map<string, unknown>();
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    map.set(row.key, row.value);
  }
  return map;
}

async function upsertSetting(
  ctx: TenantContext,
  namespace: SettingsNamespace,
  key: string,
  value: unknown,
): Promise<void> {
  const { error } = await ctx.supabase.from('tenant_settings').upsert(
    {
      tenant_id: ctx.tenantId,
      namespace,
      key,
      value: value as never,
      updated_by: ctx.userId,
    },
    { onConflict: 'tenant_id,namespace,key' },
  );
  if (error) throw new Error(error.message);
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export async function getAiSettings(): Promise<AiSettingsPublic> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const map = await loadNamespaceMap(ctx, 'ai');
  const rawKey = asString(map.get('api_key'), '');
  return {
    provider: parseAiProviderId(asString(map.get('provider'), AI_DEFAULTS.provider)),
    model: asString(map.get('model'), AI_DEFAULTS.model),
    apiKeyMasked: rawKey ? maskSecret(rawKey) : null,
    hasApiKey: rawKey.length > 0,
    baseUrl: asString(map.get('base_url'), ''),
    features: parseAiFeatures(map.get('features')),
  };
}

/** Trạng thái AI KD — mọi user đăng nhập trong tenant (không lộ key). */
export async function getAiAssistantAvailability(): Promise<{
  /** Superadmin đã cấp module `ai` (hoặc con) cho công ty/user */
  entitled: boolean;
  entitledHubChat: boolean;
  entitledQuoteReview: boolean;
  entitledOrderReview: boolean;
  configured: boolean;
  features: AiFeatureFlags;
}> {
  const ctx = await getTenantContext();
  const { getMyModuleKeys } = await import('@/services/module-access.service');
  const {
    AI_FEATURE_KEYS,
    hasAiFeature,
    hasAiModule,
  } = await import('@/lib/ai-access');
  const moduleKeys = await getMyModuleKeys();
  const map = await loadNamespaceMap(ctx, 'ai');
  const rawKey = asString(map.get('api_key'), '');
  return {
    entitled: hasAiModule(moduleKeys),
    entitledHubChat: hasAiFeature(moduleKeys, AI_FEATURE_KEYS.hubChat),
    entitledQuoteReview: hasAiFeature(moduleKeys, AI_FEATURE_KEYS.quoteReview),
    entitledOrderReview: hasAiFeature(moduleKeys, AI_FEATURE_KEYS.orderReview),
    configured: rawKey.length > 0,
    features: parseAiFeatures(map.get('features')),
  };
}

/** Chỉ dùng server khi gọi LLM — có plaintext key. */
export async function getAiRuntimeSecret(): Promise<{
  provider: AiProviderId;
  model: string;
  baseUrl: string;
  apiKey: string;
  features: AiFeatureFlags;
} | null> {
  const ctx = await getTenantContext();
  const map = await loadNamespaceMap(ctx, 'ai');
  const apiKey = asString(map.get('api_key'), '').trim();
  if (!apiKey) return null;
  return {
    provider: parseAiProviderId(asString(map.get('provider'), AI_DEFAULTS.provider)),
    model: asString(map.get('model'), AI_DEFAULTS.model),
    baseUrl: asString(map.get('base_url'), ''),
    apiKey,
    features: parseAiFeatures(map.get('features')),
  };
}

export interface AiSettingsInput {
  provider: AiSettingsPublic['provider'];
  model: string;
  /** Plaintext mới, hoặc chuỗi mask / rỗng = giữ nguyên. */
  apiKey: string;
  baseUrl: string;
  features: AiSettingsPublic['features'];
}

export async function saveAiSettings(input: AiSettingsInput): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (!isAiProviderId(input.provider)) {
    return { ok: false, error: 'Nhà cung cấp AI không hợp lệ.' };
  }
  const provider = input.provider;
  if (!input.model.trim()) return { ok: false, error: 'Model AI không được để trống.' };
  if (provider === 'custom' && !input.baseUrl.trim()) {
    return { ok: false, error: 'Tùy chỉnh bắt buộc điền địa chỉ API.' };
  }

  try {
    await upsertSetting(ctx, 'ai', 'provider', provider);
    await upsertSetting(ctx, 'ai', 'model', input.model.trim());
    await upsertSetting(ctx, 'ai', 'base_url', input.baseUrl.trim());
    await upsertSetting(ctx, 'ai', 'features', input.features);

    if (!looksMasked(input.apiKey)) {
      await upsertSetting(ctx, 'ai', 'api_key', input.apiKey.trim());
    }
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

export async function getSalesSettings(): Promise<SalesSettings> {
  const ctx = await getTenantContext();
  const map = await loadNamespaceMap(ctx, 'sales');
  return {
    currencyLabel: asString(map.get('currency_label'), SALES_DEFAULTS.currencyLabel),
    debtWarningDays: asNumber(map.get('debt_warning_days'), SALES_DEFAULTS.debtWarningDays),
    allowConfirmWithoutAtp: asBool(
      map.get('allow_confirm_without_atp'),
      SALES_DEFAULTS.allowConfirmWithoutAtp,
    ),
    defaultQuotationValidDays: asNumber(
      map.get('default_quotation_valid_days'),
      SALES_DEFAULTS.defaultQuotationValidDays,
    ),
  };
}

export async function saveSalesSettings(input: SalesSettings): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (input.debtWarningDays < 0 || input.debtWarningDays > 365) {
    return { ok: false, error: 'Số ngày cảnh báo công nợ phải trong 0–365.' };
  }
  if (input.defaultQuotationValidDays < 1 || input.defaultQuotationValidDays > 365) {
    return { ok: false, error: 'Hiệu lực báo giá mặc định phải trong 1–365 ngày.' };
  }
  try {
    await upsertSetting(ctx, 'sales', 'currency_label', input.currencyLabel.trim() || 'VND');
    await upsertSetting(ctx, 'sales', 'debt_warning_days', input.debtWarningDays);
    await upsertSetting(ctx, 'sales', 'allow_confirm_without_atp', input.allowConfirmWithoutAtp);
    await upsertSetting(
      ctx,
      'sales',
      'default_quotation_valid_days',
      input.defaultQuotationValidDays,
    );
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

export async function getIntegrationsSettings(): Promise<IntegrationsSettings> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const map = await loadNamespaceMap(ctx, 'integrations');
  return {
    webhookUrl: asString(map.get('webhook_url'), INTEGRATIONS_DEFAULTS.webhookUrl),
    webhookEnabled: asBool(map.get('webhook_enabled'), INTEGRATIONS_DEFAULTS.webhookEnabled),
    webhookSecret: asString(map.get('webhook_secret'), INTEGRATIONS_DEFAULTS.webhookSecret),
  };
}

export async function saveIntegrationsSettings(
  input: IntegrationsSettings,
): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (input.webhookEnabled && input.webhookUrl.trim()) {
    try {
      const u = new URL(input.webhookUrl.trim());
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        return { ok: false, error: 'Webhook URL phải là http(s).' };
      }
    } catch {
      return { ok: false, error: 'Webhook URL không hợp lệ.' };
    }
  }
  try {
    await upsertSetting(ctx, 'integrations', 'webhook_url', input.webhookUrl.trim());
    await upsertSetting(ctx, 'integrations', 'webhook_enabled', input.webhookEnabled);
    await upsertSetting(ctx, 'integrations', 'webhook_secret', input.webhookSecret.trim());
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

export async function getNotificationsSettings(): Promise<NotificationsSettings> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const map = await loadNamespaceMap(ctx, 'notifications');
  const providerRaw = asString(map.get('sms_provider'), NOTIFICATIONS_DEFAULTS.smsProvider);
  const smsProvider = (
    ['twilio', 'viettel', 'custom', 'none'] as const
  ).includes(providerRaw as NotificationsSettings['smsProvider'])
    ? (providerRaw as NotificationsSettings['smsProvider'])
    : 'none';
  return {
    emailApprovalReminder: asBool(
      map.get('email_approval_reminder'),
      NOTIFICATIONS_DEFAULTS.emailApprovalReminder,
    ),
    emailDebtReminder: asBool(
      map.get('email_debt_reminder'),
      NOTIFICATIONS_DEFAULTS.emailDebtReminder,
    ),
    emailFrom: asString(map.get('email_from'), NOTIFICATIONS_DEFAULTS.emailFrom),
    smsEnabled: asBool(map.get('sms_enabled'), NOTIFICATIONS_DEFAULTS.smsEnabled),
    smsProvider,
    smsSenderId: asString(map.get('sms_sender_id'), NOTIFICATIONS_DEFAULTS.smsSenderId),
    smsApprovalReminder: asBool(
      map.get('sms_approval_reminder'),
      NOTIFICATIONS_DEFAULTS.smsApprovalReminder,
    ),
    smsDebtReminder: asBool(
      map.get('sms_debt_reminder'),
      NOTIFICATIONS_DEFAULTS.smsDebtReminder,
    ),
  };
}

export async function saveNotificationsSettings(
  input: NotificationsSettings,
): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (input.emailFrom.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.emailFrom.trim())) {
      return { ok: false, error: 'Email gửi đi không hợp lệ.' };
    }
  }
  try {
    await upsertSetting(ctx, 'notifications', 'email_approval_reminder', input.emailApprovalReminder);
    await upsertSetting(ctx, 'notifications', 'email_debt_reminder', input.emailDebtReminder);
    await upsertSetting(ctx, 'notifications', 'email_from', input.emailFrom.trim());
    await upsertSetting(ctx, 'notifications', 'sms_enabled', input.smsEnabled);
    await upsertSetting(ctx, 'notifications', 'sms_provider', input.smsProvider);
    await upsertSetting(ctx, 'notifications', 'sms_sender_id', input.smsSenderId.trim());
    await upsertSetting(ctx, 'notifications', 'sms_approval_reminder', input.smsApprovalReminder);
    await upsertSetting(ctx, 'notifications', 'sms_debt_reminder', input.smsDebtReminder);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

export async function getInventorySettings(): Promise<InventorySettings> {
  const ctx = await getTenantContext();
  const map = await loadNamespaceMap(ctx, 'inventory');
  return {
    defaultFgWarehouseCode: asString(
      map.get('default_fg_warehouse_code'),
      INVENTORY_DEFAULTS.defaultFgWarehouseCode,
    ),
    defaultRmWarehouseCode: asString(
      map.get('default_rm_warehouse_code'),
      INVENTORY_DEFAULTS.defaultRmWarehouseCode,
    ),
    lowStockThreshold: asNumber(
      map.get('low_stock_threshold'),
      INVENTORY_DEFAULTS.lowStockThreshold,
    ),
    reserveOnSoConfirm: asBool(
      map.get('reserve_on_so_confirm'),
      INVENTORY_DEFAULTS.reserveOnSoConfirm,
    ),
    requireFullReserveOnConfirm: asBool(
      map.get('require_full_reserve_on_confirm'),
      INVENTORY_DEFAULTS.requireFullReserveOnConfirm,
    ),
  };
}

export async function saveInventorySettings(input: InventorySettings): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (!input.defaultFgWarehouseCode.trim() || !input.defaultRmWarehouseCode.trim()) {
    return { ok: false, error: 'Mã kho TP và NVL không được để trống.' };
  }
  if (input.lowStockThreshold < 0 || input.lowStockThreshold > 1_000_000) {
    return { ok: false, error: 'Ngưỡng tồn thấp phải trong 0–1.000.000.' };
  }
  try {
    await upsertSetting(
      ctx,
      'inventory',
      'default_fg_warehouse_code',
      input.defaultFgWarehouseCode.trim().toUpperCase(),
    );
    await upsertSetting(
      ctx,
      'inventory',
      'default_rm_warehouse_code',
      input.defaultRmWarehouseCode.trim().toUpperCase(),
    );
    await upsertSetting(ctx, 'inventory', 'low_stock_threshold', input.lowStockThreshold);
    await upsertSetting(ctx, 'inventory', 'reserve_on_so_confirm', input.reserveOnSoConfirm);
    await upsertSetting(
      ctx,
      'inventory',
      'require_full_reserve_on_confirm',
      input.requireFullReserveOnConfirm,
    );
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

export async function getProductionSettings(): Promise<ProductionSettings> {
  const ctx = await getTenantContext();
  const map = await loadNamespaceMap(ctx, 'production');
  return {
    defaultFgWarehouseCode: asString(
      map.get('default_fg_warehouse_code'),
      PRODUCTION_DEFAULTS.defaultFgWarehouseCode,
    ),
    defaultRmWarehouseCode: asString(
      map.get('default_rm_warehouse_code'),
      PRODUCTION_DEFAULTS.defaultRmWarehouseCode,
    ),
    defaultLeadTimeDays: asNumber(
      map.get('default_lead_time_days'),
      PRODUCTION_DEFAULTS.defaultLeadTimeDays,
    ),
    allowReleaseWithoutRm: asBool(
      map.get('allow_release_without_rm'),
      PRODUCTION_DEFAULTS.allowReleaseWithoutRm,
    ),
    overReceiptPct: asNumber(map.get('over_receipt_pct'), PRODUCTION_DEFAULTS.overReceiptPct),
    autoCreateWoOnSoShortfall: asBool(
      map.get('auto_create_wo_on_so_shortfall'),
      PRODUCTION_DEFAULTS.autoCreateWoOnSoShortfall,
    ),
  };
}

export async function saveProductionSettings(input: ProductionSettings): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (!input.defaultFgWarehouseCode.trim() || !input.defaultRmWarehouseCode.trim()) {
    return { ok: false, error: 'Mã kho TP và NVL không được để trống.' };
  }
  if (input.defaultLeadTimeDays < 0 || input.defaultLeadTimeDays > 365) {
    return { ok: false, error: 'Lead time CTP phải trong 0–365 ngày.' };
  }
  if (input.overReceiptPct < 0 || input.overReceiptPct > 100) {
    return { ok: false, error: '% nhập TP vượt kế hoạch phải trong 0–100.' };
  }
  try {
    await upsertSetting(
      ctx,
      'production',
      'default_fg_warehouse_code',
      input.defaultFgWarehouseCode.trim().toUpperCase(),
    );
    await upsertSetting(
      ctx,
      'production',
      'default_rm_warehouse_code',
      input.defaultRmWarehouseCode.trim().toUpperCase(),
    );
    await upsertSetting(ctx, 'production', 'default_lead_time_days', input.defaultLeadTimeDays);
    await upsertSetting(
      ctx,
      'production',
      'allow_release_without_rm',
      input.allowReleaseWithoutRm,
    );
    await upsertSetting(ctx, 'production', 'over_receipt_pct', input.overReceiptPct);
    await upsertSetting(
      ctx,
      'production',
      'auto_create_wo_on_so_shortfall',
      input.autoCreateWoOnSoShortfall,
    );
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

export async function getAccountingSettings(): Promise<AccountingSettings> {
  const ctx = await getTenantContext();
  const map = await loadNamespaceMap(ctx, 'accounting');
  return {
    arEnabled: asBool(map.get('ar_enabled'), ACCOUNTING_DEFAULTS.arEnabled),
    cogsEnabled: asBool(map.get('cogs_enabled'), ACCOUNTING_DEFAULTS.cogsEnabled),
    apEnabled: asBool(map.get('ap_enabled'), ACCOUNTING_DEFAULTS.apEnabled),
    defaultPaymentTermsDays: asNumber(
      map.get('default_payment_terms_days'),
      ACCOUNTING_DEFAULTS.defaultPaymentTermsDays,
    ),
  };
}

export async function saveAccountingSettings(input: AccountingSettings): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (input.defaultPaymentTermsDays < 0 || input.defaultPaymentTermsDays > 365) {
    return { ok: false, error: 'Số ngày công nợ phải trong 0–365.' };
  }
  try {
    await upsertSetting(ctx, 'accounting', 'ar_enabled', input.arEnabled);
    await upsertSetting(ctx, 'accounting', 'cogs_enabled', input.cogsEnabled);
    await upsertSetting(ctx, 'accounting', 'ap_enabled', input.apEnabled);
    await upsertSetting(
      ctx,
      'accounting',
      'default_payment_terms_days',
      input.defaultPaymentTermsDays,
    );
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

/* ─── Sales setup hub (flags + profiles) ─── */

function parseSetupFlags(raw: unknown): SalesSetupFlags {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETUP_FLAGS };
  const o = raw as Record<string, unknown>;
  return {
    skipApproval: asBool(o['skipApproval'], false),
    skipDiscountRules: asBool(o['skipDiscountRules'], false),
    ackDeliveryInvoice: asBool(o['ackDeliveryInvoice'], false),
    ackStockPolicy: asBool(o['ackStockPolicy'], false),
  };
}

function parseProfiles(raw: unknown): SalesCompanyProfile[] {
  if (!Array.isArray(raw)) return [];
  const out: SalesCompanyProfile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const snap = o['snapshot'];
    if (!snap || typeof snap !== 'object') continue;
    const s = snap as Record<string, unknown>;
    const id = asString(o['id'], '');
    const name = asString(o['name'], '');
    if (!id || !name) continue;
    out.push({
      id,
      name,
      description: asString(o['description'], ''),
      createdAt: asString(o['createdAt'], new Date().toISOString()),
      updatedAt: asString(o['updatedAt'], new Date().toISOString()),
      snapshot: {
        schemaVersion: 1,
        currencyLabel: asString(s['currencyLabel'], SALES_DEFAULTS.currencyLabel),
        defaultQuotationValidDays: asNumber(
          s['defaultQuotationValidDays'],
          SALES_DEFAULTS.defaultQuotationValidDays,
        ),
        debtWarningDays: asNumber(s['debtWarningDays'], SALES_DEFAULTS.debtWarningDays),
        allowConfirmWithoutAtp: asBool(
          s['allowConfirmWithoutAtp'],
          SALES_DEFAULTS.allowConfirmWithoutAtp,
        ),
        reserveOnSoConfirm: asBool(s['reserveOnSoConfirm'], true),
        requireFullReserveOnConfirm: asBool(s['requireFullReserveOnConfirm'], false),
        skipApproval: asBool(s['skipApproval'], false),
        skipDiscountRules: asBool(s['skipDiscountRules'], false),
      },
    });
  }
  return out;
}

export interface SalesSetupState {
  sales: SalesSettings;
  inventory: Pick<
    InventorySettings,
    'reserveOnSoConfirm' | 'requireFullReserveOnConfirm'
  >;
  flags: SalesSetupFlags;
  profiles: SalesCompanyProfile[];
  activeProfileId: ActiveProfileId;
}

export async function getSalesSetupState(): Promise<SalesSetupState> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const [salesMap, invMap] = await Promise.all([
    loadNamespaceMap(ctx, 'sales'),
    loadNamespaceMap(ctx, 'inventory'),
  ]);
  const sales: SalesSettings = {
    currencyLabel: asString(salesMap.get('currency_label'), SALES_DEFAULTS.currencyLabel),
    debtWarningDays: asNumber(salesMap.get('debt_warning_days'), SALES_DEFAULTS.debtWarningDays),
    allowConfirmWithoutAtp: asBool(
      salesMap.get('allow_confirm_without_atp'),
      SALES_DEFAULTS.allowConfirmWithoutAtp,
    ),
    defaultQuotationValidDays: asNumber(
      salesMap.get('default_quotation_valid_days'),
      SALES_DEFAULTS.defaultQuotationValidDays,
    ),
  };
  return {
    sales,
    inventory: {
      reserveOnSoConfirm: asBool(
        invMap.get('reserve_on_so_confirm'),
        INVENTORY_DEFAULTS.reserveOnSoConfirm,
      ),
      requireFullReserveOnConfirm: asBool(
        invMap.get('require_full_reserve_on_confirm'),
        INVENTORY_DEFAULTS.requireFullReserveOnConfirm,
      ),
    },
    flags: parseSetupFlags(salesMap.get('setup_flags')),
    profiles: parseProfiles(salesMap.get('profiles')),
    activeProfileId: (() => {
      const v = salesMap.get('active_profile_id');
      return typeof v === 'string' && v.length > 0 ? v : null;
    })(),
  };
}

async function applySnapshot(
  ctx: TenantContext,
  snapshot: SalesProcessSnapshotV1,
  activeId: string,
): Promise<void> {
  await upsertSetting(ctx, 'sales', 'currency_label', snapshot.currencyLabel.trim() || 'VND');
  await upsertSetting(ctx, 'sales', 'debt_warning_days', snapshot.debtWarningDays);
  await upsertSetting(
    ctx,
    'sales',
    'allow_confirm_without_atp',
    snapshot.allowConfirmWithoutAtp,
  );
  await upsertSetting(
    ctx,
    'sales',
    'default_quotation_valid_days',
    snapshot.defaultQuotationValidDays,
  );
  await upsertSetting(ctx, 'inventory', 'reserve_on_so_confirm', snapshot.reserveOnSoConfirm);
  await upsertSetting(
    ctx,
    'inventory',
    'require_full_reserve_on_confirm',
    snapshot.requireFullReserveOnConfirm && snapshot.reserveOnSoConfirm,
  );
  const map = await loadNamespaceMap(ctx, 'sales');
  const flags = parseSetupFlags(map.get('setup_flags'));
  const nextFlags: SalesSetupFlags = {
    ...flags,
    skipApproval: snapshot.skipApproval,
    skipDiscountRules: snapshot.skipDiscountRules,
    ackStockPolicy: true,
  };
  await upsertSetting(ctx, 'sales', 'setup_flags', nextFlags);
  await upsertSetting(ctx, 'sales', 'active_profile_id', activeId);
}

export async function applySalesPreset(presetId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const preset = SYSTEM_PRESETS.find((p) => p.id === presetId);
  if (!preset) return { ok: false, error: 'Preset không tồn tại.' };
  try {
    await applySnapshot(ctx, preset.snapshot, preset.id);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Áp preset thất bại.' };
  }
}

export async function applySalesCompanyProfile(profileId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const map = await loadNamespaceMap(ctx, 'sales');
  const profiles = parseProfiles(map.get('profiles'));
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) return { ok: false, error: 'Profile không tồn tại.' };
  try {
    await applySnapshot(ctx, profile.snapshot, `profile:${profile.id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Áp profile thất bại.' };
  }
}

export async function saveSalesCompanyProfile(input: {
  id?: string;
  name: string;
  description: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Tên profile không được để trống.' };
  if (name.length > 80) return { ok: false, error: 'Tên profile tối đa 80 ký tự.' };

  try {
    const state = await getSalesSetupState();
    const now = new Date().toISOString();
    const snapshot: SalesProcessSnapshotV1 = {
      schemaVersion: 1,
      currencyLabel: state.sales.currencyLabel,
      defaultQuotationValidDays: state.sales.defaultQuotationValidDays,
      debtWarningDays: state.sales.debtWarningDays,
      allowConfirmWithoutAtp: state.sales.allowConfirmWithoutAtp,
      reserveOnSoConfirm: state.inventory.reserveOnSoConfirm,
      requireFullReserveOnConfirm: state.inventory.requireFullReserveOnConfirm,
      skipApproval: state.flags.skipApproval,
      skipDiscountRules: state.flags.skipDiscountRules,
    };

    let profiles = [...state.profiles];
    let id = input.id?.trim() ?? '';

    if (id) {
      const idx = profiles.findIndex((p) => p.id === id);
      if (idx < 0) return { ok: false, error: 'Profile không tồn tại.' };
      const prev = profiles[idx]!;
      profiles[idx] = {
        ...prev,
        name,
        description: input.description.trim(),
        updatedAt: now,
        snapshot,
      };
    } else {
      if (profiles.length >= 20) {
        return { ok: false, error: 'Tối đa 20 profile công ty. Xóa bớt trước khi lưu mới.' };
      }
      id = crypto.randomUUID();
      profiles.push({
        id,
        name,
        description: input.description.trim(),
        createdAt: now,
        updatedAt: now,
        snapshot,
      });
    }

    await upsertSetting(ctx, 'sales', 'profiles', profiles);
    await upsertSetting(ctx, 'sales', 'active_profile_id', `profile:${id}`);
    return { ok: true, data: { id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu profile thất bại.' };
  }
}

export async function deleteSalesCompanyProfile(profileId: string): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  try {
    const map = await loadNamespaceMap(ctx, 'sales');
    const profiles = parseProfiles(map.get('profiles')).filter((p) => p.id !== profileId);
    const active = asString(map.get('active_profile_id'), '');
    await upsertSetting(ctx, 'sales', 'profiles', profiles);
    if (active === `profile:${profileId}` || active === profileId) {
      await upsertSetting(ctx, 'sales', 'active_profile_id', null);
    }
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Xóa profile thất bại.' };
  }
}

export async function saveSalesSetupFlags(
  patch: Partial<SalesSetupFlags>,
): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  try {
    const map = await loadNamespaceMap(ctx, 'sales');
    const flags = { ...parseSetupFlags(map.get('setup_flags')), ...patch };
    await upsertSetting(ctx, 'sales', 'setup_flags', flags);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu cờ setup thất bại.' };
  }
}

/** Lưu panel chứng từ — đánh dấu tùy chỉnh thủ công (xóa active profile). */
export async function saveSalesDocsSettings(input: SalesSettings): Promise<ActionResult> {
  const saved = await saveSalesSettings(input);
  if (!saved.ok) return saved;
  const ctx = await getTenantContext();
  try {
    await upsertSetting(ctx, 'sales', 'active_profile_id', null);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

/** Lưu panel tồn + ack checklist. */
export async function saveSalesStockPolicy(input: {
  allowConfirmWithoutAtp: boolean;
  reserveOnSoConfirm: boolean;
  requireFullReserveOnConfirm: boolean;
}): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  if (input.requireFullReserveOnConfirm && !input.reserveOnSoConfirm) {
    return {
      ok: false,
      error: 'Không thể bắt buộc giữ chỗ đủ khi đã tắt giữ chỗ khi xác nhận.',
    };
  }
  try {
    await upsertSetting(
      ctx,
      'sales',
      'allow_confirm_without_atp',
      input.allowConfirmWithoutAtp,
    );
    await upsertSetting(ctx, 'inventory', 'reserve_on_so_confirm', input.reserveOnSoConfirm);
    await upsertSetting(
      ctx,
      'inventory',
      'require_full_reserve_on_confirm',
      input.requireFullReserveOnConfirm,
    );
    const map = await loadNamespaceMap(ctx, 'sales');
    const flags = parseSetupFlags(map.get('setup_flags'));
    await upsertSetting(ctx, 'sales', 'setup_flags', { ...flags, ackStockPolicy: true });
    await upsertSetting(ctx, 'sales', 'active_profile_id', null);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}
