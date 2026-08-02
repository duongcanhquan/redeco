'use client';

import { Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
import { SettingsGroup } from './settings-group';
import type { AccountingSettings } from '@/services/tenant-settings.service';
import { saveAccountingSettingsAction } from './actions';

export function AccountingSettingsForm({ initial }: { initial: AccountingSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveAccountingSettingsAction(form);
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
        title="Phần đang dùng"
        description={undefined}
        icon={<Calculator size={18} className="text-accent" aria-hidden />}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-ink-muted">Bật từng phần cần dùng</span>
          <HelpTip title="Ghép công đoạn">
            <p>Không bắt buộc bật hết. Chỉ bật phần công ty đang dùng.</p>
            <p>Tắt công nợ = hóa đơn bán hàng không vào sổ kế toán.</p>
          </HelpTip>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.arEnabled}
            onChange={(e) => setForm({ ...form, arEnabled: e.target.checked })}
          />
          <span className="text-sm font-medium flex-1">Theo dõi công nợ khách</span>
          <HelpTip title="Công nợ khách">
            <p>Hóa đơn bán hàng hiện trên sổ nợ. Khi thu tiền sẽ đánh dấu đã thu.</p>
          </HelpTip>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.cogsEnabled}
            onChange={(e) => setForm({ ...form, cogsEnabled: e.target.checked })}
          />
          <span className="text-sm font-medium flex-1">Tính giá vốn từ xuất kho</span>
          <HelpTip title="Giá vốn">
            <p>Cần module Kho. Lấy số tiền ước tính từ phiếu xuất đã ghi sổ.</p>
          </HelpTip>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11 opacity-70">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.apEnabled}
            onChange={(e) => setForm({ ...form, apEnabled: e.target.checked })}
          />
          <span className="text-sm font-medium flex-1">Công nợ nhà cung cấp (sắp có)</span>
        </label>

        <Field id="acc-terms" label="Số ngày được nợ (mặc định)">
          <input
            id="acc-terms"
            type="number"
            min={0}
            max={365}
            className={inputClass}
            value={form.defaultPaymentTermsDays}
            onChange={(e) =>
              setForm({ ...form, defaultPaymentTermsDays: Number(e.target.value) })
            }
          />
        </Field>
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
        className="h-12 min-w-40 rounded-xl bg-accent px-6 font-semibold text-app disabled:opacity-60"
      >
        {busy ? 'Đang lưu…' : 'Lưu'}
      </button>
    </form>
  );
}
