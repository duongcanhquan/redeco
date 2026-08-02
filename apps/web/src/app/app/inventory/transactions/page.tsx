import { ClipboardList } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import {
  ensureInventoryDefaults,
  listInventoryItems,
  listInventoryTransactions,
  listWarehouseLocations,
  listWarehouses,
} from '@/services/inventory.service';
import { TxnDialog } from './txn-dialog';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  receipt: 'Nhập kho',
  issue: 'Xuất kho',
  transfer: 'Chuyển kho',
  adjustment: 'Điều chỉnh',
};

export default async function TransactionsPage() {
  const supabase = await createServerSupabase();
  await ensureInventoryDefaults();
  const [txns, warehouses, inventoryItems, locations] = await Promise.all([
    listInventoryTransactions(supabase),
    listWarehouses(supabase),
    listInventoryItems(supabase),
    listWarehouseLocations(supabase),
  ]);
  const items = inventoryItems.map((i) => ({
    id: i.id,
    sku: i.sku,
    name: i.name,
    trackLot: i.track_lot,
  }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="text-accent" size={24} aria-hidden />
            Phiếu kho
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Nhập có thể gắn Bin/Lô; xuất tự chia FIFO/FEFO nếu để trống vị trí.
          </p>
        </div>
        <TxnDialog
          warehouses={warehouses.map((w) => ({
            id: w.id,
            code: w.code,
            name: w.name,
          }))}
          items={items}
          locations={locations.map((l) => ({
            id: l.id,
            warehouseId: l.warehouse_id,
            code: l.code,
            name: l.name,
          }))}
        />
      </header>

      <ResponsiveDocList
        empty={txns.length === 0}
        emptyState={
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto text-ink-muted/50" size={32} aria-hidden />
            <p className="mt-4 text-ink-muted">Chưa có phiếu kho.</p>
          </div>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel/40 text-left text-ink-muted">
                <th className="px-5 py-3.5 font-medium">Mã</th>
                <th className="px-5 py-3.5 font-medium">Loại</th>
                <th className="px-5 py-3.5 font-medium">Kho</th>
                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Dòng</th>
                <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                <th className="px-5 py-3.5 font-medium hidden xl:table-cell">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => {
                const lines = t.inventory_transaction_lines ?? [];
                return (
                  <tr
                    key={t.id}
                    className="border-b border-panel/20 last:border-0 hover:bg-glass-strong/40 align-top"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-accent">{t.code}</td>
                    <td className="px-5 py-3.5">{TYPE_LABEL[t.txn_type] ?? t.txn_type}</td>
                    <td className="px-5 py-3.5 font-mono text-xs">
                      {t.warehouses?.code ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted hidden lg:table-cell">
                      {lines.slice(0, 2).map((l) => {
                        const loc = l.warehouse_locations?.code;
                        const lot = l.inventory_lots?.lot_code;
                        const detail = [loc && `Bin ${loc}`, lot && `Lô ${lot}`]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <p key={l.id} className="text-xs">
                            {l.inventory_items?.sku} × {Number(l.qty)}
                            {detail ? ` · ${detail}` : ''}
                          </p>
                        );
                      })}
                      {lines.length > 2 && (
                        <p className="text-xs text-ink-muted/70">+{lines.length - 2}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2 py-0.5 text-xs border ${
                          t.status === 'posted'
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-glass-strong border-panel/50 text-ink-muted'
                        }`}
                      >
                        {t.status === 'posted' ? 'Đã ghi sổ' : t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted hidden xl:table-cell">
                      {formatDate(t.posted_at ?? t.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
        cards={
          <>
            {txns.map((t) => (
              <DocCard
                key={t.id}
                code={t.code}
                title={TYPE_LABEL[t.txn_type] ?? t.txn_type}
                badge={
                  <span className="text-xs text-ink-muted">{t.warehouses?.code}</span>
                }
                meta={<p>{formatDate(t.posted_at ?? t.created_at)}</p>}
                amount={t.status === 'posted' ? 'Đã ghi sổ' : t.status}
              />
            ))}
          </>
        }
      />
    </div>
  );
}
