import { FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { hasModuleKey } from '@/lib/workspace-nav';
import { REDECO_RFQ_PACK_KEY } from '@/lib/customiz/redeco-rfq-parse';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_TAGS,
  type ClassificationTag,
} from '@/lib/customiz/redeco-rfq-filter';
import { formatDate } from '@/lib/format';
import { getMyModuleKeys } from '@/services/module-access.service';
import {
  getOrCreateFilterProfile,
  listRedecoRfqRequests,
} from '@/services/customiz/redeco-rfq.service';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { RedecoRfqUploadForm } from './upload-form';
import { RedecoRfqDeleteButton } from './delete-button';
import { FilterRulesPanel } from './filter-rules-panel';

export const dynamic = 'force-dynamic';

function classificationOf(tags: string[]): ClassificationTag | null {
  for (const t of CLASSIFICATION_TAGS) {
    if (tags.includes(t)) return t;
  }
  return null;
}

function TagBadges({ tags }: { tags: string[] }) {
  const cls = classificationOf(tags);
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {tags.includes('trung') && (
        <span className="rounded-lg border border-warning/40 bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
          Trùng
        </span>
      )}
      {cls && (
        <span className="rounded-lg border border-accent/35 bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
          {CLASSIFICATION_LABELS[cls]}
        </span>
      )}
    </span>
  );
}

export default async function RedecoRfqListPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const onlyDuplicates = tag === 'trung';
  const classification =
    tag && (CLASSIFICATION_TAGS as readonly string[]).includes(tag) ? tag : undefined;

  const claims = await getSessionClaims();
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  await createServerSupabase();
  const moduleKeys = await getMyModuleKeys();

  if (
    !hasModuleKey(moduleKeys, REDECO_RFQ_PACK_KEY) &&
    !hasModuleKey(moduleKeys, 'customiz')
  ) {
    return (
      <div className="glass rounded-2xl border border-warning/40 px-5 py-6 text-base text-ink">
        <p className="font-semibold text-warning">Chưa được cấp gói Customiz</p>
        <p className="mt-2 text-ink-muted">
          Cần entitlement «{REDECO_RFQ_PACK_KEY}» trên hợp đồng (superadmin).
        </p>
      </div>
    );
  }

  const [rows, profile] = await Promise.all([
    listRedecoRfqRequests({
      onlyDuplicates,
      classification,
    }),
    getOrCreateFilterProfile(),
  ]);

  const filterChips: { key: string; label: string; href: string; active: boolean }[] = [
    {
      key: 'all',
      label: 'Tất cả',
      href: `${base}/sales/customiz/redeco-rfq`,
      active: !tag,
    },
    {
      key: 'trung',
      label: 'Trùng',
      href: `${base}/sales/customiz/redeco-rfq?tag=trung`,
      active: tag === 'trung',
    },
    ...CLASSIFICATION_TAGS.map((t) => ({
      key: t,
      label: CLASSIFICATION_LABELS[t],
      href: `${base}/sales/customiz/redeco-rfq?tag=${t}`,
      active: tag === t,
    })),
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent shrink-0">
            <FileSpreadsheet size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">Yêu cầu BG · REDECO</h1>
            <p className="text-sm text-ink-muted mt-0.5">
              Customiz — import Excel, trùng số BG, bộ lọc phân loại
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterChips.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium border ${
                c.active
                  ? 'border-accent/40 bg-accent-soft text-accent'
                  : 'border-panel/40 text-ink-muted hover:text-ink'
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </header>

      <RedecoRfqUploadForm basePath={base} />

      <FilterRulesPanel basePath={base} initialRules={profile.rules} />

      <ResponsiveDocList
        empty={rows.length === 0}
        emptyState={
          <div className="px-5 py-10 text-center space-y-2">
            <p className="font-semibold text-ink">Chưa có yêu cầu</p>
            <p className="text-sm text-ink-muted">
              Tải file Excel (tiêu đề dòng 5, data từ dòng 6).
            </p>
          </div>
        }
        table={
          <table className="w-full text-sm text-left min-w-[48rem]">
            <thead className="text-ink-muted border-b border-panel/40">
              <tr>
                <th className="px-4 py-3 font-semibold">Số BG</th>
                <th className="px-4 py-3 font-semibold">Khách hàng</th>
                <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                <th className="px-4 py-3 font-semibold">SL</th>
                <th className="px-4 py-3 font-semibold">Tag</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-panel/20 hover:bg-glass">
                  <td className="px-4 py-3">
                    <Link
                      href={`${base}/sales/customiz/redeco-rfq/${r.id}`}
                      className="font-semibold text-accent hover:underline"
                    >
                      {r.external_quote_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{r.attributes.end_customer || '—'}</td>
                  <td className="px-4 py-3 text-ink max-w-[14rem] truncate">
                    {r.attributes.product_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {r.attributes.qty_expected || '—'} {r.attributes.uom || ''}
                  </td>
                  <td className="px-4 py-3">
                    <TagBadges tags={r.tags} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RedecoRfqDeleteButton id={r.id} basePath={base} />
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
                code={r.external_quote_no}
                title={r.attributes.product_name || '—'}
                badge={<TagBadges tags={r.tags} />}
                meta={
                  <>
                    <p>{r.attributes.end_customer || '—'}</p>
                    <p>
                      SL {r.attributes.qty_expected || '—'} {r.attributes.uom || ''}
                    </p>
                    <p>Import {formatDate(r.created_at)}</p>
                  </>
                }
                actions={
                  <>
                    <Link
                      href={`${base}/sales/customiz/redeco-rfq/${r.id}`}
                      className="inline-flex min-h-11 items-center rounded-xl border border-panel/40 px-3 text-sm font-medium"
                    >
                      Chi tiết
                    </Link>
                    <RedecoRfqDeleteButton id={r.id} basePath={base} />
                  </>
                }
              />
            ))}
          </>
        }
      />
    </div>
  );
}
