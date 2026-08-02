import { Package } from 'lucide-react';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import { DocSearchBar } from '@/components/sales/doc-search';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { listProducts } from '@/services/sales.service';
import { getSalesSettings } from '@/services/tenant-settings.service';
import { ProductDialog } from './product-dialog';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
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
  const [productsAll, salesSettings] = await Promise.all([
    listProducts(supabase),
    getSalesSettings(),
  ]);
  const money = (n: number) => formatMoney(n, salesSettings.currencyLabel);
  const products = q
    ? productsAll.filter((p) => `${p.sku} ${p.name}`.toLowerCase().includes(q))
    : productsAll;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-accent" size={24} aria-hidden />
            Sản phẩm &amp; tồn kho
          </h1>
        </div>
        <ProductDialog />
      </header>

      <DocSearchBar
        baseHref={`${base}/sales/products`}
        initialQ={rawQ ?? ''}
        placeholder="Tìm SKU, tên SP…"
      />

      <ResponsiveDocList
        empty={products.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <Package className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có sản phẩm nào.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">SKU</th>
                <th className="px-5 py-3.5 font-medium">Tên sản phẩm</th>
                <th className="px-5 py-3.5 font-medium">ĐVT</th>
                <th className="px-5 py-3.5 font-medium text-right">Đơn giá chuẩn</th>
                <th className="px-5 py-3.5 font-medium text-right">Tồn kho</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5" aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const qty = Number(p.product_stock?.qty_on_hand ?? 0);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 transition-colors ${
                      p.is_active ? '' : 'opacity-50'
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-accent">{p.sku}</td>
                    <td className="px-5 py-3.5 font-medium">{p.name}</td>
                    <td className="px-5 py-3.5 text-ink-muted">{p.uom}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {money(Number(p.base_price))}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right tabular-nums font-medium ${
                        qty <= 0 ? 'text-danger' : qty <= 5 ? 'text-warning' : 'text-ink'
                      }`}
                    >
                      {new Intl.NumberFormat('vi-VN').format(qty)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${
                          p.is_active
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-glass-strong border-panel/50 text-ink-muted'
                        }`}
                      >
                        {p.is_active ? 'Đang bán' : 'Ngưng bán'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ProductDialog product={p} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
        cards={
          <>
            {products.map((p) => {
              const qty = Number(p.product_stock?.qty_on_hand ?? 0);
              return (
                <DocCard
                  key={p.id}
                  code={p.sku}
                  title={p.name}
                  badge={
                    <span
                      className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${
                        p.is_active
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'bg-glass-strong border-panel/50 text-ink-muted'
                      }`}
                    >
                      {p.is_active ? 'Đang bán' : 'Ngưng'}
                    </span>
                  }
                  meta={
                    <p>
                      {p.uom} · Tồn{' '}
                      <span className={qty <= 0 ? 'text-danger font-semibold' : ''}>
                        {new Intl.NumberFormat('vi-VN').format(qty)}
                      </span>
                    </p>
                  }
                  amount={money(Number(p.base_price))}
                  actions={<ProductDialog product={p} />}
                />
              );
            })}
          </>
        }
      />
    </div>
  );
}
