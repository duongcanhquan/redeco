import 'server-only';
import {
  AI_FEATURE_KEYS,
  hasAiFeature,
  hasAiModule,
} from '@/lib/ai-access';
import { runLoggedLlmCall } from '@/services/ai-usage.service';
import {
  listActiveContractsExpiring,
  listAttendanceLogs,
  listDepartments,
  listEmployees,
  listShifts,
} from '@/services/hr.service';
import { getMyModuleKeys } from '@/services/module-access.service';
import {
  getTenantContext,
  type ActionResult,
} from '@/services/sales-context';
import { getAiRuntimeSecret } from '@/services/tenant-settings.service';

const SYSTEM = `Bạn là trợ lý Nhân sự Optimake ERP (một tenant).
Trả lời tiếng Việt, ngắn gọn, dựa snapshot JSON và khối RAG nếu có.
Không bịa số NV/HĐ; không nhận lệnh duyệt phép/khoá lương — chỉ tư vấn.
Gợi ý màn hình Nhân viên / Chấm công / Nghỉ phép / Bảng lương khi thiếu dữ liệu.
Không tiết lộ thông tin nhạy cảm ngoài snapshot / RAG công khai.`;

export async function askHrAssistant(
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
    if (!hasAiFeature(moduleKeys, AI_FEATURE_KEYS.hrAsk)) {
      return { ok: false, error: 'Chưa được phân quyền «Hỏi đáp NS» AI.' };
    }
    const runtime = await getAiRuntimeSecret();
    if (!runtime) return { ok: false, error: 'Chưa cấu hình API AI (Cài đặt → AI).' };
    if (!runtime.features.hrAsk) {
      return { ok: false, error: 'Hỏi đáp Nhân sự đang tắt. Bật trong Cài đặt → AI.' };
    }

    const asOf = new Date().toISOString().slice(0, 10);
    const [departments, employees, shifts, attendance, expiring] = await Promise.all([
      listDepartments(ctx.supabase),
      listEmployees(ctx.supabase),
      listShifts(ctx.supabase),
      listAttendanceLogs(ctx.supabase, 30),
      listActiveContractsExpiring(ctx.supabase, 30, asOf),
    ]);

    const snapshot = {
      asOf,
      counts: {
        departments: departments.length,
        employees: employees.length,
        active: employees.filter((e) => e.status === 'active').length,
        terminated: employees.filter((e) => e.status === 'terminated').length,
        shifts: shifts.length,
        contractsExpiring30d: expiring,
      },
      recentAttendance: attendance.slice(0, 12).map((a) => ({
        date: a.work_date,
        employee: a.hr_employees?.code ?? a.employee_id,
        shift: a.hr_shifts?.code ?? null,
        hasOut: Boolean(a.clock_out),
      })),
      departments: departments.slice(0, 15).map((d) => ({
        code: d.code,
        name: d.name,
        kind: d.kind,
      })),
    };

    const { buildUserPromptWithRag } = await import('@/services/rag.service');
    const user = await buildUserPromptWithRag(
      'nhan-su',
      q,
      `Snapshot Nhân sự:\n${JSON.stringify(snapshot)}\n\nCâu hỏi:\n${q}`,
    );

    const answer = await runLoggedLlmCall({
      supabase: ctx.supabase,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      featureKey: AI_FEATURE_KEYS.hrAsk,
      moduleKey: AI_FEATURE_KEYS.hrBranch,
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
