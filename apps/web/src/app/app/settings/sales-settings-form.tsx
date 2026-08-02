'use client';

import { ExternalLink, Percent, GitBranch, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import type { SalesSettings } from '@/services/tenant-settings.service';
import { saveSalesSettingsAction } from './actions';
import { SettingsGroup } from './settings-group';

export function SalesSettingsForm({
  initial,
  basePath,
}: {
  initial: SalesSettings;
  /** Prefix workspace: /{slug} hoặc /app */
  basePath: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveSalesSettingsAction(form);
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu tham số Kinh doanh.' });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <SettingsGroup
        title="Quy trình & chính sách bán hàng"
        description="Các cấu hình vận hành thuộc module Kinh doanh — mở trang chuyên biệt để chỉnh chi tiết."
        icon={<SlidersHorizontal size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`${basePath}/sales/approvals`}
            className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft/50 px-4 py-3.5 hover:bg-accent/15 transition-colors min-h-11"
          >
            <GitBranch size={18} className="text-accent shrink-0 mt-0.5" aria-hidden />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-accent">
                Quy trình duyệt N cấp
                <ExternalLink size={12} aria-hidden />
              </span>
              <span className="block text-xs text-ink-muted mt-0.5">
                Chuỗi bước, ngưỡng tiền, gán role duyệt báo giá.
              </span>
            </span>
          </Link>
          <Link
            href={`${basePath}/sales/discount-rules`}
            className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft/50 px-4 py-3.5 hover:bg-accent/15 transition-colors min-h-11"
          >
            <Percent size={18} className="text-accent shrink-0 mt-0.5" aria-hidden />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-accent">
                Quy tắc chiết khấu / KM
                <ExternalLink size={12} aria-hidden />
              </span>
              <span className="block text-xs text-ink-muted mt-0.5">
                Ưu tiên, loại KH, ngưỡng tổng — tự áp khi tạo báo giá.
              </span>
            </span>
          </Link>
        </div>
      </SettingsGroup>

      <form onSubmit={(e) => void submit(e)} className="space-y-5">
        <SettingsGroup
          title="Tham số chứng từ"
          description="Giá trị mặc định khi tạo báo giá / xử lý đơn — áp dụng toàn công ty."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="sales-currency" label="Nhãn tiền tệ hiển thị" required>
              <input
                id="sales-currency"
                className={inputClass}
                required
                value={form.currencyLabel}
                onChange={(e) => setForm({ ...form, currencyLabel: e.target.value })}
              />
            </Field>
            <Field
              id="sales-valid"
              label="Hiệu lực báo giá mặc định (ngày)"
              required
              hint="Dùng gợi ý khi tạo báo giá mới."
            >
              <input
                id="sales-valid"
                type="number"
                min={1}
                max={365}
                className={inputClass}
                required
                value={form.defaultQuotationValidDays}
                onChange={(e) =>
                  setForm({ ...form, defaultQuotationValidDays: Number(e.target.value) })
                }
              />
            </Field>
            <Field
              id="sales-debt"
              label="Cảnh báo công nợ trước hạn (ngày)"
              hint="Đánh dấu hóa đơn sắp đến hạn trên dashboard."
            >
              <input
                id="sales-debt"
                type="number"
                min={0}
                max={365}
                className={inputClass}
                value={form.debtWarningDays}
                onChange={(e) => setForm({ ...form, debtWarningDays: Number(e.target.value) })}
              />
            </Field>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-accent"
              checked={form.allowConfirmWithoutAtp}
              onChange={(e) => setForm({ ...form, allowConfirmWithoutAtp: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-medium">
                Cho phép xác nhận đơn khi ATP thiếu hàng
              </span>
              <span className="block text-xs text-ink-muted mt-0.5">
                Bật = giao sau / chờ CTP. Tắt = chặn confirm nếu tồn không đủ (siết chặt hơn).
              </span>
            </span>
          </label>
        </SettingsGroup>

        {msg && (
          <p
            role="alert"
            className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}
          >
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="h-12 min-w-44 rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
        >
          {busy ? 'Đang lưu…' : 'Lưu tham số Kinh doanh'}
        </button>
      </form>
    </div>
  );
}
