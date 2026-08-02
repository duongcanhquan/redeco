import { FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { createServerSupabase, getSessionClaims } from '@/lib/supabase/server';
import { hasRedecoHubAccess } from '@/lib/workspace-nav';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_TAGS,
  type ClassificationTag,
} from '@/lib/customiz/redeco-rfq-filter';
import { REDECO_PACK_KEY } from '@/lib/customiz/redeco-rfq-parse';
import { formatDate } from '@/lib/format';
import { getMyModuleKeys } from '@/services/module-access.service';
import {
  getOrCreateFilterProfile,
  listRedecoRfqRequests,
} from '@/services/customiz/redeco-rfq.service';
import {
  getOrCreateDefaultProfile,
  listCalcProfiles,
  listCalculations,
  type HubStatus,
} from '@/services/customiz/redeco-quote.service';
import { DocCard, ResponsiveDocList } from '@/components/sales/responsive-doc-list';
import { RedecoRfqUploadForm } from '../customiz/redeco-rfq/upload-form';
import { RedecoRfqDeleteButton } from '../customiz/redeco-rfq/delete-button';
import { FilterRulesPanel } from '../customiz/redeco-rfq/filter-rules-panel';
import { ManualRfqForm } from './manual-rfq-form';
import { CalcPanel } from './calc-panel';
import { DonePanel } from './done-panel';
import { SettingsPanel } from './settings-panel';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'proposals', label: 'Đề xuất báo giá' },
  { key: 'calc', label: 'Tính báo giá' },
  { key: 'done', label: 'Báo giá đã xong' },
  { key: 'settings', label: 'Cài đặt tính' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

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

export default async function KinhDoanhRedecoHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    tag?: string;
    requestId?: string;
    status?: string;
  }>;
}) {
  const sp = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === sp.tab)
    ? (sp.tab as TabKey)
    : 'proposals';
  const tag = sp.tag;
  const onlyDuplicates = tag === 'trung';
  const classification =
    tag && (CLASSIFICATION_TAGS as readonly string[]).includes(tag) ? tag : undefined;
  const hubStatus =
    sp.status &&
    ['pending', 'review', 'rejected', 'to_production', 'quoted'].includes(sp.status)
      ? (sp.status as HubStatus)
      : undefined;

  const claims = await getSessionClaims();
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';
  await createServerSupabase();
  const moduleKeys = await getMyModuleKeys();

  if (!hasRedecoHubAccess(moduleKeys)) {
    return (
      <div className="glass rounded-2xl border border-warning/40 px-5 py-6 text-base text-ink">
        <p className="font-semibold text-warning">Chưa được cấp Kinh doanh.REDECO</p>
        <p className="mt-2 text-ink-muted">
          Cần entitlement «{REDECO_PACK_KEY}» trên hợp đồng (superadmin).
        </p>
      </div>
    );
  }

  const [rows, profile, calcProfiles, calculations] = await Promise.all([
    listRedecoRfqRequests(
      tab === 'proposals'
        ? { onlyDuplicates, classification }
        : undefined,
    ),
    getOrCreateFilterProfile(),
    listCalcProfiles().then(async (list) => {
      if (list.length === 0) {
        await getOrCreateDefaultProfile();
        return listCalcProfiles();
      }
      return list;
    }),
    tab === 'done' ? listCalculations({ hubStatus }) : Promise.resolve([]),
  ]);

  const hubBase = `${base}/sales/redeco`;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent shrink-0">
            <FileSpreadsheet size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">Kinh doanh.REDECO</h1>
            <p className="text-sm text-ink-muted mt-0.5">
              Đề xuất → tính cost/giá → báo giá Optimake (chỉnh trong hub)
            </p>
          </div>
        </div>
      </header>

      <nav
        aria-label="Tab Kinh doanh.REDECO"
        className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`${hubBase}?tab=${t.key}`}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium border ${
              tab === t.key
                ? 'border-accent/40 bg-accent-soft text-accent'
                : 'border-panel/40 text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'proposals' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Tất cả', href: `${hubBase}?tab=proposals` },
              {
                key: 'trung',
                label: 'Trùng',
                href: `${hubBase}?tab=proposals&tag=trung`,
              },
              ...CLASSIFICATION_TAGS.map((t) => ({
                key: t,
                label: CLASSIFICATION_LABELS[t],
                href: `${hubBase}?tab=proposals&tag=${t}`,
              })),
            ].map((c) => (
              <Link
                key={c.key}
                href={c.href}
                className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium border ${
                  (c.key === 'all' && !tag) || tag === c.key
                    ? 'border-accent/40 bg-accent-soft text-accent'
                    : 'border-panel/40 text-ink-muted hover:text-ink'
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>

          <RedecoRfqUploadForm basePath={base} />
          <ManualRfqForm basePath={base} />
          <FilterRulesPanel basePath={base} initialRules={profile.rules} />

          <ResponsiveDocList
            empty={rows.length === 0}
            emptyState={
              <div className="px-5 py-10 text-center space-y-2">
                <p className="font-semibold text-ink">Chưa có đề xuất</p>
                <p className="text-sm text-ink-muted">
                  Tải Excel hoặc thêm tay.
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
                      <td className="px-4 py-3 font-semibold text-ink">
                        {r.external_quote_no}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {r.attributes.end_customer || '—'}
                      </td>
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
                        <div className="inline-flex flex-wrap gap-2 justify-end">
                          <Link
                            href={`${hubBase}?tab=calc&requestId=${r.id}`}
                            className="inline-flex min-h-11 items-center rounded-xl border border-accent/40 px-3 text-sm font-medium text-accent"
                          >
                            Tính
                          </Link>
                          <RedecoRfqDeleteButton id={r.id} basePath={base} />
                        </div>
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
                        <p>Tạo {formatDate(r.created_at)}</p>
                      </>
                    }
                    actions={
                      <>
                        <Link
                          href={`${hubBase}?tab=calc&requestId=${r.id}`}
                          className="inline-flex min-h-11 items-center rounded-xl border border-accent/40 px-3 text-sm font-medium text-accent"
                        >
                          Tính
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
      )}

      {tab === 'calc' && (
        <CalcPanel
          basePath={base}
          requests={rows}
          profiles={calcProfiles}
          selectedRequestId={sp.requestId}
        />
      )}

      {tab === 'done' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${hubBase}?tab=done`}
              className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm border ${
                !hubStatus
                  ? 'border-accent/40 bg-accent-soft text-accent'
                  : 'border-panel/40 text-ink-muted'
              }`}
            >
              Tất cả
            </Link>
            {(
              ['pending', 'review', 'rejected', 'to_production', 'quoted'] as const
            ).map((s) => (
              <Link
                key={s}
                href={`${hubBase}?tab=done&status=${s}`}
                className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm border ${
                  hubStatus === s
                    ? 'border-accent/40 bg-accent-soft text-accent'
                    : 'border-panel/40 text-ink-muted'
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
          <DonePanel basePath={base} rows={calculations} />
        </div>
      )}

      {tab === 'settings' && (
        <SettingsPanel basePath={base} profiles={calcProfiles} />
      )}
    </div>
  );
}
