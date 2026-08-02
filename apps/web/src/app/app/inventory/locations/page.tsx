import { Layers } from 'lucide-react';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import {
  ensureInventoryDefaults,
  listWarehouseLocations,
  listWarehouses,
} from '@/services/inventory.service';
import { getWorkspaceNavContext } from '@/services/module-access.service';
import { LocationCreateForm } from './location-form';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  zone: 'Khu vực',
  row: 'Dãy',
  rack: 'Kệ',
  level: 'Tầng',
  bin: 'Bin',
};

export default async function InventoryLocationsPage() {
  const [supabase, claims, nav] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
    getWorkspaceNavContext(),
  ]);
  const canManage = nav?.isManager ?? false;
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  await ensureInventoryDefaults();
  const [warehouses, locations] = await Promise.all([
    listWarehouses(supabase),
    listWarehouseLocations(supabase),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="text-accent" size={24} aria-hidden />
            Vị trí kho (Zone → Bin)
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Cấu trúc không gian K2. Mỗi kho có sẵn vị trí hệ thống «mặc định» (ẩn).
          </p>
        </div>
        {canManage ? (
          <LocationCreateForm
            basePath={base}
            warehouses={warehouses.map((w) => ({
              id: w.id,
              code: w.code,
              name: w.name,
            }))}
          />
        ) : null}
      </header>

      <ResponsiveDocList
        empty={locations.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Layers className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">
              Chưa có vị trí tùy chỉnh — thêm Zone/Bin cho từng kho.
            </p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-4 py-3 font-medium">Kho</th>
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Tag</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40"
                >
                  <td className="px-4 py-3 font-mono text-xs text-accent">
                    {loc.warehouses?.code ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold">{loc.code}</td>
                  <td className="px-4 py-3">{loc.name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {KIND_LABEL[loc.kind] ?? loc.kind}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted hidden lg:table-cell">
                    {Array.isArray(loc.tags)
                      ? (loc.tags as string[]).join(', ') || '—'
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        cards={
          <>
            {locations.map((loc) => (
              <DocCard
                key={loc.id}
                code={loc.code}
                title={loc.name}
                badge={
                  <span className="font-mono text-[11px] text-accent">
                    {loc.warehouses?.code}
                  </span>
                }
                meta={
                  <p>
                    {KIND_LABEL[loc.kind] ?? loc.kind}
                    {Array.isArray(loc.tags) && (loc.tags as string[]).length > 0
                      ? ` · ${(loc.tags as string[]).join(', ')}`
                      : ''}
                  </p>
                }
              />
            ))}
          </>
        }
      />
    </div>
  );
}
