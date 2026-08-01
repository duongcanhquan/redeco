import { Package } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/format';
import { listProducts } from '@/services/sales.service';
import { ProductDialog } from './product-dialog';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = await createServerSupabase();
  const products = await listProducts(supabase);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-accent" size={24} aria-hidden />
            Sản phẩm &amp; tồn kho
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Danh mục thành phẩm và tồn kho khả dụng — nguồn dữ liệu cho kiểm tra ATP khi xác nhận đơn.
          </p>
        </div>
        <ProductDialog />
      </header>

      <section className="glass rounded-2xl overflow-hidden">
        {products.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có sản phẩm nào.</p>
            <p className="text-sm text-ink-muted/70">Thêm sản phẩm để bắt đầu tạo báo giá.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                        {formatMoney(Number(p.base_price))}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right tabular-nums font-medium ${
                          qty <= 0 ? 'text-danger' : 'text-ink'
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
          </div>
        )}
      </section>
    </div>
  );
}
