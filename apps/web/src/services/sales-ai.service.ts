import 'server-only';
import {
  AI_FEATURE_KEYS,
  hasAiFeature,
  hasAiModule,
} from '@/lib/ai-access';
import { runLoggedLlmCall } from '@/services/ai-usage.service';
import {
  getTenantContext,
  type ActionResult,
} from '@/services/sales-context';
import { getSalesDashboardData } from '@/services/sales-analytics.service';
import { getMyModuleKeys } from '@/services/module-access.service';
import {
  getAiRuntimeSecret,
  getSalesSettings,
} from '@/services/tenant-settings.service';

export interface SalesAiSnapshot {
  currencyLabel: string;
  debtWarningDays: number;
  kpis: {
    activeCustomers: number;
    quotesPending: number;
    ordersActive: number;
    unpaidTotal: number;
    unpaidCount: number;
    overdueCount: number;
    lowStockCount: number;
  };
  orderPipeline: { status: string; label: string; count: number }[];
  quoteFunnel: { status: string; label: string; count: number }[];
  queues: {
    approvals: { code: string; title: string; meta: string }[];
    deliveries: { code: string; title: string; meta: string }[];
    debts: { code: string; title: string; meta: string }[];
  };
  lowStock: { sku: string; name: string; qty: number }[];
  revenue14dSum: number;
}

export async function buildSalesAiSnapshot(basePath: string): Promise<SalesAiSnapshot> {
  const ctx = await getTenantContext();
  const [data, sales] = await Promise.all([
    getSalesDashboardData(ctx.supabase, basePath),
    getSalesSettings(),
  ]);
  const trimQ = <T extends { code: string; title: string; meta: string }>(rows: T[]) =>
    rows.slice(0, 10).map((r) => ({ code: r.code, title: r.title, meta: r.meta }));

  return {
    currencyLabel: sales.currencyLabel,
    debtWarningDays: sales.debtWarningDays,
    kpis: data.kpis,
    orderPipeline: data.pipeline.map((p) => ({
      status: p.key,
      label: p.label,
      count: p.count,
    })),
    quoteFunnel: data.quoteStatuses.map((p) => ({
      status: p.key,
      label: p.label,
      count: p.count,
    })),
    queues: {
      approvals: trimQ(data.queues.approvals),
      deliveries: trimQ(data.queues.deliveries),
      debts: trimQ(data.queues.debts),
    },
    lowStock: data.lowStock.slice(0, 10),
    revenue14dSum: data.revenue14d.reduce((s, p) => s + p.amount, 0),
  };
}

const SYSTEM_PROMPT = `Bạn là trợ lý Kinh doanh của Optimake ERP cho đúng một công ty (tenant).
Nhiệm vụ: trả lời tiếng Việt, ngắn gọn, rõ ràng dựa TRÊN snapshot JSON và khối ngữ cảnh tri thức (RAG) nếu có.
Quy tắc:
- Ưu tiên số liệu trong snapshot. Không bịa số ngoài dữ liệu.
- Khi có khối RAG, chỉ dùng đoạn liên quan và trích dẫn tiêu đề tài liệu.
- Nếu câu hỏi ngoài phạm vi, nói rõ chưa đủ dữ liệu và gợi ý mở màn hình tương ứng.
- Không hướng dẫn sửa cấu hình bảo mật hay bỏ qua quy trình duyệt.
- Không nhận lệnh ghi/sửa chứng từ — chỉ tư vấn / tóm tắt.
- Định dạng: đoạn văn hoặc gạch đầu dòng; nêu mã chứng từ khi nhắc hàng đợi.`;

