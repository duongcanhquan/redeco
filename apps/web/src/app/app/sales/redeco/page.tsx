import type { ReactNode } from 'react';
import { FileSpreadsheet, Search } from 'lucide-react';
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
import { HUB_STATUS_LABELS } from '@/lib/customiz/redeco-hub-status';
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
  { key: 'import', label: 'Nhập đề xuất' },
  { key: 'calc', label: 'Tính báo giá' },
  { key: 'done', label: 'Báo giá đã xong' },
  { key: 'settings', label: 'Cài đặt' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function resolveTab(raw: string | undefined): TabKey {
  if (raw === 'filters') return 'settings';
  if (TABS.some((t) => t.key === raw)) return raw as TabKey;
  return 'proposals';
}

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

function monthToRange(month: string): { from: string; to: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, '0')}`,
  };
}

function BentoSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="glass rounded-2xl border border-panel/40 overflow-hidden">
      <div className="border-b border-panel/30 bg-panel/25 px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold text-ink sm:text-lg">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-muted leading-relaxed">{description}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
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
    q?: string;
    from?: string;
    to?: string;
    month?: string;
  }>;
}) {
  const sp = await searchParams;
  const tab = resolveTab(sp.tab);
  const tag = sp.tag;
  const onlyDuplicates = tag === 'trung';
  const classification =
    tag && (CLASSIFICATION_TAGS as readonly string[]).includes(tag) ? tag : undefined;
  const hubStatus =
    sp.status &&
    ['pending', 'review', 'rejected', 'to_production', 'quoted'].includes(sp.status)
      ? (sp.status as HubStatus)
      : undefined;

  const monthRange = sp.month ? monthToRange(sp.month) : null;
  const from = sp.from || monthRange?.from;
  const to = sp.to || monthRange?.to;
  const q = sp.q?.trim() || undefined;

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

  const needRequests = tab === 'proposals' || tab === 'calc';
  const needFilters = tab === 'settings';
  const needCalcs = tab === 'done';
  const needProfiles = tab === 'calc' || tab === 'settings';

  const [rows, profile, calcProfiles, calculations] = await Promise.all([
    needRequests
      ? listRedecoRfqRequests(
          tab === 'proposals'
            ? { onlyDuplicates, classification, q, from, to }
            : undefined,
        )
      : Promise.resolve([]),
    needFilters ? getOrCreateFilterProfile() : Promise.resolve(null),
    needProfiles
      ? listCalcProfiles().then(async (list) => {
          if (list.length === 0) {
            await getOrCreateDefaultProfile();
            return listCalcProfiles();
          }
          return list;
        })
      : Promise.resolve([]),
    needCalcs ? listCalculations({ hubStatus }) : Promise.resolve([]),
  ]);

  const hubBase = `${base}/sales/redeco`;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex items-start gap-3 min-w-0">
        <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent shrink-0">
          <FileSpreadsheet size={22} aria-hidden />
        </span>
        <h1 className="text-xl font-bold text-ink sm:text-2xl pt-1.5">
          Kinh doanh.REDECO
        </h1>
      </header>

      {/* Tab bar liền khối — tách biệt nội dung bên dưới */}
      <nav
        aria-label="Tab Kinh doanh.REDECO"
        className="rounded-2xl border border-accent/25 bg-secondary/80 p-1 shadow-sm overflow-x-auto"
      >
        <div className="flex min-w-max gap-0.5" role="tablist">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Link
                key={t.key}
                role="tab"
                aria-selected={active}
                href={`${hubBase}?tab=${t.key}`}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-3.5 text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? 'bg-accent text-app shadow-sm'
                    : 'text-ink-muted hover:bg-glass hover:text-ink'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {tab === 'proposals' && (
        <div className="grid gap-4">
          <BentoSection
            title="Lọc & tìm kiếm"
            description="Lọc danh sách đề xuất đã lưu theo tag, thời gian hoặc từ khóa."
          >
            <form
              method="get"
              action={hubBase}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
            >
              <input type="hidden" name="tab" value="proposals" />
              <div className="space-y-1.5 lg:col-span-2">
                <label htmlFor="rfq-q" className="text-sm font-medium text-ink">
                  Tìm kiếm
                </label>
                <input
                  id="rfq-q"
                  name="q"
                  defaultValue={q ?? ''}
                  placeholder="Số BG, khách, sản phẩm…"
                  className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rfq-tag" className="text-sm font-medium text-ink">
                  Tag
                </label>
                <select
                  id="rfq-tag"
                  name="tag"
                  defaultValue={tag ?? ''}
                  className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
                >
                  <option value="">Tất cả</option>
                  <option value="trung">Trùng</option>
                  {CLASSIFICATION_TAGS.map((t) => (
                    <option key={t} value={t}>
                      {CLASSIFICATION_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rfq-month" className="text-sm font-medium text-ink">
                  Tháng
                </label>
                <input
                  id="rfq-month"
                  name="month"
                  type="month"
                  defaultValue={sp.month ?? ''}
                  className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rfq-from" className="text-sm font-medium text-ink">
                  Từ ngày
                </label>
                <input
                  id="rfq-from"
                  name="from"
                  type="date"
                  defaultValue={sp.from ?? ''}
                  className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="rfq-to" className="text-sm font-medium text-ink">
                  Đến ngày
                </label>
                <input
                  id="rfq-to"
                  name="to"
                  type="date"
                  defaultValue={sp.to ?? ''}
                  className="min-h-11 w-full rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
                />
              </div>
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-6">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app"
                >
                  <Search size={18} aria-hidden />
                  Tìm kiếm
                </button>
                <Link
                  href={`${hubBase}?tab=proposals`}
                  className="inline-flex min-h-11 items-center rounded-xl border border-panel/40 px-4 text-sm font-medium text-ink-muted hover:text-ink"
                >
                  Xóa lọc
                </Link>
                <Link
                  href={`${hubBase}?tab=import`}
                  className="inline-flex min-h-11 items-center rounded-xl border border-accent/35 bg-accent-soft px-4 text-sm font-semibold text-accent ms-auto"
                >
                  Nhập đề xuất mới
                </Link>
              </div>
            </form>
          </BentoSection>

          <BentoSection
            title={`Danh sách đề xuất (${rows.length})`}
            description="Dữ liệu đã lưu trong hệ thống. Chọn «Tính» để sang bước tính báo giá."
          >
            <ResponsiveDocList
              empty={rows.length === 0}
              emptyState={
                <div className="px-2 py-8 text-center space-y-2">
                  <p className="font-semibold text-ink">Không có đề xuất phù hợp</p>
                  <p className="text-sm text-ink-muted">
                    Thử đổi bộ lọc hoặc nhập đề xuất mới.
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
                      <th className="px-4 py-3 font-semibold">Ngày tạo</th>
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
                        <td className="px-4 py-3 text-ink-muted whitespace-nowrap">
                          {formatDate(r.created_at)}
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
          </BentoSection>
        </div>
      )}

      {tab === 'import' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BentoSection
            title="Tải file Excel"
            description="Tiêu đề dòng 5, dữ liệu từ dòng 6 (cột A–R)."
          >
            <RedecoRfqUploadForm basePath={base} />
          </BentoSection>
          <BentoSection
            title="Nhập thủ công"
            description="Điền đủ trường tương ứng cột Excel."
          >
            <ManualRfqForm basePath={base} />
          </BentoSection>
        </div>
      )}

      {tab === 'calc' && (
        <BentoSection title="Tính báo giá" description="Chọn đề xuất và profile tính.">
          <CalcPanel
            basePath={base}
            requests={rows}
            profiles={calcProfiles}
            selectedRequestId={sp.requestId}
          />
        </BentoSection>
      )}

      {tab === 'done' && (
        <div className="grid gap-4">
          <BentoSection title="Lọc trạng thái">
            <form method="get" action={hubBase} className="flex flex-wrap gap-3 items-end">
              <input type="hidden" name="tab" value="done" />
              <div className="space-y-1.5">
                <label htmlFor="done-status" className="text-sm font-medium text-ink">
                  Tình trạng
                </label>
                <select
                  id="done-status"
                  name="status"
                  defaultValue={hubStatus ?? ''}
                  className="min-h-11 rounded-xl border border-panel/40 bg-app px-3 text-base text-ink"
                >
                  <option value="">Tất cả</option>
                  {(
                    [
                      'pending',
                      'review',
                      'rejected',
                      'to_production',
                      'quoted',
                    ] as const
                  ).map((s) => (
                    <option key={s} value={s}>
                      {HUB_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app"
              >
                <Search size={18} aria-hidden />
                Lọc
              </button>
            </form>
          </BentoSection>
          <BentoSection title="Kết quả đã tính">
            <DonePanel basePath={base} rows={calculations} />
          </BentoSection>
        </div>
      )}

      {tab === 'settings' && profile && (
        <div className="grid gap-4">
          <BentoSection
            title="1. Cài đặt bộ lọc báo giá"
            description="Quy tắc nếu–thì gắn tag tiềm năng / cần cân nhắc / không tiềm năng khi import."
          >
            <FilterRulesPanel basePath={base} initialRules={profile.rules} />
          </BentoSection>
          <BentoSection
            title="2. Cài đặt tính toán báo giá"
            description="Profile công thức tính cost/giá (stub — công thức REDECO đầy đủ ở phase sau)."
          >
            <SettingsPanel basePath={base} profiles={calcProfiles} />
          </BentoSection>
        </div>
      )}
    </div>
  );
}
