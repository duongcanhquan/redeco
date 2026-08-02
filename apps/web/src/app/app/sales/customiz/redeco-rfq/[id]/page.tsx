import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionClaims } from '@/lib/supabase/server';
import {
  getRedecoRfqRequest,
  listDuplicatesForQuoteNo,
} from '@/services/customiz/redeco-rfq.service';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_TAGS,
  type ClassificationTag,
} from '@/lib/customiz/redeco-rfq-filter';
import { RedecoRfqDeleteButton } from '../delete-button';

export const dynamic = 'force-dynamic';

const FIELD_LABELS: { key: string; label: string }[] = [
  { key: 'status_customer', label: 'Trạng thái (KH)' },
  { key: 'buyer_contact', label: 'Người phụ trách mua hàng' },
  { key: 'end_customer', label: 'Khách hàng' },
  { key: 'customer_site_abbr', label: 'Cơ sở khách hàng' },
  { key: 'customer_item_code', label: 'Mã hàng khách hàng' },
  { key: 'system_item_code', label: 'Mã hàng' },
  { key: 'request_quote_ref', label: 'Báo giá yêu cầu số' },
  { key: 'product_name', label: 'Tên sản phẩm' },
  { key: 'model_or_end_code', label: 'Kiểu mẫu' },
  { key: 'spec', label: 'Quy cách' },
  { key: 'manufacturer', label: 'Nhà sản xuất' },
  { key: 'uom', label: 'Đơn vị' },
  { key: 'qty_expected', label: 'SL đặt hàng dự kiến' },
  { key: 'po_qty_last_year', label: 'Số PO năm trước' },
  { key: 'request_date', label: 'Ngày lên yêu cầu BG' },
  { key: 'quotation_closing_date', label: 'Quotation Closing Date' },
  { key: 'closing_time', label: 'Thời gian kết thúc' },
];

export default async function RedecoRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const claims = await getSessionClaims();
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';

  const row = await getRedecoRfqRequest(id);
  if (!row || row.deleted_at) notFound();

  const dups = row.tags.includes('trung')
    ? await listDuplicatesForQuoteNo(row.external_quote_no, row.id)
    : [];

  return (
    <div className="space-y-4 sm:space-y-5 max-w-4xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`${base}/sales/customiz/redeco-rfq`}
            className="text-sm text-accent hover:underline"
          >
            ← Yêu cầu BG · REDECO
          </Link>
          <h1 className="mt-2 text-xl font-bold text-ink sm:text-2xl">
            {row.external_quote_no}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {row.tags.includes('trung') && (
              <span className="rounded-lg border border-warning/40 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                Trùng số báo giá
              </span>
            )}
            {CLASSIFICATION_TAGS.filter((t) => row.tags.includes(t)).map((t) => (
              <span
                key={t}
                className="rounded-lg border border-accent/35 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
              >
                {CLASSIFICATION_LABELS[t as ClassificationTag]}
              </span>
            ))}
            {row.source_row != null && (
              <span className="rounded-lg border border-panel/40 px-2.5 py-1 text-xs text-ink-muted">
                Dòng Excel {row.source_row}
              </span>
            )}
          </div>
        </div>
        <RedecoRfqDeleteButton id={row.id} basePath={base} redirectToList />
      </div>

      {dups.length > 0 && (
        <div className="rounded-2xl border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-ink">
          <p className="font-semibold text-warning mb-2">Các bản ghi cùng số BG</p>
          <ul className="space-y-1">
            {dups.map((d) => (
              <li key={d.id}>
                <Link
                  href={`${base}/sales/customiz/redeco-rfq/${d.id}`}
                  className="text-accent hover:underline"
                >
                  {d.external_quote_no}
                </Link>
                <span className="text-ink-muted">
                  {' '}
                  — {d.attributes.product_name || '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="glass rounded-2xl border border-panel/40 divide-y divide-panel/30">
        <div className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-1 sm:gap-4 px-4 py-3">
          <dt className="text-sm text-ink-muted">Số báo giá</dt>
          <dd className="text-base font-semibold text-ink">{row.external_quote_no}</dd>
        </div>
        {FIELD_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-1 sm:gap-4 px-4 py-3"
          >
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-base text-ink whitespace-pre-wrap break-words">
              {row.attributes[key] || '—'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
