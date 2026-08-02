import { Package } from 'lucide-react';
import Link from 'next/link';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { DocSearchBar } from '@/components/sales/doc-search';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import {
  balanceAtp,
  ensureInventoryDefaults,
  listStockBalances,
  listStockQuants,
} from '@/services/inventory.service';

export const dynamic = 'force-dynamic';

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === 'quant' ? 'quant' : 'balance';
  const q = (sp.q ?? '').trim().toLowerCase();
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  await ensureInventoryDefaults();

  if (view === 'quant') {
    const all = await listStockQuants(supabase);
    const rows = q
      ? all.filter((b) => {
          const sku = b.inventory_items?.sku ?? '';
          const name = b.inventory_items?.name ?? '';
          const loc = b.warehouse_locations?.code ?? '';
          const lot = b.inventory_lots?.lot_code ?? '';
          return `${sku} ${name} ${loc} ${lot}`.toLowerCase().includes(q);
        })
      : all;

    return (
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="text-accent" size={24} aria-hidden />
              Tồn theo vị trí / lô
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              Chi tiết StockQuant (Bin + Lot). Xuất kho tự chia theo FIFO/FEFO nếu không chọn vị trí.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${base}/inventory/stock`}
              className="inline-flex min-h-11 items-center rounded-xl border border-panel/40 px-3 text-sm"
            >
              Theo kho (ATP)
            </Link>
            <Link
              href={`${base}/inventory/stock?view=quant`}
              className="inline-flex min-h-11 items-center rounded-xl border border-accent/40 bg-accent-soft px-3 text-sm font-semibold text-accent"
              aria-current="page"
            >
              Theo Bin / Lô
            </Link>
          </div>
        </header>
        <DocSearchBar
          baseHref={`${base}/inventory/stock`}
          initialQ={sp.q ?? ''}
          preserve={{ view: 'quant' }}
          placeholder="SKU, vị trí, lô…"
        />
        <ResponsiveDocList
          empty={rows.length === 0}
          emptyState={
            <div className="py-16 text-center">
              <Package className="mx-auto text-ink-muted/50" size={32} aria-hidden />
              <p className="mt-4 text-ink-muted">
                Chưa có quant — nhập kho hoặc đồng bộ từ tồn K1.
              </p>
            </div>
          }
          table={
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel/40 text-left text-ink-muted">
                  <th className="px-4 py-3 font-medium">Kho</th>
                  <th className="px-4 py-3 font-medium">Vị trí</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Lô</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-accent">
                      {r.warehouses?.code ?? '—'}
                    </td>
                    <td className="px-4 py-3">{r.warehouse_locations?.code ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold">
                      {r.inventory_items?.sku ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-muted hidden md:table-cell">
                      {r.inventory_lots?.lot_code ?? '—'}
                      {r.inventory_lots?.expiry_date
                        ? ` · HSD ${r.inventory_lots.expiry_date}`
                        : ''}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {Number(r.qty)} {r.inventory_items?.uom ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          cards={
            <>
              {rows.map((r) => (
                <DocCard
                  key={r.id}
                  code={r.inventory_items?.sku ?? '—'}
                  title={r.inventory_items?.name ?? '—'}
                  badge={
                    <span className="font-mono text-[11px] text-accent">
                      {r.warehouses?.code}/{r.warehouse_locations?.code}
                    </span>
                  }
                  meta={
                    <p>
                      Lô {r.inventory_lots?.lot_code ?? '—'}
                      {r.inventory_lots?.expiry_date
                        ? ` · HSD ${r.inventory_lots.expiry_date}`
                        : ''}
                    </p>
                  }
                  amount={`${Number(r.qty)} ${r.inventory_items?.uom ?? ''}`}
                />
              ))}
            </>
          }
        />
      </div>
    );
  }

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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-accent" size={24} aria-hidden />
            Tồn kho (số còn bán được)
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Rollup theo kho — ATP = tồn − giữ chỗ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${base}/inventory/stock`}
            className="inline-flex min-h-11 items-center rounded-xl border border-accent/40 bg-accent-soft px-3 text-sm font-semibold text-accent"
            aria-current="page"
          >
            Theo kho (ATP)
          </Link>
          <Link
            href={`${base}/inventory/stock?view=quant`}
            className="inline-flex min-h-11 items-center rounded-xl border border-panel/40 px-3 text-sm"
          >
            Theo Bin / Lô
          </Link>
        </div>
      </header>

      <DocSearchBar
        baseHref={`${base}/inventory/stock`}
        initialQ={sp.q ?? ''}
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
                <th className="px-5 py-3.5 font-medium text-right">Còn bán (ATP)</th>
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
                  amount={`Còn bán ${atp}`}
                />
              );
            })}
          </>
        }
      />
    </div>
  );
}
