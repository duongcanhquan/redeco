import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callTenantLlm } from '@/services/ai-llm.service';
import type { AiProviderId } from '@/lib/ai-providers';

export const AI_USER_HOURLY_MAX = 20;
export const AI_TENANT_DAILY_MAX = 200;

export interface AiUsageLogInput {
  tenantId: string;
  userId: string;
  featureKey: string;
  moduleKey: string;
  ok: boolean;
  latencyMs?: number;
  errorCode?: string;
  meta?: Record<string, unknown>;
}

/** Enforce hạn mức qua RPC SECURITY DEFINER (đếm mọi lần gọi, ngày VN). */
export async function assertAiRateLimits(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc('ai_assert_rate_limits', {
    p_user_id: userId,
  });
  if (error) {
    throw new Error(error.message || 'Vượt hạn mức AI.');
  }
}

export async function logAiUsage(
  supabase: SupabaseClient,
  input: AiUsageLogInput,
): Promise<void> {
  await supabase.from('ai_usage_logs').insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    feature_key: input.featureKey,
    module_key: input.moduleKey,
    ok: input.ok,
    latency_ms: input.latencyMs ?? null,
    error_code: input.errorCode ?? null,
    meta: input.meta ?? {},
  });
}

export async function countAiUsageToday(
  supabase: SupabaseClient,
): Promise<{ okCalls: number; failCalls: number; limit: number }> {
  const { data, error } = await supabase.rpc('ai_usage_stats_today');
  if (error) {
    return { okCalls: 0, failCalls: 0, limit: AI_TENANT_DAILY_MAX };
  }
  const raw = data as {
    okCalls?: number;
    failCalls?: number;
    limit?: number;
  } | null;
  return {
    okCalls: Number(raw?.okCalls ?? 0),
    failCalls: Number(raw?.failCalls ?? 0),
    limit: Number(raw?.limit ?? AI_TENANT_DAILY_MAX),
  };
}

export async function listRecentAiUsage(
  supabase: SupabaseClient,
  limit = 20,
): Promise<
  {
    id: string;
    feature_key: string;
    module_key: string;
    ok: boolean;
    latency_ms: number | null;
    created_at: string;
  }[]
> {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('id, feature_key, module_key, ok, latency_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as {
    id: string;
    feature_key: string;
    module_key: string;
    ok: boolean;
    latency_ms: number | null;
    created_at: string;
  }[];
}

/** Gọi LLM + ghi usage (thành công / thất bại). */
export async function runLoggedLlmCall(input: {
  supabase: SupabaseClient;
  tenantId: string;
  userId: string;
  featureKey: string;
  moduleKey: string;
  provider: AiProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  system: string;
  user: string;
}): Promise<string> {
  await assertAiRateLimits(input.supabase, input.userId);
  const started = Date.now();
  try {
    const answer = await callTenantLlm({
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      system: input.system,
      user: input.user,
    });
    await logAiUsage(input.supabase, {
      tenantId: input.tenantId,
      userId: input.userId,
      featureKey: input.featureKey,
      moduleKey: input.moduleKey,
      ok: true,
      latencyMs: Date.now() - started,
    });
    return answer;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'llm_error';
    await logAiUsage(input.supabase, {
      tenantId: input.tenantId,
      userId: input.userId,
      featureKey: input.featureKey,
      moduleKey: input.moduleKey,
      ok: false,
      latencyMs: Date.now() - started,
      errorCode: msg.slice(0, 120),
    });
    throw e;
  }
}
