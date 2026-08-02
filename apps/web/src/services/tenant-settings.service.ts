import 'server-only';
import {
  getTenantContext,
  requireManager,
  type ActionResult,
  type TenantContext,
} from '@/services/sales-context';

export type SettingsNamespace = 'ai' | 'sales' | 'integrations' | 'notifications' | 'company';

export interface AiSettingsPublic {
  provider: 'openai' | 'azure' | 'anthropic' | 'custom';
  model: string;
  /** Masked — không bao giờ trả plaintext. */
  apiKeyMasked: string | null;
  hasApiKey: boolean;
  baseUrl: string;
  features: {
    copilot: boolean;
    demandForecast: boolean;
    nlpOrderParsing: boolean;
    churnScoring: boolean;
  };
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
}

export interface NotificationsSettings {
  emailApprovalReminder: boolean;
  emailDebtReminder: boolean;
}

const AI_DEFAULTS: AiSettingsPublic = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKeyMasked: null,
  hasApiKey: false,
  baseUrl: '',
  features: {
    copilot: false,
    demandForecast: false,
    nlpOrderParsing: false,
    churnScoring: false,
  },
};

const SALES_DEFAULTS: SalesSettings = {
  currencyLabel: 'VND',
  debtWarningDays: 7,
  allowConfirmWithoutAtp: true,
  defaultQuotationValidDays: 30,
};

const INTEGRATIONS_DEFAULTS: IntegrationsSettings = {
  webhookUrl: '',
  webhookEnabled: false,
};

const NOTIFICATIONS_DEFAULTS: NotificationsSettings = {
  emailApprovalReminder: true,
  emailDebtReminder: true,
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
  const featuresRaw = (map.get('features') ?? {}) as Record<string, unknown>;
  return {
    provider: (asString(map.get('provider'), AI_DEFAULTS.provider) as AiSettingsPublic['provider']),
    model: asString(map.get('model'), AI_DEFAULTS.model),
    apiKeyMasked: rawKey ? maskSecret(rawKey) : null,
    hasApiKey: rawKey.length > 0,
    baseUrl: asString(map.get('base_url'), ''),
    features: {
      copilot: asBool(featuresRaw['copilot'], false),
      demandForecast: asBool(featuresRaw['demandForecast'], false),
      nlpOrderParsing: asBool(featuresRaw['nlpOrderParsing'], false),
      churnScoring: asBool(featuresRaw['churnScoring'], false),
    },
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
  if (!input.model.trim()) return { ok: false, error: 'Model AI không được để trống.' };

  try {
    await upsertSetting(ctx, 'ai', 'provider', input.provider);
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
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}

export async function getNotificationsSettings(): Promise<NotificationsSettings> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  const map = await loadNamespaceMap(ctx, 'notifications');
  return {
    emailApprovalReminder: asBool(
      map.get('email_approval_reminder'),
      NOTIFICATIONS_DEFAULTS.emailApprovalReminder,
    ),
    emailDebtReminder: asBool(
      map.get('email_debt_reminder'),
      NOTIFICATIONS_DEFAULTS.emailDebtReminder,
    ),
  };
}

export async function saveNotificationsSettings(
  input: NotificationsSettings,
): Promise<ActionResult> {
  const ctx = await getTenantContext();
  requireManager(ctx);
  try {
    await upsertSetting(ctx, 'notifications', 'email_approval_reminder', input.emailApprovalReminder);
    await upsertSetting(ctx, 'notifications', 'email_debt_reminder', input.emailDebtReminder);
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lưu thất bại.' };
  }
}
