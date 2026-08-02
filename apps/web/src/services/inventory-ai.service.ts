import 'server-only';
import {
  AI_FEATURE_KEYS,
  hasAiFeature,
  hasAiModule,
} from '@/lib/ai-access';
import { runLoggedLlmCall } from '@/services/ai-usage.service';
import {
  balanceAtp,
  listInventoryTransactions,
  listStockBalances,
  listWarehouses,
} from '@/services/inventory.service';
import { getMyModuleKeys } from '@/services/module-access.service';
import {
  getTenantContext,
  type ActionResult,
} from '@/services/sales-context';
import {
  getAiRuntimeSecret,
  getInventorySettings,
} from '@/services/tenant-settings.service';

const SYSTEM = `Bạn là trợ lý Kho Optimake ERP (một tenant).
Trả lời tiếng Việt, ngắn gọn, dựa snapshot JSON và khối RAG nếu có (trích dẫn tiêu đề tài liệu).
Không bịa số tồn; không nhận lệnh xuất/nhập kho — chỉ tư vấn.
Gợi ý màn hình Tồn / Phiếu / Bin khi thiếu dữ liệu.`;

export async function askInventoryAssistant(
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
    if (!hasAiFeature(moduleKeys, AI_FEATURE_KEYS.inventoryAsk)) {
      return { ok: false, error: 'Chưa được phân quyền «Hỏi đáp Kho» AI.' };
    }
    const runtime = await getAiRuntimeSecret();
    if (!runtime) return { ok: false, error: 'Chưa cấu hình API AI (Cài đặt → AI).' };
    if (!runtime.features.inventoryAsk) {
      return { ok: false, error: 'Hỏi đáp Kho đang tắt. Bật trong Cài đặt → AI.' };
    }

    const [warehouses, balances, txns, inv] = await Promise.all([
      listWarehouses(ctx.supabase),
      listStockBalances(ctx.supabase),
      listInventoryTransactions(ctx.supabase),
      getInventorySettings(),
    ]);

    const snapshot = {
      settings: {
        lowStockThreshold: inv.lowStockThreshold,
        defaultFg: inv.defaultFgWarehouseCode,
        defaultRm: inv.defaultRmWarehouseCode,
      },
      warehouses: warehouses.slice(0, 20).map((w) => ({
        code: w.code,
        name: w.name,
        kind: w.kind,
        active: w.is_active,
      })),
      lowAtp: balances
        .map((b) => ({
          item: b.inventory_items?.sku ?? b.item_id,
          name: b.inventory_items?.name ?? '',
          warehouse: b.warehouses?.code ?? '',
          onHand: Number(b.qty_on_hand),
          reserved: Number(b.qty_reserved),
          atp: balanceAtp(b),
        }))
        .filter((r) => r.atp <= inv.lowStockThreshold)
        .slice(0, 15),
      recentTxns: txns.slice(0, 12).map((t) => ({
        code: t.code,
        type: t.txn_type,
        status: t.status,
        warehouse: t.warehouses?.code ?? null,
      })),
      counts: {
        warehouses: warehouses.length,
        balanceLines: balances.length,
        txnTotal: txns.length,
      },
    };

    const { buildUserPromptWithRag } = await import('@/services/rag.service');
    const user = await buildUserPromptWithRag(
      'kho',
      q,
      `Snapshot Kho:\n${JSON.stringify(snapshot)}\n\nCâu hỏi:\n${q}`,
    );

    const answer = await runLoggedLlmCall({
      supabase: ctx.supabase,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      featureKey: AI_FEATURE_KEYS.inventoryAsk,
      moduleKey: AI_FEATURE_KEYS.inventoryBranch,
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
