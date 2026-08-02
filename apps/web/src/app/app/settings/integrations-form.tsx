'use client';

import { Webhook } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
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
    setBusy(true);
    setMsg(null);
    const result = await saveIntegrationsSettingsAction(form);
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu tích hợp.' });
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <SettingsGroup
        title="Webhook sự kiện (n8n / hệ thống ngoài)"
        description="Khi bật, Optimake có thể đẩy các sự kiện trong sales_outbox (giao hàng, hóa đơn…) tới URL của bạn. Dùng HTTPS ở môi trường production."
        icon={<Webhook size={18} className="text-accent" aria-hidden />}
      >
        <Field id="wh-url" label="Webhook URL">
          <input
            id="wh-url"
            type="url"
            className={inputClass}
            value={form.webhookUrl}
            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
            placeholder="https://n8n.congty.com/webhook/optimake"
          />
        </Field>
        <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            checked={form.webhookEnabled}
            onChange={(e) => setForm({ ...form, webhookEnabled: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium">Bật đẩy sự kiện ra ngoài</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Worker đẩy outbox sẽ tôn trọng cờ này (triển khai consumer ở bước sau).
            </span>
          </span>
        </label>
      </SettingsGroup>

      <SettingsGroup
        title="EDI / cổng B2B"
        description="Nhận đơn tự động từ ERP đối tác — cấu hình chi tiết thuộc nhóm Advanced (B2B Portal). Tab này giữ chỗ để không trộn với AI API."
      >
        <p className="text-sm text-ink-muted rounded-xl border border-dashed border-panel/50 px-4 py-6 text-center">
          Sắp mở: mapping EDI, tài khoản đại lý B2B, theo dõi đơn realtime.
        </p>
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
        {busy ? 'Đang lưu…' : 'Lưu tích hợp'}
      </button>
    </form>
  );
}
