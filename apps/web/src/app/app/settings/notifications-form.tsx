'use client';

import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { NotificationsSettings } from '@/services/tenant-settings.service';
import { saveNotificationsSettingsAction } from './actions';
import { SettingsGroup } from './settings-group';

export function NotificationsForm({ initial }: { initial: NotificationsSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveNotificationsSettingsAction(form);
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu thông báo.' });
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <SettingsGroup
        title="Email nội bộ"
        description="Nhắc việc cho nhân viên công ty (không gửi cho khách hàng cuối trừ khi bật cổng B2B)."
        icon={<Bell size={18} className="text-accent" aria-hidden />}
      >
        <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            checked={form.emailApprovalReminder}
            onChange={(e) => setForm({ ...form, emailApprovalReminder: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium">Nhắc duyệt báo giá đang chờ</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Gửi cho người được phân công ở bước duyệt hiện tại.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            checked={form.emailDebtReminder}
            onChange={(e) => setForm({ ...form, emailDebtReminder: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium">Nhắc công nợ / hóa đơn quá hạn</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Theo số ngày cảnh báo cấu hình ở tab Kinh doanh.
            </span>
          </span>
        </label>
      </SettingsGroup>

      {msg && (
        <p role="alert" className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="h-12 min-w-44 rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
      >
        {busy ? 'Đang lưu…' : 'Lưu thông báo'}
      </button>
    </form>
  );
}
