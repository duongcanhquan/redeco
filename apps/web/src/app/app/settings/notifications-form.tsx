'use client';

import { Bell, Mail, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
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
    setMsg({ type: 'ok', text: 'Đã lưu.' });
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <SettingsGroup
        title="Email"
        icon={<Mail size={18} className="text-accent" aria-hidden />}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs rounded-lg px-2 py-1 bg-warning/15 text-warning font-medium">
            Đang lưu cấu hình
          </span>
          <HelpTip title="Email nhắc">
            <p>Chọn loại nhắc cần gửi. Hệ thống chưa gửi email thật — cảnh báo nợ đã hiện trên màn hình Hóa đơn.</p>
          </HelpTip>
        </div>
        <Field id="email-from" label="Email gửi đi (tuỳ chọn)">
          <input
            id="email-from"
            type="email"
            className={inputClass}
            value={form.emailFrom}
            onChange={(e) => setForm({ ...form, emailFrom: e.target.value })}
            placeholder="noreply@congty.com"
          />
        </Field>
        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.emailApprovalReminder}
            onChange={(e) => setForm({ ...form, emailApprovalReminder: e.target.checked })}
          />
          <span className="text-sm font-medium">Nhắc duyệt báo giá</span>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.emailDebtReminder}
            onChange={(e) => setForm({ ...form, emailDebtReminder: e.target.checked })}
          />
          <span className="text-sm font-medium">Nhắc công nợ quá hạn</span>
        </label>
      </SettingsGroup>

      <SettingsGroup
        title="SMS"
        icon={<MessageSquare size={18} className="text-accent" aria-hidden />}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs rounded-lg px-2 py-1 bg-warning/15 text-warning font-medium">
            Đang lưu cấu hình
          </span>
          <HelpTip title="SMS">
            <p>Chọn nhà mạng / Twilio khi sẵn sàng. Hiện chỉ lưu cấu hình — chưa gửi tin nhắn thật.</p>
          </HelpTip>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.smsEnabled}
            onChange={(e) => setForm({ ...form, smsEnabled: e.target.checked })}
          />
          <span className="text-sm font-medium">Bật kênh SMS</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="sms-provider" label="Nhà cung cấp">
            <select
              id="sms-provider"
              className={inputClass}
              value={form.smsProvider}
              onChange={(e) =>
                setForm({
                  ...form,
                  smsProvider: e.target.value as NotificationsSettings['smsProvider'],
                })
              }
            >
              <option value="none">Chưa chọn</option>
              <option value="twilio">Twilio</option>
              <option value="viettel">Viettel</option>
              <option value="custom">Khác</option>
            </select>
          </Field>
          <Field id="sms-sender" label="Brand name / Sender">
            <input
              id="sms-sender"
              className={inputClass}
              value={form.smsSenderId}
              onChange={(e) => setForm({ ...form, smsSenderId: e.target.value })}
              placeholder="OPTIMAKE"
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.smsApprovalReminder}
            onChange={(e) => setForm({ ...form, smsApprovalReminder: e.target.checked })}
          />
          <span className="text-sm font-medium">SMS nhắc duyệt báo giá</span>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.smsDebtReminder}
            onChange={(e) => setForm({ ...form, smsDebtReminder: e.target.checked })}
          />
          <span className="text-sm font-medium">SMS nhắc công nợ</span>
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
        className="inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-app disabled:opacity-60"
      >
        <Bell size={18} aria-hidden />
        {busy ? 'Đang lưu…' : 'Lưu'}
      </button>
    </form>
  );
}
