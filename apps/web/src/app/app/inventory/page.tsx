import {
  Package,
  Warehouse,
  ClipboardList,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import { BentoBarChart, BentoStackBars } from '@/components/sales/bento-charts';
import { ActionTile, BentoPanel } from '@/components/ui/bento';
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
      <div className="glass mx-auto max-w-lg rounded-3xl py-16 text-center">
        <Warehouse className="mx-auto text-warning" size={36} aria-hidden />
        <p className="mt-4 text-lg font-semibold">Chưa mở Kho</p>
        <p className="mt-2 px-4 text-base text-ink-muted">Liên hệ quản trị để bật module Kho.</p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<Warehouse size={20} />} label="Số kho" value={warehouses.length} />
        <StatTile icon={<Package size={20} />} label="Dòng tồn" value={balances.length} />
        <StatTile
          icon={<AlertTriangle size={20} />}
          label="Sắp hết"
          value={lowAtp}
          tone={lowAtp > 0 ? 'warning' : 'default'}
        />
        <StatTile icon={<ClipboardList size={20} />} label="Phiếu nháp" value={draft} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BentoPanel title="Tồn theo kho">
          <BentoBarChart
            points={byWh.length ? byWh : [{ label: '—', amount: 0 }]}
            ariaLabel="Biểu đồ tồn theo kho"
          />
        </BentoPanel>
        <BentoPanel title="Loại phiếu">
          <BentoStackBars
            ariaLabel="Phân loại phiếu kho"
            slices={[
              { key: 'in', label: 'Nhập', count: receipts, tone: 'success' },
              { key: 'out', label: 'Xuất', count: issues, tone: 'warning' },
              { key: 'ok', label: 'Đã ghi sổ', count: posted, tone: 'accent' },
            ]}
          />
        </BentoPanel>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionTile
          href={`${base}/inventory/stock`}
          label="Xem tồn"
          icon={<Package size={24} aria-hidden />}
        />
        <ActionTile
          href={`${base}/inventory/transactions`}
          label="Phiếu kho"
          icon={<ClipboardList size={24} aria-hidden />}
        />
        <ActionTile
          href={`${base}/inventory/warehouses`}
          label="Danh mục kho"
          icon={<Warehouse size={24} aria-hidden />}
        />
      </section>
    </div>
  );
}
