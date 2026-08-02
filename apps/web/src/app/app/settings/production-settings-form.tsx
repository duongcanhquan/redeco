'use client';

import { Factory } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
import type { ProductionSettings } from '@/services/tenant-settings.service';
import { saveProductionSettingsAction } from './actions';
import { SettingsGroup } from './settings-group';

export function ProductionSettingsForm({ initial }: { initial: ProductionSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveProductionSettingsAction(form);
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
        title="Sản xuất"
        icon={<Factory size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="prod-fg" label="Kho thành phẩm" required>
            <input
              id="prod-fg"
              className={inputClass}
              required
              value={form.defaultFgWarehouseCode}
              onChange={(e) => setForm({ ...form, defaultFgWarehouseCode: e.target.value })}
            />
          </Field>
          <Field id="prod-rm" label="Kho nguyên liệu" required>
            <input
              id="prod-rm"
              className={inputClass}
              required
              value={form.defaultRmWarehouseCode}
              onChange={(e) => setForm({ ...form, defaultRmWarehouseCode: e.target.value })}
            />
          </Field>
          <Field id="prod-lead" label="Số ngày chờ sản xuất">
            <div className="flex items-center gap-2">
              <input
                id="prod-lead"
                type="number"
                min={0}
                max={365}
                className={inputClass}
                value={form.defaultLeadTimeDays}
                onChange={(e) => setForm({ ...form, defaultLeadTimeDays: Number(e.target.value) })}
              />
              <HelpTip title="Số ngày chờ">
                <p>Khi thiếu hàng, hệ thống ước ngày giao = hôm nay + số ngày này.</p>
              </HelpTip>
            </div>
          </Field>
          <Field id="prod-over" label="% nhập vượt kế hoạch">
            <input
              id="prod-over"
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={form.overReceiptPct}
              onChange={(e) => setForm({ ...form, overReceiptPct: Number(e.target.value) })}
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.allowReleaseWithoutRm}
            onChange={(e) => setForm({ ...form, allowReleaseWithoutRm: e.target.checked })}
          />
          <span className="text-sm font-medium flex-1">Cho phép phát hành khi thiếu nguyên liệu</span>
          <HelpTip title="Thiếu nguyên liệu">
            <p>Bật = vẫn phát hành lệnh dù kho chưa đủ. Tắt = phải đủ nguyên liệu mới phát hành.</p>
          </HelpTip>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 min-h-11 opacity-60 cursor-not-allowed">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.autoCreateWoOnSoShortfall}
            disabled
            readOnly
          />
          <span className="text-sm font-medium flex-1">Gợi ý tạo lệnh khi đơn thiếu hàng</span>
          <HelpTip title="Gợi ý lệnh sản xuất">
            <p>Sắp có. Tính năng tự gợi ý lệnh sản xuất chưa được kích hoạt.</p>
          </HelpTip>
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
