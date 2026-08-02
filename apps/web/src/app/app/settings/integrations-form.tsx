'use client';

import { Webhook } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
import type { IntegrationsSettings } from '@/services/tenant-settings.service';
import { saveIntegrationsSettingsAction } from './actions';
import { SettingsGroup } from './settings-group';

export function IntegrationsForm({ initial }: { initial: IntegrationsSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (form.webhookEnabled && !form.webhookUrl.trim()) {
      setMsg({ type: 'error', text: 'Bật webhook cần nhập địa chỉ URL.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    const result = await saveIntegrationsSettingsAction(form);
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
        title="Webhook"
        icon={<Webhook size={18} className="text-accent" aria-hidden />}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs rounded-lg px-2 py-1 bg-warning/15 text-warning font-medium">
            Đang lưu cấu hình
          </span>
          <HelpTip title="Webhook là gì?">
            <p>Khi giao hàng / xuất hóa đơn / thu tiền, hệ thống ghi sự kiện sẵn.</p>
            <p>Điền URL (vd n8n) để sau này tự đẩy sang hệ thống ngoài. Hiện chưa gửi HTTP thật.</p>
          </HelpTip>
        </div>

        <Field id="wh-url" label="Địa chỉ nhận sự kiện">
          <input
            id="wh-url"
            type="url"
            className={inputClass}
            value={form.webhookUrl}
            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        <Field id="wh-secret" label="Mã bí mật (tuỳ chọn)">
          <input
            id="wh-secret"
            type="password"
            autoComplete="off"
            className={`${inputClass} font-mono`}
            value={form.webhookSecret}
            onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
            placeholder="Dùng ký chữ ký khi bật gửi thật"
          />
        </Field>
        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.webhookEnabled}
            onChange={(e) => setForm({ ...form, webhookEnabled: e.target.checked })}
          />
          <span className="text-sm font-medium">Bật đẩy sự kiện (khi có worker)</span>
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
        className="h-12 min-w-40 rounded-xl bg-accent px-6 font-semibold text-app disabled:opacity-60"
      >
        {busy ? 'Đang lưu…' : 'Lưu'}
      </button>
    </form>
  );
}
