import 'server-only';
import {
  AI_FEATURE_KEYS,
  hasAiFeature,
  hasAiModule,
} from '@/lib/ai-access';
import { runLoggedLlmCall } from '@/services/ai-usage.service';
import { getMyModuleKeys } from '@/services/module-access.service';
import { listBoms, listWorkOrders } from '@/services/production.service';
import {
  getTenantContext,
  type ActionResult,
} from '@/services/sales-context';
import { getAiRuntimeSecret } from '@/services/tenant-settings.service';

const SYSTEM = `Bạn là trợ lý Sản xuất Optimake ERP (một tenant).
Trả lời tiếng Việt, ngắn gọn, dựa snapshot JSON (BOM / LSX) và khối RAG nếu có.
Không bịa tiến độ; không nhận lệnh release/hoàn thành — chỉ tư vấn.
Gợi ý màn hình BOM / Lệnh sản xuất khi thiếu dữ liệu.`;

export async function askProductionAssistant(
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
    if (!hasAiFeature(moduleKeys, AI_FEATURE_KEYS.productionAsk)) {
      return { ok: false, error: 'Chưa được phân quyền «Hỏi đáp SX» AI.' };
    }
    const runtime = await getAiRuntimeSecret();
    if (!runtime) return { ok: false, error: 'Chưa cấu hình API AI (Cài đặt → AI).' };
    if (!runtime.features.productionAsk) {
      return { ok: false, error: 'Hỏi đáp Sản xuất đang tắt. Bật trong Cài đặt → AI.' };
    }

    const [boms, orders] = await Promise.all([
      listBoms(ctx.supabase),
      listWorkOrders(ctx.supabase),
    ]);

    const byStatus = (status: string) => orders.filter((o) => o.status === status).length;
    const snapshot = {
      counts: {
        boms: boms.length,
        activeBoms: boms.filter((b) => b.status === 'active').length,
        woDraft: byStatus('draft'),
        woReleased: byStatus('released'),
        woInProgress: byStatus('in_progress'),
        woCompleted: byStatus('completed'),
      },
      openOrders: orders
        .filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
        .slice(0, 15)
        .map((o) => ({
          code: o.code,
          status: o.status,
          product: o.inventory_items?.name ?? o.finished_item_id,
          qty: Number(o.qty_planned),
        })),
      boms: boms.slice(0, 10).map((b) => ({
        code: b.code,
        status: b.status,
        product: b.inventory_items?.name ?? b.finished_item_id,
      })),
    };

    const { buildUserPromptWithRag } = await import('@/services/rag.service');
    const user = await buildUserPromptWithRag(
      'san-xuat',
      q,
      `Snapshot Sản xuất:\n${JSON.stringify(snapshot)}\n\nCâu hỏi:\n${q}`,
    );

    const answer = await runLoggedLlmCall({
      supabase: ctx.supabase,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      featureKey: AI_FEATURE_KEYS.productionAsk,
      moduleKey: AI_FEATURE_KEYS.productionBranch,
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
