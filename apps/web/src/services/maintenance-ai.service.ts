import 'server-only';
import {
  AI_FEATURE_KEYS,
  hasAiFeature,
  hasAiModule,
} from '@/lib/ai-access';
import { runLoggedLlmCall } from '@/services/ai-usage.service';
import {
  computeEquipmentOeeRows,
  listEquipment,
  listMaintenanceOrders,
  listMaintenancePlans,
  listMeters,
  listWorkRequests,
} from '@/services/maintenance.service';
import { getMyModuleKeys } from '@/services/module-access.service';
import {
  getTenantContext,
  type ActionResult,
} from '@/services/sales-context';
import { getAiRuntimeSecret } from '@/services/tenant-settings.service';

const SYSTEM = `Bạn là trợ lý Thiết bị & Bảo trì Optimake ERP (một tenant).
Trả lời tiếng Việt, ngắn gọn, dựa snapshot JSON và khối RAG nếu có (trích dẫn tiêu đề SOP).
Không bịa số máy/lệnh/OEE; không nhận lệnh tạo phiếu — chỉ tư vấn.
Gợi ý màn Thiết bị / Yêu cầu / Lệnh BT / Meter / OEE khi thiếu dữ liệu.`;

export async function askEquipmentAssistant(
  question: string,
): Promise<ActionResult<{ answer: string }>> {
  const q = question.trim();
  if (q.length < 2) return { ok: false, error: 'Nhập câu hỏi cụ thể hơn.' };
  if (q.length > 1000) return { ok: false, error: 'Câu hỏi tối đa 1000 ký tự.' };

  try {
    const ctx = await getTenantContext();
    const moduleKeys = await getMyModuleKeys();
    if (!hasAiModule(moduleKeys)) {
      return { ok: false, error: 'Chưa cấp module Trợ lý AI.' };
    }
    if (!hasAiFeature(moduleKeys, AI_FEATURE_KEYS.equipmentAsk)) {
      return { ok: false, error: 'Chưa được phân quyền «Hỏi đáp TB» AI.' };
    }
    const runtime = await getAiRuntimeSecret();
    if (!runtime) return { ok: false, error: 'Chưa cấu hình API AI (Cài đặt → AI).' };
    if (!runtime.features.equipmentAsk) {
      return { ok: false, error: 'Hỏi đáp Thiết bị đang tắt. Bật trong Cài đặt → AI.' };
    }

    const asOf = new Date().toISOString().slice(0, 10);
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 29);
    const fromIso = from.toISOString().slice(0, 10);

    const [equipment, requests, orders, plans, meters, oee] = await Promise.all([
      listEquipment(ctx.supabase),
      listWorkRequests(ctx.supabase),
      listMaintenanceOrders(ctx.supabase),
      listMaintenancePlans(ctx.supabase),
      listMeters(ctx.supabase),
      computeEquipmentOeeRows(ctx.supabase, fromIso, asOf),
    ]);

    const snapshot = {
      asOf,
      oeeWindow: { from: fromIso, to: asOf },
      counts: {
        equipment: equipment.length,
        down: equipment.filter((e) => e.status === 'down').length,
        openRequests: requests.filter(
          (r) => r.status === 'open' || r.status === 'approved',
        ).length,
        openOrders: orders.filter(
          (o) =>
            o.status === 'draft' ||
            o.status === 'released' ||
            o.status === 'in_progress',
        ).length,
        plansDue: plans.filter((p) => p.is_active && p.next_due_on <= asOf).length,
        meters: meters.length,
        metersWarn: meters.filter((m) => m.alertLevel === 'warn').length,
        metersCritical: meters.filter((m) => m.alertLevel === 'critical').length,
      },
      oeeSample: oee.slice(0, 8).map((r) => ({
        code: r.equipmentCode,
        oeePct: Math.round(r.oee * 1000) / 10,
        availabilityPct: Math.round(r.availability * 1000) / 10,
        downtimeMin: r.downtimeMinutes,
      })),
      metersAlert: meters
        .filter((m) => m.alertLevel !== 'ok')
        .slice(0, 10)
        .map((m) => ({
          code: m.code,
          equipment: m.eam_equipment?.code,
          value: m.last_value,
          level: m.alertLevel,
        })),
    };

    const { buildUserPromptWithRag } = await import('@/services/rag.service');
    const user = await buildUserPromptWithRag(
      'thiet-bi',
      q,
      `Snapshot Thiết bị/BT:\n${JSON.stringify(snapshot)}\n\nCâu hỏi:\n${q}`,
    );

    const answer = await runLoggedLlmCall({
      supabase: ctx.supabase,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      featureKey: AI_FEATURE_KEYS.equipmentAsk,
      moduleKey: AI_FEATURE_KEYS.equipmentBranch,
      provider: runtime.provider,
      model: runtime.model,
      apiKey: runtime.apiKey,
      baseUrl: runtime.baseUrl,
      system: SYSTEM,
      user,
    });
    return { ok: true, data: { answer } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không gọi được AI.' };
  }
}
