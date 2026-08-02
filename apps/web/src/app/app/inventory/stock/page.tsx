import { Package } from 'lucide-react';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { DocSearchBar } from '@/components/sales/doc-search';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import {
  balanceAtp,
  ensureInventoryDefaults,
  listStockBalances,
} from '@/services/inventory.service';

export const dynamic = 'force-dynamic';

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? '').trim().toLowerCase();
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  await ensureInventoryDefaults();
  const all = await listStockBalances(supabase);
  const rows = q
    ? all.filter((b) => {
        const sku = b.inventory_items?.sku ?? '';
        const name = b.inventory_items?.name ?? '';
        const wh = b.warehouses?.code ?? '';
        return `${sku} ${name} ${wh}`.toLowerCase().includes(q);
      })
    : all;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="text-accent" size={24} aria-hidden />
          Tồn kho / ATP
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          ATP = tồn thực tế − giữ chỗ. Sales dùng số này khi xác nhận đơn.
        </p>
      </header>

      <DocSearchBar
        baseHref={`${base}/inventory/stock`}
        initialQ={rawQ ?? ''}
        placeholder="Tìm SKU, tên, mã kho…"
      />

      <ResponsiveDocList
        empty={rows.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Package className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có dòng tồn. Đồng bộ từ hub Kho.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Kho</th>
                <th className="px-5 py-3.5 font-medium">SKU</th>
                <th className="px-5 py-3.5 font-medium">Tên hàng</th>
                <th className="px-5 py-3.5 font-medium text-right">Tồn</th>
                <th className="px-5 py-3.5 font-medium text-right hidden lg:table-cell">
                  Giữ chỗ
                </th>
                <th className="px-5 py-3.5 font-medium text-right">ATP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const atp = balanceAtp(b);
                return (
                  <tr
                    key={b.id}
                    className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-accent">
                      {b.warehouses?.code ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs">
                      {b.inventory_items?.sku ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {b.inventory_items?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {Number(b.qty_on_hand)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ink-muted hidden lg:table-cell">
                      {Number(b.qty_reserved)}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right tabular-nums font-semibold ${
                        atp <= 0 ? 'text-danger' : atp <= 5 ? 'text-warning' : ''
                      }`}
                    >
                      {atp}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
        cards={
          <>
            {rows.map((b) => {
              const atp = balanceAtp(b);
              return (
                <DocCard
                  key={b.id}
                  code={b.inventory_items?.sku ?? '—'}
                  title={b.inventory_items?.name ?? '—'}
                  badge={
                    <span className="font-mono text-[11px] text-accent">
                      {b.warehouses?.code}
                    </span>
                  }
                  meta={
                    <p>
                      Tồn {Number(b.qty_on_hand)} · Giữ {Number(b.qty_reserved)}
                    </p>
                  }
                  amount={`ATP ${atp}`}
                />
              );
            })}
          </>
        }
      />
    </div>
  );
}
