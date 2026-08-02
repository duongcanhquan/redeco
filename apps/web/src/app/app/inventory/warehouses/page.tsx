import { Layers, Warehouse } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  ensureInventoryDefaults,
  listInventoryItems,
  listWarehouses,
} from '@/services/inventory.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { ItemLotPolicyList } from './item-lot-policy-list';
import { WarehouseDialog } from './warehouse-dialog';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  raw: 'Nguyên vật liệu',
  wip: 'Bán thành phẩm',
  fg: 'Thành phẩm',
  spare: 'Phụ tùng',
  other: 'Khác',
};

export default async function WarehousesPage() {
  const [supabase, nav] = await Promise.all([
    createServerSupabase(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  await ensureInventoryDefaults();
  const [warehouses, items] = await Promise.all([
    listWarehouses(supabase),
    listInventoryItems(supabase),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="text-accent" size={24} aria-hidden />
            Danh mục kho
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Kho vật lý + chính sách lô / FIFO trên từng mã hàng.
          </p>
        </div>
        {canManage ? <WarehouseDialog /> : null}
      </header>

      <section className="glass rounded-2xl overflow-hidden">
        <h2 className="px-5 py-3 text-sm font-semibold border-b border-panel/30">
          Kho vật lý
        </h2>
        {warehouses.length === 0 ? (
          <div className="py-16 text-center text-ink-muted">Chưa có kho.</div>
        ) : (
          <ul className="divide-y divide-panel/30">
            {warehouses.map((w) => (
              <li
                key={w.id}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-mono text-sm text-accent">{w.code}</p>
                  <p className="font-medium">{w.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-panel/40 px-2 py-0.5 text-xs">
                    {KIND_LABEL[w.kind] ?? w.kind}
                  </span>
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs border ${
                      w.is_active
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-panel/40 text-ink-muted'
                    }`}
                  >
                    {w.is_active ? 'Đang dùng' : 'Ngưng'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-panel/30 flex items-start gap-2">
          <Layers className="text-accent mt-0.5 shrink-0" size={18} aria-hidden />
          <div>
            <h2 className="text-sm font-semibold">Mã hàng — lô &amp; chiến lược xuất</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Bật «Theo dõi lô» thì nhập kho bắt buộc mã lô. Xuất để trống Bin → hệ thống chia
              theo FIFO / FEFO / LIFO.
            </p>
          </div>
        </div>
        <ItemLotPolicyList
          canManage={canManage}
          items={items.map((i) => ({
            id: i.id,
            sku: i.sku,
            name: i.name,
            trackLot: i.track_lot,
            pickStrategy: i.pick_strategy,
          }))}
        />
      </section>
    </div>
  );
}
