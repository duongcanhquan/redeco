'use client';

import { Warehouse } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
import type { InventorySettings } from '@/services/tenant-settings.service';
import { saveInventorySettingsAction } from './actions';
import { SettingsGroup } from './settings-group';

export function InventorySettingsForm({ initial }: { initial: InventorySettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveInventorySettingsAction(form);
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
        title="Kho"
        icon={<Warehouse size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="inv-fg" label="Kho thành phẩm" required>
            <input
              id="inv-fg"
              className={inputClass}
              required
              value={form.defaultFgWarehouseCode}
              onChange={(e) => setForm({ ...form, defaultFgWarehouseCode: e.target.value })}
            />
          </Field>
          <Field id="inv-rm" label="Kho nguyên liệu" required>
            <input
              id="inv-rm"
              className={inputClass}
              required
              value={form.defaultRmWarehouseCode}
              onChange={(e) => setForm({ ...form, defaultRmWarehouseCode: e.target.value })}
            />
          </Field>
          <Field id="inv-low" label="Cảnh báo khi còn dưới">
            <div className="flex items-center gap-2">
              <input
                id="inv-low"
                type="number"
                min={0}
                className={inputClass}
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
              />
              <HelpTip title="Cảnh báo sắp hết">
                <p>Dòng tồn còn bán được dưới mức này sẽ hiện cảnh báo trên trang Kho.</p>
              </HelpTip>
            </div>
          </Field>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={form.reserveOnSoConfirm}
            onChange={(e) => setForm({ ...form, reserveOnSoConfirm: e.target.checked })}
          />
          <span className="text-sm font-medium flex-1">Giữ chỗ hàng khi xác nhận đơn</span>
          <HelpTip title="Giữ chỗ">
            <p>
              Khi xác nhận đơn, số lượng sẽ chuyển sang «đã giữ chỗ» — nhân viên khác không bán
              chồng vào phần đó. Số còn bán được (ATP) = tồn thực tế − giữ chỗ.
            </p>
            <p>Cần module Kho. Nếu thiếu hàng có thể giữ chỗ phần còn (trừ khi bật mục dưới).</p>
          </HelpTip>
        </label>

        <label
          className={`flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 min-h-11 ${
            form.reserveOnSoConfirm ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <input
            type="checkbox"
            className="size-4 accent-accent"
            disabled={!form.reserveOnSoConfirm}
            checked={form.requireFullReserveOnConfirm}
            onChange={(e) =>
              setForm({ ...form, requireFullReserveOnConfirm: e.target.checked })
            }
          />
          <span className="text-sm font-medium flex-1">Chỉ xác nhận khi giữ chỗ đủ 100%</span>
          <HelpTip title="Giữ chỗ đủ">
            <p>Bật thì đơn thiếu tồn sẽ không xác nhận được. Tắt thì vẫn xác nhận và giữ chỗ phần còn.</p>
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