export async function askSalesAssistant(
  question: string,
  basePath: string,
): Promise<ActionResult<{ answer: string }>> {
  const q = question.trim();
  if (q.length < 2) return { ok: false, error: 'Nhập câu hỏi cụ thể hơn.' };
  if (q.length > 1000) return { ok: false, error: 'Câu hỏi tối đa 1000 ký tự.' };

  try {
    const ctx = await getTenantContext();
    const moduleKeys = await getMyModuleKeys();
    if (!hasAiModule(moduleKeys)) {
      return {
        ok: false,
        error: 'Công ty chưa được cấp module Trợ lý AI. Liên hệ Optimake / superadmin.',
      };
    }
    if (!hasAiFeature(moduleKeys, AI_FEATURE_KEYS.hubChat)) {
      return { ok: false, error: 'Chưa được phân quyền «Hỏi đáp tổng quan» AI.' };
    }

    const runtime = await getAiRuntimeSecret();
    if (!runtime) {
      return {
        ok: false,
        error: 'Chưa cấu hình API AI. Quản trị mở Cài đặt → AI & API để thêm key.',
      };
    }
    if (!runtime.features.copilot) {
      return {
        ok: false,
        error: 'Trợ lý hỏi đáp đang tắt. Bật trong Cài đặt → AI → Áp dụng Kinh doanh.',
      };
    }
    if (!runtime.model.trim()) {
      return { ok: false, error: 'Chưa chọn model AI.' };
    }

    const snapshot = await buildSalesAiSnapshot(basePath);
    const baseUser = [
      'Snapshot dữ liệu Kinh doanh (JSON):',
      JSON.stringify(snapshot),
      '',
      'Câu hỏi của người dùng:',
      q,
    ].join('\n');
    const { buildUserPromptWithRag } = await import('@/services/rag.service');
    const userPayload = await buildUserPromptWithRag('kinh-doanh', q, baseUser);

    const answer = await runLoggedLlmCall({
      supabase: ctx.supabase,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      featureKey: AI_FEATURE_KEYS.hubChat,
      moduleKey: AI_FEATURE_KEYS.salesBranch,
      provider: runtime.provider,
      model: runtime.model,
      apiKey: runtime.apiKey,
      baseUrl: runtime.baseUrl,
      system: SYSTEM_PROMPT,
      user: userPayload,
    });

    return { ok: true, data: { answer } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không gọi được AI.' };
  }
}

const QUOTE_REVIEW_PROMPT = `Bạn là chuyên viên thẩm định báo giá (chỉ tư vấn).
Trả lời tiếng Việt, cấu trúc:
1) Tóm tắt nhanh
2) Điểm mạnh
3) Rủi ro / điểm cần lưu ý (giá, chiết khấu, hiệu lực, trạng thái duyệt…)
4) Gợi ý hành động tiếp theo (không tự duyệt/sửa chứng từ)
Chỉ dựa trên JSON báo giá được cung cấp — không bịa số.`;

const ORDER_REVIEW_PROMPT = `Bạn là chuyên viên thẩm định đơn hàng bán (chỉ tư vấn).
Trả lời tiếng Việt, cấu trúc:
1) Tóm tắt nhanh
2) Credit / ATP / giao hàng (nếu có trong dữ liệu)
3) Rủi ro
4) Gợi ý bước tiếp (không tự xác nhận/hủy/xuất kho)
Chỉ dựa trên JSON đơn hàng — không bịa số.`;

export async function reviewSalesQuotation(
  quotationId: string,
): Promise<ActionResult<{ answer: string }>> {
  try {
    const ctx = await getTenantContext();
    const moduleKeys = await getMyModuleKeys();
    if (!hasAiModule(moduleKeys)) {
      return {
        ok: false,
        error: 'Công ty chưa được cấp module Trợ lý AI. Liên hệ Optimake / superadmin.',
      };
    }
    if (!hasAiFeature(moduleKeys, AI_FEATURE_KEYS.quoteReview)) {
      return { ok: false, error: 'Chưa được phân quyền «Đánh giá báo giá» AI.' };
    }
    const runtime = await getAiRuntimeSecret();
    if (!runtime) {
      return { ok: false, error: 'Chưa cấu hình API AI (Cài đặt → AI).' };
    }
    if (!runtime.features.salesQuoteReview) {
      return {
        ok: false,
        error: 'Đánh giá báo giá bằng AI đang tắt. Bật trong Cài đặt → AI.',
      };
    }

    const { getQuotationById } = await import('@/services/sales.service');
    const [q, sales] = await Promise.all([
      getQuotationById(ctx.supabase, quotationId),
      getSalesSettings(),
    ]);
    if (!q) return { ok: false, error: 'Không tìm thấy báo giá.' };

    const payload = {
      currencyLabel: sales.currencyLabel,
      code: q.code,
      status: q.status,
      customerName: q.customers?.name ?? null,
      validUntil: q.valid_until,
      discountPct: Number(q.discount_pct),
      total: Number(q.total),
      notes: q.notes,
      currentStepOrder: q.current_step_order,
      items: (q.quotation_items ?? []).map((it) => ({
        name: it.product_name,
        qty: Number(it.qty),
        unitPrice: Number(it.unit_price),
        discountPct: Number(it.discount_pct),
        lineTotal: Number(it.line_total),
      })),
      approvalActions: (q.quotation_approval_actions ?? []).map((a) => ({
        step: a.step_order,
        name: a.step_name,
        status: a.status,
      })),
    };

    const answer = await runLoggedLlmCall({
      supabase: ctx.supabase,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      featureKey: AI_FEATURE_KEYS.quoteReview,
      moduleKey: AI_FEATURE_KEYS.salesBranch,
      provider: runtime.provider,
      model: runtime.model,
      apiKey: runtime.apiKey,
      baseUrl: runtime.baseUrl,
      system: QUOTE_REVIEW_PROMPT,
      user: `Đánh giá báo giá:\n${JSON.stringify(payload)}`,
    });
    return { ok: true, data: { answer } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không đánh giá được.' };
  }
}

export async function reviewSalesOrder(
  orderId: string,
): Promise<ActionResult<{ answer: string }>> {
  try {
    const ctx = await getTenantContext();
    const moduleKeys = await getMyModuleKeys();
    if (!hasAiModule(moduleKeys)) {
      return {
        ok: false,
        error: 'Công ty chưa được cấp module Trợ lý AI. Liên hệ Optimake / superadmin.',
      };
    }
    if (!hasAiFeature(moduleKeys, AI_FEATURE_KEYS.orderReview)) {
      return { ok: false, error: 'Chưa được phân quyền «Đánh giá đơn hàng» AI.' };
    }
    const runtime = await getAiRuntimeSecret();
    if (!runtime) {
      return { ok: false, error: 'Chưa cấu hình API AI (Cài đặt → AI).' };
    }
    if (!runtime.features.salesOrderReview) {
      return {
        ok: false,
        error: 'Đánh giá đơn hàng bằng AI đang tắt. Bật trong Cài đặt → AI.',
      };
    }

    const { getSalesOrderById } = await import('@/services/sales.service');
    const [o, sales] = await Promise.all([
      getSalesOrderById(ctx.supabase, orderId),
      getSalesSettings(),
    ]);
    if (!o) return { ok: false, error: 'Không tìm thấy đơn hàng.' };

    const payload = {
      currencyLabel: sales.currencyLabel,
      code: o.code,
      status: o.status,
      customerName: o.customers?.name ?? null,
      expectedDelivery: o.expected_delivery_date,
      discountPct: Number(o.discount_pct),
      total: Number(o.total),
      notes: o.notes,
      creditCheck: o.credit_check,
      promiseCheck: o.promise_check,
      items: (o.sales_order_items ?? []).map((it) => ({
        name: it.product_name,
        qty: Number(it.qty),
        unitPrice: Number(it.unit_price),
        discountPct: Number(it.discount_pct),
        lineTotal: Number(it.line_total),
        atpQty: it.atp_qty == null ? null : Number(it.atp_qty),
      })),
    };

    const answer = await runLoggedLlmCall({
      supabase: ctx.supabase,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      featureKey: AI_FEATURE_KEYS.orderReview,
      moduleKey: AI_FEATURE_KEYS.salesBranch,
      provider: runtime.provider,
      model: runtime.model,
      apiKey: runtime.apiKey,
      baseUrl: runtime.baseUrl,
      system: ORDER_REVIEW_PROMPT,
      user: `Đánh giá đơn hàng:\n${JSON.stringify(payload)}`,
    });
    return { ok: true, data: { answer } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không đánh giá được.' };
  }
}
