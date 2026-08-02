import Link from 'next/link';
import {
  ArrowRight,
  Package,
  Warehouse,
  ClipboardList,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import { BentoBarChart, BentoStackBars } from '@/components/sales/bento-charts';
import { FlowSteps } from '@/components/ui/flow-steps';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import {
  balanceAtp,
  ensureInventoryDefaults,
  listInventoryTransactions,
  listStockBalances,
  listWarehouses,
} from '@/services/inventory.service';
import { getMyRootModules } from '@/services/sales.service';
import { getInventorySettings } from '@/services/tenant-settings.service';
import { EnsureDefaultsButton } from './ensure-defaults-button';

export const dynamic = 'force-dynamic';

export default async function InventoryHubPage() {
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  const hasKho = modules.some((m) => m.key === 'kho');

  if (!hasKho) {
    return (
      <div className="glass rounded-2xl py-16 text-center max-w-lg mx-auto">
        <Warehouse className="mx-auto text-warning" size={32} aria-hidden />
        <p className="mt-4 font-medium">Chưa mở Kho</p>
        <p className="mt-1 text-sm text-ink-muted px-4">Liên hệ quản trị để bật module Kho.</p>
      </div>
    );
  }

  await ensureInventoryDefaults();

  const [warehouses, balances, txns, invSettings] = await Promise.all([
    listWarehouses(supabase),
    listStockBalances(supabase),
    listInventoryTransactions(supabase),
    getInventorySettings(),
  ]);

  const lowAtp = balances.filter((b) => balanceAtp(b) <= invSettings.lowStockThreshold).length;
  const posted = txns.filter((t) => t.status === 'posted').length;
  const draft = txns.filter((t) => t.status === 'draft').length;
  const receipts = txns.filter((t) => t.txn_type === 'receipt').length;
  const issues = txns.filter((t) => t.txn_type === 'issue').length;

  const byWh = warehouses.map((w) => ({
    label: w.code,
    amount: balances.filter((b) => b.warehouse_id === w.id).length,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Warehouse size={24} />}
        title="Kho"
        helpTitle="Kho dùng để làm gì?"
        help={
          <>
            <p>Theo dõi hàng trong từng kho: thành phẩm và nguyên vật liệu.</p>
            <p>Bán hàng xem số còn bán được từ đây khi xác nhận đơn và giao hàng.</p>
          </>
        }
        actions={<EnsureDefaultsButton />}
      />

      <FlowSteps
        ariaLabel="Luồng kho"
        steps={[
          {
            key: 'stock',
            label: 'Tồn kho',
            icon: <Package size={18} />,
            count: balances.length,
            tone: 'accent',
          },
          {
            key: 'low',
            label: 'Sắp hết',
            icon: <AlertTriangle size={18} />,
            count: lowAtp,
            tone: lowAtp > 0 ? 'warning' : 'default',
          },
          {
            key: 'posted',
            label: 'Đã ghi sổ',
            icon: <FileCheck2 size={18} />,
            count: posted,
            tone: 'success',
          },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={<Warehouse size={18} />} label="Số kho" value={warehouses.length} />
        <StatTile icon={<Package size={18} />} label="Dòng tồn" value={balances.length} />
        <StatTile
          icon={<AlertTriangle size={18} />}
          label="Sắp hết"
          value={lowAtp}
          tone={lowAtp > 0 ? 'warning' : 'default'}
        />
        <StatTile icon={<ClipboardList size={18} />} label="Phiếu nháp" value={draft} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2">Tồn theo kho</h2>
          <BentoBarChart points={byWh.length ? byWh : [{ label: '—', amount: 0 }]} ariaLabel="Biểu đồ tồn theo kho" />
        </section>
        <section className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-2">Loại phiếu</h2>
          <BentoStackBars
            ariaLabel="Phân loại phiếu kho"
            slices={[
              { key: 'in', label: 'Nhập', count: receipts, tone: 'success' },
              { key: 'out', label: 'Xuất', count: issues, tone: 'warning' },
              { key: 'ok', label: 'Đã ghi sổ', count: posted, tone: 'accent' },
            ]}
          />
        </section>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: `${base}/inventory/stock`, label: 'Xem tồn', icon: Package },
          { href: `${base}/inventory/transactions`, label: 'Phiếu kho', icon: ClipboardList },
          { href: `${base}/inventory/warehouses`, label: 'Danh mục kho', icon: Warehouse },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="glass glass-hover rounded-2xl p-4 min-h-24 flex items-center gap-3 group"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon size={22} aria-hidden />
            </span>
            <span className="font-semibold group-hover:text-accent flex items-center gap-1">
              {label}
              <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
