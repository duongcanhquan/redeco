import { Warehouse } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { ensureInventoryDefaults, listWarehouses } from '@/services/inventory.service';
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
  const supabase = await createServerSupabase();
  await ensureInventoryDefaults();
  const warehouses = await listWarehouses(supabase);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="text-accent" size={24} aria-hidden />
            Danh mục kho
          </h1>
        </div>
        <WarehouseDialog />
      </header>

      <section className="glass rounded-2xl overflow-hidden">
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
    </div>
  );
}
