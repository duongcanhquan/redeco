import { Layers } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/ui/status-pill';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { listInventoryItems } from '@/services/inventory.service';
import { listBoms } from '@/services/production.service';
import { getMyRootModules } from '@/services/sales.service';
import { ActivateBomButton } from './activate-bom-button';
import { CreateBomForm } from './create-bom-form';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp',
  active: 'Đang dùng',
  obsolete: 'Ngừng',
};

export default async function BomsPage() {
  const [supabase, claims] = await Promise.all([
    createServerSupabase(),
    getSessionClaims(),
  ]);
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  const modules = await getMyRootModules(supabase);
  if (!modules.some((m) => m.key === 'san-xuat')) {
    return (
      <p className="text-sm text-ink-muted glass rounded-2xl p-6">Chưa mở Sản xuất.</p>
    );
  }

  const [boms, items] = await Promise.all([
    listBoms(supabase),
    listInventoryItems(supabase),
  ]);
  const fgItems = items.filter((i) => i.item_type === 'fg' || i.product_id);
  const rmItems = items.filter((i) => i.item_type === 'raw' || i.item_type === 'consumable');

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Layers size={24} />}
        title="Định mức nguyên liệu"
        helpTitle="Định mức"
        help={<p>Mỗi thành phẩm chỉ có một định mức đang dùng.</p>}
      />

      <CreateBomForm
        fgItems={fgItems.map((i) => ({ id: i.id, label: `${i.sku} — ${i.name}` }))}
        rmItems={(rmItems.length > 0 ? rmItems : items).map((i) => ({
          id: i.id,
          label: `${i.sku} — ${i.name}`,
        }))}
      />

      <section className="glass rounded-2xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-muted border-b border-panel/40 bg-app/30">
              <tr>
                <th className="px-4 py-3 font-medium">Mã</th>
                <th className="px-4 py-3 font-medium">Thành phẩm</th>
                <th className="px-4 py-3 font-medium">Số NVL</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {boms.map((b) => (
                <tr key={b.id} className="border-b border-panel/20">
                  <td className="px-4 py-3 font-mono font-medium">{b.code}</td>
                  <td className="px-4 py-3">
                    {b.inventory_items?.sku ?? '—'}
                    <span className="block text-xs text-ink-muted">
                      {b.inventory_items?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{b.bom_lines?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={b.status} label={STATUS_LABEL[b.status] ?? b.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === 'draft' && <ActivateBomButton bomId={b.id} />}
                  </td>
                </tr>
              ))}
              {boms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                    Chưa có định mức.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <ul className="md:hidden divide-y divide-panel/30">
          {boms.map((b) => (
            <li key={b.id} className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <p className="font-mono font-semibold">{b.code}</p>
                <StatusPill status={b.status} label={STATUS_LABEL[b.status] ?? b.status} />
              </div>
              <p className="text-sm text-ink-muted">
                {b.inventory_items?.name} · {b.bom_lines?.length ?? 0} nguyên liệu
              </p>
              {b.status === 'draft' && <ActivateBomButton bomId={b.id} />}
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs">
        <a href={`${base}/production`} className="text-accent hover:underline">
          ← Sản xuất
        </a>
      </p>
    </div>
  );
}
